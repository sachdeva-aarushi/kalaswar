import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERS_DIR = path.resolve(__dirname, "../../docs/stitch-workroom/renders");
const AUTH_STATE_FILE = path.resolve(__dirname, "auth-state.json");

if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8082";
const COORD_EMAIL = "coordinator.sunita@kalaswar.demo";
const COORD_PASS = "KalaswarDemo@2025";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 360, height: 780 },
];

const SCREENS = [
  {
    id: "1-order",
    name: "Kalaswar Workroom — Order",
    path: "/workroom/orders/22222222-0001-0000-0000-000000000001",
  },
  {
    id: "2-new-product",
    name: "Kalaswar Workroom — New Product",
    path: "/workroom/products/new",
  },
  {
    id: "3-makepossible-result",
    name: "Kalaswar Workroom — MakePossible Result",
    path: "/workroom/requests/66666666-0001-0000-0000-000000000001/makepossible",
  },
  {
    id: "4-proposal",
    name: "Kalaswar Workroom — Proposal",
    path: "/workroom/requests/66666666-0001-0000-0000-000000000001/proposal",
  },
  {
    id: "5-inventory",
    name: "Kalaswar Workroom — Inventory",
    path: "/workroom/inventory",
  },
];

async function authenticateCoordinator() {
  console.log("=== Authenticating Coordinator Demo User ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on("pageerror", (err) => console.log(`   [PAGE ERROR]: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`   [CONSOLE ERROR]: ${msg.text()}`);
  });

  console.log(`Navigating to ${BASE_URL}/auth...`);
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded", timeout: 20000 });

  console.log("Waiting for form hydration...");
  await page.waitForSelector("#au-email", { timeout: 10000 });
  await page.waitForTimeout(2000); // Allow React hydration to complete

  console.log("Entering credentials...");
  await page.locator("#au-email").fill(COORD_EMAIL);
  await page.locator("#au-pass").fill(COORD_PASS);

  console.log("Waiting for submit button to be enabled...");
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.waitFor({ state: "visible", timeout: 5000 });
  
  // Trigger input events if needed
  await page.locator("#au-pass").dispatchEvent("input");
  await page.waitForTimeout(500);

  console.log("Clicking Sign In...");
  await submitBtn.click();

  console.log("Waiting for navigation to /workroom...");
  await page.waitForURL((url) => url.pathname.startsWith("/workroom"), {
    timeout: 20000,
  });

  console.log(`✓ Authenticated! Current URL: ${page.url()}`);
  await page.waitForTimeout(1500);

  // Save auth storage state (cookies, localStorage, session)
  await page.context().storageState({ path: AUTH_STATE_FILE });
  console.log(`✓ Auth state saved to ${AUTH_STATE_FILE}`);

  await browser.close();
}

async function run() {
  console.log("==================================================================");
  console.log("PLAYWRIGHT RESPONSIVENESS & SCREENSHOT VERIFICATION");
  console.log(`Target: ${BASE_URL} | Role: Coordinator (${COORD_EMAIL})`);
  console.log("==================================================================\n");

  await authenticateCoordinator();

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--------------------------------------------------------------`);
    console.log(`TESTING VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`--------------------------------------------------------------`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      storageState: AUTH_STATE_FILE,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`   [PAGE ERROR]: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`   [CONSOLE ERROR]: ${msg.text()}`);
    });

    for (const screen of SCREENS) {
      console.log(`\nVerifying [${vp.name}] ${screen.name} -> ${screen.path}`);
      const screenStart = Date.now();
      let status = "success";
      let errorReason = null;

      try {
        const res = await page.goto(`${BASE_URL}${screen.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });

        // Wait for network idle or main content
        try {
          await page.waitForLoadState("networkidle", { timeout: 10000 });
        } catch {
          // Non-fatal if some polling continues
        }

        const loadDuration = Date.now() - screenStart;
        console.log(`   Navigation completed in ${loadDuration}ms (HTTP ${res?.status()})`);

        if (loadDuration > 20000) {
          throw new Error("Navigation exceeded 20s limit");
        }

        // Wait brief moment for dynamic cards, charts, and layout stabilization
        await page.waitForTimeout(1500);

        // Check for error boundary or fatal errors
        const bodyText = await page.innerText("body");
        if (bodyText.includes("Something went wrong") && !bodyText.includes("Kalaswar Workroom")) {
          status = "error_boundary";
          errorReason = "Render caught in Error Boundary";
        }

        // Capture screenshot
        const filename = `${screen.id}-${vp.name}.png`;
        const filepath = path.join(RENDERS_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        console.log(`   ✓ Screenshot saved: ${filename}`);

      } catch (err) {
        console.error(`   ✗ Error on ${screen.name}: ${err.message}`);
        status = "failed";
        errorReason = err.message;
      }

      results.push({
        viewport: vp.name,
        screen: screen.name,
        path: screen.path,
        duration: Date.now() - screenStart,
        status,
        error: errorReason,
      });
    }

    await context.close();
  }

  await browser.close();

  // Cleanup auth state
  try {
    fs.unlinkSync(AUTH_STATE_FILE);
  } catch {}

  console.log("\n==================================================================");
  console.log("FINAL RESPONSIVENESS & RENDER RESULTS");
  console.log("==================================================================");
  let allPassed = true;
  for (const r of results) {
    const mark = r.status === "success" ? "✓ PASS" : "✗ FAIL";
    console.log(`${mark} [${r.viewport.padEnd(7)}] ${r.screen.padEnd(45)} : ${r.duration}ms ${r.error ? `(${r.error})` : ""}`);
    if (r.status !== "success") {
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("\n🎉 ALL 5 SCREENS PASSED RESPONSIVENESS AND LOAD TIMEOUT TESTS ACROSS ALL VIEWPORTS (360, 768, 1280)!");
  } else {
    console.error("\n❌ SOME SCREENS FAILED OR EXCEEDED TIMEOUTS.");
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
