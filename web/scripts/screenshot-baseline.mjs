/**
 * Playwright screenshot baseline script.
 *
 * Captures the frozen landing and auth pages at 375, 768 and 1280px
 * and saves them into docs/frozen-baseline/.
 *
 * Run with:
 *   npx playwright test scripts/screenshot-baseline.mjs
 * Or directly:
 *   node --experimental-vm-modules scripts/screenshot-baseline.mjs
 *
 * Prerequisites: npx playwright install chromium
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../../docs/frozen-baseline");

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
];

const PAGES = [
  { route: "/", slug: "landing" },
  { route: "/auth", slug: "auth" },
];

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:8082";

async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const pw = await ctx.newPage();

      const url = `${BASE_URL}${page.route}`;
      console.log(`📸  ${page.slug} @ ${vp.name}px — ${url}`);

      await pw.goto(url, { waitUntil: "load", timeout: 15_000 });

      // Wait for fonts, CSS transitions, and images
      await pw.waitForTimeout(2500);

      const filename = path.join(OUTPUT_DIR, `${page.slug}-${vp.name}.png`);
      await pw.screenshot({ path: filename, fullPage: true });
      console.log(`   ✓  Saved ${filename}`);

      await ctx.close();
    }
  }

  await browser.close();
  console.log("\n✅  All baseline screenshots saved to docs/frozen-baseline/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
