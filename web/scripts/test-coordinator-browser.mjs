/**
 * test-coordinator-browser.mjs
 *
 * Requirements 3 & 4:
 * 1. Signs in with coordinator demo credentials (coordinator.sunita@kalaswar.demo / KalaswarDemo@2025).
 * 2. Calls GET /api/v1/dashboard/coordinator from inside the browser as the coordinator demo user.
 * 3. Verifies API base URL and CORS configuration and reports the exact response.
 * 4. Navigates through Workroom screens with strict 20-second timeout enforcement.
 * 5. If any screen waits > 20s, cancels request, records "blocked: <reason>" in docs/SCREEN_MAP.md, and continues.
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREEN_MAP_PATH = path.resolve(__dirname, "../../docs/SCREEN_MAP.md");

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8082";
const API_BASE_URL = process.env["VITE_API_BASE_URL"] ?? "http://127.0.0.1:8000";

const COORD_EMAIL = "coordinator.sunita@kalaswar.demo";
const COORD_PASS = "KalaswarDemo@2025";

const SCREENS = [
  { name: "Kalaswar Workroom — Today (Editorial Workspace)", path: "/workroom", rowPattern: "Today (Editorial Workspace)" },
  { name: "Kalaswar Workroom — Orders", path: "/workroom/orders", rowPattern: "Workroom — Orders" },
  { name: "Kalaswar Workroom — Products", path: "/workroom/products", rowPattern: "Workroom — Products" },
  { name: "Kalaswar Workroom — Custom Requests", path: "/workroom/requests", rowPattern: "Workroom — Custom Requests" },
  { name: "Kalaswar Workroom — Team", path: "/workroom/artisans", rowPattern: "Workroom — Team" },
];

async function main() {
  console.log("==================================================================");
  console.log("KALASWAR COORDINATOR BROWSER VERIFICATION & CORS TEST");
  console.log(`Base URL: ${BASE_URL} | API Base URL: ${API_BASE_URL}`);
  console.log("==================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  page.on("pageerror", (err) => console.log(`   [PAGE ERROR]: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`   [CONSOLE ERROR]: ${msg.text()}`);
    }
  });

  // Step 1: Sign in with coordinator demo credentials
  console.log(`1. Navigating to ${BASE_URL}/auth to sign in as ${COORD_EMAIL}...`);
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "load", timeout: 20_000 });
  await page.waitForTimeout(1000);

  await page.fill('input[type="email"]', COORD_EMAIL);
  await page.fill('input[type="password"]', COORD_PASS);
  await page.waitForTimeout(500);

  console.log("   Clicking submit button...");
  await page.click('button[type="submit"]');

  console.log("   Waiting for role-based redirect to /workroom...");
  await page.waitForURL((url) => url.pathname === "/workroom" || url.pathname.startsWith("/workroom"), {
    timeout: 15_000,
  });
  console.log(`   ✓ Successfully redirected to: ${page.url()}`);
  await page.waitForTimeout(2000);

  // Step 2: Verify API Base URL and CORS from browser context
  console.log("\n2. Calling GET /api/v1/dashboard/coordinator directly from the browser...");
  const apiTestResult = await page.evaluate(async (apiBase) => {
    try {
      // Find Supabase token from localStorage
      let token = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("supabase.auth.token") || key.includes("sb-") || key.includes("auth-token"))) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key));
            token = parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token;
            if (token) break;
          } catch {}
        }
      }

      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const endpoint = `${apiBase}/api/v1/dashboard/coordinator`;
      const startTime = performance.now();
      const res = await fetch(endpoint, {
        method: "GET",
        headers,
      });
      const durationMs = Math.round(performance.now() - startTime);

      const status = res.status;
      const ok = res.ok;
      const resHeaders = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      let body = null;
      try {
        body = await res.json();
      } catch (e) {
        body = { parseError: e.message };
      }

      return {
        endpoint,
        status,
        ok,
        durationMs,
        tokenFound: Boolean(token),
        corsHeaders: {
          allowOrigin: resHeaders["access-control-allow-origin"] ?? null,
          allowCredentials: resHeaders["access-control-allow-credentials"] ?? null,
          allowMethods: resHeaders["access-control-allow-methods"] ?? null,
        },
        body,
      };
    } catch (err) {
      return {
        error: err.message,
        name: err.name,
      };
    }
  }, API_BASE_URL);

  console.log("   API Verification Result from Browser:");
  console.log(JSON.stringify(apiTestResult, null, 2));

  // Step 3: Screen-by-Screen Navigation with 20s Max Timeout
  console.log("\n3. Testing Coordinator Workroom Screens (Strict 20s timeout per screen)...");
  const screenResults = [];
  const screenStatusMap = {};

  for (const screen of SCREENS) {
    const screenUrl = `${BASE_URL}${screen.path}`;
    console.log(`\n   --> Testing ${screen.name} at ${screen.path}...`);
    const screenStart = Date.now();

    let blockedReason = null;
    let pageState = "unknown";

    try {
      // Rule 4: Never wait on a request for more than 20 seconds; cancel it, record "blocked: <reason>"
      const navPromise = page.goto(screenUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout exceeded 20 seconds")), 20_000)
      );

      await Promise.race([navPromise, timeoutPromise]);

      // Wait 2.5s for data fetching & render
      await page.waitForTimeout(2500);
      const elapsed = Date.now() - screenStart;

      // Check if spinner is still visible
      const spinnerLocator = page.locator('[role="status"]');
      const isSpinnerVisible = await spinnerLocator.isVisible().catch(() => false);

      // Check if error state is displayed
      const errorLocator = page.locator('[role="alert"]');
      const isErrorVisible = await errorLocator.isVisible().catch(() => false);

      // Check if headline is rendered
      const headlineLocator = page.locator("h1");
      const headlineText = await headlineLocator.first().innerText().catch(() => "");

      if (isSpinnerVisible) {
        console.log(`       ⚠️ Loading spinner still visible after ${elapsed}ms`);
        if (elapsed >= 15_000) {
          blockedReason = "Loading spinner exceeded 15 seconds";
        }
      }

      if (isErrorVisible) {
        const errorText = await errorLocator.first().innerText().catch(() => "");
        console.log(`       ℹ️ Error state rendered: "${errorText.slice(0, 100)}"`);
        pageState = `error: ${errorText.slice(0, 80)}`;
      } else {
        pageState = `rendered headline: "${headlineText}"`;
      }

      const status = blockedReason ? `blocked: ${blockedReason}` : "ready";
      screenResults.push({
        screen: screen.name,
        path: screen.path,
        elapsedMs: elapsed,
        status,
        pageState,
      });
      screenStatusMap[screen.name] = status;

      console.log(`       ✓ Status: ${status} (${elapsed}ms) - ${pageState}`);
    } catch (err) {
      const elapsed = Date.now() - screenStart;
      blockedReason = err.message.includes("20 seconds") ? "timeout (>20s)" : err.message;
      const status = `blocked: ${blockedReason}`;
      screenResults.push({
        screen: screen.name,
        path: screen.path,
        elapsedMs: elapsed,
        status,
        error: err.message,
      });
      screenStatusMap[screen.name] = status;
      console.log(`       ❌ BLOCKED: ${blockedReason} (${elapsed}ms)`);
    }
  }

  // Step 4: Verify 403 Forbidden on /workroom/admin for coordinator user
  console.log("\n4. Verifying 403 No Access on /workroom/admin (coordinator lacks admin role)...");
  try {
    await page.goto(`${BASE_URL}/workroom/admin`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText("body");
    const showsNoAccess =
      bodyText.includes("No Access") ||
      bodyText.includes("Access Restricted") ||
      bodyText.includes("403");

    console.log(`   /workroom/admin 403 Access Guard: ${showsNoAccess ? "✅ PASS (Shows No Access UI)" : "❌ FAIL"}`);
  } catch (err) {
    console.log(`   /workroom/admin check: ${err.message}`);
  }

  // Step 5: Update docs/SCREEN_MAP.md with verified statuses
  console.log("\n5. Updating docs/SCREEN_MAP.md with results...");
  let screenMapContent = readFileSync(SCREEN_MAP_PATH, "utf-8");

  for (const screen of SCREENS) {
    const status = screenStatusMap[screen.name];
    if (status) {
      // Find row matching route exactly: | <name> | <interface> | `<route>` | ... | <status> |
      const escapedPath = screen.path.replace(/\//g, "\\/");
      const routeRegex = new RegExp(`(\\|[^\\|]+\\|[^\\|]+\\|\\s*\`?${escapedPath}\`?\\s*\\|[^\\|]+\\|[^\\|]+\\|[^\\|]+\\|\\s*)(` + '`?[a-zA-Z0-9_: -]+`?' + `)(\\s*\\|)`, "g");
      if (routeRegex.test(screenMapContent)) {
        screenMapContent = screenMapContent.replace(routeRegex, `$1\`${status}\`$3`);
        console.log(`   Updated ${screen.name} (${screen.path}) -> \`${status}\``);
      } else {
        console.log(`   Warning: Route ${screen.path} not matched in SCREEN_MAP.md`);
      }
    }
  }

  writeFileSync(SCREEN_MAP_PATH, screenMapContent, "utf-8");
  console.log("   ✓ docs/SCREEN_MAP.md successfully updated!");

  console.log("\n==================================================================");
  console.log("FINAL SUMMARY & RESULTS");
  console.log("==================================================================");
  console.log(JSON.stringify({ apiTestResult, screenResults }, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error("Test script failed:", err);
  process.exit(1);
});
