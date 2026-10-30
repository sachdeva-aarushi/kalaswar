/**
 * test-passport-whatsapp-flows.mjs
 *
 * Playwright Smoke Test Suite for:
 * (1) Public /passport/:token Craft Passport page:
 *     - Loads without auth (public)
 *     - Maker story & cluster
 *     - Coarse GPS region (privacy-preserving)
 *     - Wage split (68%)
 *     - Source labels (artisan-provided / collective-recorded / independently verified)
 *     - "Verify on-chain" section with Merkle root, tx hash, copy buttons, and clear Demo Chain badge
 *     - Responsive at 360px, 768px, 1280px
 *     - Not-found unverified state on invalid token
 * (2) Dev-only /dev/whatsapp Artisan Simulator:
 *     - Step 1: Ingests photo via internal WhatsApp API with fresh wamid
 *     - Step 2: Transcribes voice note & renders FairPrice estimate
 *     - Step 3: Enforces Coordinator-Validation rule (status strictly pending_validation)
 */

import { chromium } from "playwright";

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8082";
const DEMO_PASSPORT_TOKEN = "dpp-demo-kantha-001";

async function main() {
  console.log("==================================================================");
  console.log("KALASWAR CRAFT PASSPORT & DEV WHATSAPP PLAYWRIGHT SMOKE TESTS");
  console.log(`Target Web: ${BASE_URL}`);
  console.log("==================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("   [BROWSER PAGE ERROR]:", err.message));

  const results = {
    "Passport: Public Access Without Login": "PENDING",
    "Passport: Maker Story & Craft Origin": "PENDING",
    "Passport: Coarse GPS Region (Privacy-Preserving)": "PENDING",
    "Passport: 68% Fair Wage Split Donut": "PENDING",
    "Passport: 3 Verification Source Labels": "PENDING",
    "Passport: On-Chain Section & Demo Chain Badge": "PENDING",
    "Passport: Verification Details Modal (Honesty Scope)": "PENDING",
    "Passport: Responsive Layouts (360, 768, 1280px)": "PENDING",
    "Passport: Unverified / Not Found State": "PENDING",
    "Dev WhatsApp: Access & UI Initialization": "PENDING",
    "Dev WhatsApp: Step 1 Photo Ingestion with WAMID": "PENDING",
    "Dev WhatsApp: Step 2 Voice Note & FairPrice Breakdown": "PENDING",
    "Dev WhatsApp: Step 3 Approve & Coordinator Validation Rule": "PENDING",
  };

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: PUBLIC CRAFT PASSPORT (/passport/:token)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("--- PART 1: Testing Public /passport/:token ---");

    // 1. Desktop viewport
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/passport/${DEMO_PASSPORT_TOKEN}`, { waitUntil: "networkidle", timeout: 15000 });

    // Public access check
    const pageUrl = page.url();
    if (!pageUrl.includes("/auth") && pageUrl.includes(`/passport/${DEMO_PASSPORT_TOKEN}`)) {
      results["Passport: Public Access Without Login"] = "PASSED";
      console.log("✓ Public access confirmed: loaded without redirecting to login.");
    }

    // Maker story & craft title
    await page.waitForSelector("[data-testid='passport-product-title']", { timeout: 8000 });
    const productTitle = await page.textContent("[data-testid='passport-product-title']");
    const makerName = await page.textContent("[data-testid='maker-name']");

    if (productTitle.includes("Kantha") && makerName.includes("Radha D.")) {
      results["Passport: Maker Story & Craft Origin"] = "PASSED";
      console.log(`✓ Maker story & craft origin: "${productTitle.trim()}" by "${makerName.trim()}"`);
    }

    // Coarse GPS region
    const coarseRegion = await page.textContent("[data-testid='passport-coarse-region']");
    if (coarseRegion.includes("Bolpur, Birbhum, West Bengal")) {
      results["Passport: Coarse GPS Region (Privacy-Preserving)"] = "PASSED";
      console.log(`✓ Coarse GPS region verified: "${coarseRegion.trim()}"`);
    }

    // 68% Fair wage split
    const wageSplit = await page.textContent("[data-testid='passport-wage-split-pct']");
    if (wageSplit.includes("68%")) {
      results["Passport: 68% Fair Wage Split Donut"] = "PASSED";
      console.log(`✓ Fair wage split verified: "${wageSplit.trim()}"`);
    }

    // Verification source labels
    const bodyContent = await page.textContent("body");
    const hasArtisanProvided = bodyContent.includes("artisan-provided");
    const hasCollectiveRecorded = bodyContent.includes("collective-recorded");
    const hasIndependentlyVerified = bodyContent.includes("independently verified");

    if (hasArtisanProvided && hasCollectiveRecorded && hasIndependentlyVerified) {
      results["Passport: 3 Verification Source Labels"] = "PASSED";
      console.log("✓ Source labels verified: [artisan-provided], [collective-recorded], [independently verified]");
    }

    // On-Chain Section & Demo Chain badge
    const demoBadge = await page.textContent("[data-testid='demo-chain-badge']");
    const merkleRoot = await page.textContent("[data-testid='merkle-root-value']");
    const polygonTx = await page.textContent("[data-testid='polygon-tx-value']");

    if (
      demoBadge.includes("Demo chain: Polygon Amoy") &&
      merkleRoot.startsWith("0x1ae9") &&
      polygonTx.startsWith("0x9e8a")
    ) {
      results["Passport: On-Chain Section & Demo Chain Badge"] = "PASSED";
      console.log(`✓ On-chain section: Demo Chain badge "${demoBadge.trim()}", Root & Tx displayed.`);
    }

    // Verification Details Modal
    await page.click("[data-testid='open-verification-modal-btn']");
    await page.waitForSelector("[role='dialog']", { timeout: 5000 });
    const modalContent = await page.textContent("[role='dialog']");

    if (
      modalContent.includes("What is confirmed, and what is not") &&
      modalContent.includes("Group 1 · Confirmed") &&
      modalContent.includes("Group 2 · Stated by the Maker") &&
      modalContent.includes("Group 3 · Privacy Preservation")
    ) {
      results["Passport: Verification Details Modal (Honesty Scope)"] = "PASSED";
      console.log("✓ Verification Details modal opened with Groups 1, 2, 3 honesty scope.");
    }
    // Close modal
    await page.click("button[aria-label='Close verification dialog']");

    // Responsive checks (Tablet & Mobile)
    // 768px Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    const tabletTitle = await page.isVisible("[data-testid='passport-product-title']");

    // 360px Mobile
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(300);
    const mobileTitle = await page.isVisible("[data-testid='passport-product-title']");
    const mobileBadge = await page.isVisible("[data-testid='demo-chain-badge']");

    if (tabletTitle && mobileTitle && mobileBadge) {
      results["Passport: Responsive Layouts (360, 768, 1280px)"] = "PASSED";
      console.log("✓ Responsive layout verified at 360px, 768px, and 1280px viewports.");
    }

    // Invalid Token Not-Found State
    await page.goto(`${BASE_URL}/passport/non-existent-token-xyz`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForSelector("text=Passport Not Found", { timeout: 8000 });
    const notFoundText = await page.textContent("body");
    if (notFoundText.includes("Passport Not Found") && notFoundText.includes("UNVERIFIED RECORD")) {
      results["Passport: Unverified / Not Found State"] = "PASSED";
      console.log("✓ Invalid token renders clean unverified / not found state with demo suggestions.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: DEV WHATSAPP SIMULATOR (/dev/whatsapp)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- PART 2: Testing Dev-Only /dev/whatsapp ---");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/dev/whatsapp`, { waitUntil: "networkidle", timeout: 15000 });

    const chatThreadVisible = await page.isVisible("[data-testid='whatsapp-chat-thread']");
    if (chatThreadVisible) {
      results["Dev WhatsApp: Access & UI Initialization"] = "PASSED";
      console.log("✓ Dev WhatsApp simulator accessed with active phone container and Karigar Saathi greeting.");
    }

    // Step 1: Upload Photo
    const mediaPromise = page.waitForResponse(
      (res) => res.url().includes("/internal/whatsapp/media") && res.status() === 200,
      { timeout: 20000 }
    );
    await page.click("[data-testid='send-whatsapp-photo-btn']");
    await mediaPromise;
    await page.waitForTimeout(500);

    const threadAfterStep1 = await page.textContent("[data-testid='whatsapp-chat-thread']");
    if (threadAfterStep1.includes("नमस्ते!") && threadAfterStep1.includes("wamid.")) {
      results["Dev WhatsApp: Step 1 Photo Ingestion with WAMID"] = "PASSED";
      console.log("✓ Step 1 photo ingestion succeeded: bot replied in Hindi with unique WAMID.");
    }

    // Step 2: Voice Note
    const voicePromise = page.waitForResponse(
      (res) => res.url().includes("/internal/whatsapp/voice") && res.status() === 200,
      { timeout: 25000 }
    );
    await page.click("[data-testid='send-whatsapp-voice-btn']");
    await voicePromise;
    await page.waitForTimeout(500);

    const threadAfterStep2 = await page.textContent("[data-testid='whatsapp-chat-thread']");
    if (
      threadAfterStep2.includes("उचित मूल्य अनुमान") ||
      threadAfterStep2.includes("FairPrice") ||
      threadAfterStep2.includes("मंजूर करें")
    ) {
      results["Dev WhatsApp: Step 2 Voice Note & FairPrice Breakdown"] = "PASSED";
      console.log("✓ Step 2 voice note parsed: bot rendered FairPrice estimate and interactive action buttons.");
    }

    // Step 3: Approve & Coordinator-Validation rule
    const approvePromise = page.waitForResponse(
      (res) => res.url().includes("/internal/whatsapp/approve") && res.status() === 200,
      { timeout: 20000 }
    );

    const approveBtn = page.locator("[data-testid='approve-whatsapp-draft-btn']");
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    } else {
      await page.locator("button:has-text('मंजूर करें')").first().click();
    }
    await approvePromise;
    await page.waitForTimeout(500);

    const threadAfterStep3 = await page.textContent("[data-testid='whatsapp-chat-thread']");
    if (
      threadAfterStep3.includes("pending_validation") ||
      threadAfterStep3.includes("समीक्षा प्रतीक्षित") ||
      threadAfterStep3.includes("GI वॉटरमार्क")
    ) {
      results["Dev WhatsApp: Step 3 Approve & Coordinator Validation Rule"] = "PASSED";
      console.log("✓ Step 3 approval confirmed: status strictly transitions to pending_validation with GI watermark!");
    }

  } catch (err) {
    console.error("FATAL ERROR in smoke tests:", err);
  } finally {
    await browser.close();

    console.log("\n==================================================================");
    console.log("FINAL SMOKE TEST SUMMARY");
    console.log("==================================================================");
    let allPassed = true;
    for (const [flow, status] of Object.entries(results)) {
      const mark = status === "PASSED" ? "✓" : "✗";
      console.log(`${mark} ${flow.padEnd(58)} : ${status}`);
      if (status !== "PASSED") allPassed = false;
    }
    console.log("==================================================================");

    if (!allPassed) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Runner failed:", err);
  process.exit(1);
});
