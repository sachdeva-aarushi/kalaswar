/**
 * verify-and-compare.mjs
 *
 * 1. Visual Freeze verification: captures screenshots of Landing (/) and Auth (/auth)
 *    at 375, 768, and 1280px and pixel-compares them against docs/frozen-baseline/.
 * 2. E2E Auth verification: tests login with each demo user from the README,
 *    verifying role-based redirection to:
 *      - admin -> /workroom/admin
 *      - coordinator -> /workroom
 *      - artisan -> /workroom/artisan
 *      - buyer -> /shop
 *      - customer -> /shop
 *    And verifies error handling in the existing error container.
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = path.resolve(__dirname, "../../docs/frozen-baseline");
const CURRENT_DIR = path.resolve(__dirname, "../../docs/frozen-current");
const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:8082";

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
];

const PAGES = [
  { route: "/", slug: "landing" },
  { route: "/auth", slug: "auth" },
];

const DEMO_USERS = [
  { email: "admin@kalaswar.demo", role: "admin", expectedPath: "/workroom/admin" },
  { email: "coordinator.sunita@kalaswar.demo", role: "coordinator", expectedPath: "/workroom" },
  { email: "artisan.anita@kalaswar.demo", role: "artisan", expectedPath: "/workroom/artisan" },
  { email: "customer.priya@kalaswar.demo", role: "customer", expectedPath: "/shop" },
  { email: "buyer.fabindia@kalaswar.demo", role: "buyer", expectedPath: "/shop" },
];

const DEMO_PASSWORD = "KalaswarDemo@2025";

function comparePngImages(baselinePath, currentPath) {
  if (!existsSync(baselinePath)) {
    return { match: false, reason: "Baseline does not exist" };
  }
  const baseBuf = readFileSync(baselinePath);
  const currBuf = readFileSync(currentPath);

  const imgBase = PNG.sync.read(baseBuf);
  const imgCurr = PNG.sync.read(currBuf);

  if (imgBase.width !== imgCurr.width || imgBase.height !== imgCurr.height) {
    return {
      match: false,
      reason: `Dimension mismatch: baseline (${imgBase.width}x${imgBase.height}) vs current (${imgCurr.width}x${imgCurr.height})`,
    };
  }

  let diffPixels = 0;
  const len = imgBase.data.length;
  for (let i = 0; i < len; i += 4) {
    const dr = Math.abs(imgBase.data[i] - imgCurr.data[i]);
    const dg = Math.abs(imgBase.data[i + 1] - imgCurr.data[i + 1]);
    const db = Math.abs(imgBase.data[i + 2] - imgCurr.data[i + 2]);
    const da = Math.abs(imgBase.data[i + 3] - imgCurr.data[i + 3]);
    if (dr > 10 || dg > 10 || db > 10 || da > 10) {
      diffPixels++;
    }
  }

  const totalPixels = imgBase.width * imgBase.height;
  const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(3);

  return {
    match: diffPixels === 0,
    diffPixels,
    totalPixels,
    diffPercent,
  };
}

async function main() {
  if (!existsSync(CURRENT_DIR)) mkdirSync(CURRENT_DIR, { recursive: true });

  console.log("=================================================");
  console.log("1. VISUAL FREEZE SCREENSHOT COMPARISON (375, 768, 1280px)");
  console.log("=================================================");

  const browser = await chromium.launch({ headless: true });
  const comparisonResults = [];

  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const pw = await ctx.newPage();
      pw.on("pageerror", (err) => console.log(`   [PAGE ERROR] ${page.slug} ${vp.name}:`, err.message));
      const url = `${BASE_URL}${page.route}`;

      await pw.goto(url, { waitUntil: "load", timeout: 30_000 });
      await pw.waitForTimeout(3500);

      const baselineFile = path.join(BASELINE_DIR, `${page.slug}-${vp.name}.png`);
      const currentFile = path.join(CURRENT_DIR, `${page.slug}-${vp.name}.png`);

      await pw.screenshot({ path: currentFile, fullPage: true });

      const cmp = comparePngImages(baselineFile, currentFile);
      comparisonResults.push({
        slug: page.slug,
        viewport: `${vp.name}px`,
        baselineFile,
        currentFile,
        ...cmp,
      });

      console.log(
        `📸  ${page.slug} @ ${vp.name}px: ${cmp.match ? "✅ IDENTICAL (0 diff pixels)" : `Diff: ${cmp.diffPixels} px (${cmp.diffPercent}%)`}`
      );

      await ctx.close();
    }
  }

  console.log("\n=================================================");
  console.log("2. DEMO USER LOGIN & ROLE-BASED REDIRECTION TESTS");
  console.log("=================================================");

  const loginResults = [];

  for (const demo of DEMO_USERS) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const pw = await ctx.newPage();

    try {
      await pw.goto(`${BASE_URL}/auth`, { waitUntil: "load", timeout: 20_000 });
      await pw.waitForTimeout(1000);

      // Fill in demo credentials
      await pw.fill('input[type="email"]', demo.email);
      await pw.fill('input[type="password"]', DEMO_PASSWORD);

      // Submit form
      await pw.click('button[type="submit"]');

      // Wait for URL redirection
      await pw.waitForURL((url) => url.pathname === demo.expectedPath, { timeout: 15_000 });

      const finalUrl = pw.url();
      const success = finalUrl.includes(demo.expectedPath);

      loginResults.push({
        email: demo.email,
        role: demo.role,
        expectedPath: demo.expectedPath,
        finalUrl,
        success,
      });

      console.log(`👤 ${demo.role} (${demo.email}) -> Redirected to ${demo.expectedPath}: ${success ? "✅ PASS" : "❌ FAIL"}`);
    } catch (err) {
      loginResults.push({
        email: demo.email,
        role: demo.role,
        expectedPath: demo.expectedPath,
        finalUrl: pw.url(),
        success: false,
        error: err.message,
      });
      console.log(`👤 ${demo.role} (${demo.email}) -> ❌ FAILED: ${err.message}`);
    } finally {
      await ctx.close();
    }
  }

  console.log("\n=================================================");
  console.log("3. INVALID CREDENTIALS ERROR MAPPING TEST");
  console.log("=================================================");

  {
    const ctx = await browser.newContext();
    const pw = await ctx.newPage();
    await pw.goto(`${BASE_URL}/auth`, { waitUntil: "load", timeout: 20_000 });
    await pw.waitForTimeout(1000);

    await pw.fill('input[type="email"]', "nonexistent.user@kalaswar.demo");
    await pw.fill('input[type="password"]', "WrongPassword123!");
    await pw.click('button[type="submit"]');

    // Wait for error feedback in existing container
    try {
      const errorLocator = pw.locator(".text-destructive");
      await errorLocator.waitFor({ state: "visible", timeout: 10_000 });
      const errorText = await errorLocator.innerText();
      console.log(`🚨 Error message rendered into existing container: "${errorText.trim()}" -> ✅ PASS`);
    } catch (err) {
      console.log(`🚨 Error container verification failed: ${err.message}`);
    }
    await ctx.close();
  }

  await browser.close();

  console.log("\n=================================================");
  console.log("VERIFICATION COMPLETE SUMMARY");
  console.log("=================================================");
  console.log(JSON.stringify({ comparisonResults, loginResults }, null, 2));
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
