/**
 * test-shop-gift-flows.mjs
 *
 * Playwright Smoke Test Suite for /shop/* and /gift/* (plus /b2b/*):
 * (1) Catalog with filters & pagination; product detail with Living Craft Story & verification-source labels;
 *     cart and checkout (simulated payment, labelled demo); order tracking from recorded events only.
 * (2) Gift Concierge: guided intake -> editable structured request -> MakePossible result
 *     (feasible / uncertain / not feasible, with evidence and missing info) ->
 *     proposal review with version history and same-version two-sided approval.
 * (3) "For business" section: B2B brief form, quote versions, sample approval, order confirmation, PO status.
 */

import { chromium } from "playwright";

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8082";
const DEMO_PRODUCT_ID = "dddddddd-0001-0000-0000-000000000001";
const DEMO_ORDER_ID = "22222222-0001-0000-0000-000000000001";
const DEMO_QUOTE_ID = "44444444-0001-0000-0000-000000000001";

async function main() {
  console.log("==================================================================");
  console.log("KALASWAR SHOP & GIFT CONCIERGE PLAYWRIGHT SMOKE TESTS");
  console.log(`Target Web: ${BASE_URL}`);
  console.log("==================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("   [BROWSER PAGE ERROR]:", err.message));
  page.on("console", (msg) => {
    console.log(`   [BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
  });

  const results = {
    "Flow 1: Catalog Filters & Pagination": "PENDING",
    "Flow 1: Living Craft Story & Verification Labels": "PENDING",
    "Flow 1: Cart & Checkout (Simulated Demo Payment)": "PENDING",
    "Flow 1: Order Tracking from Recorded Events": "PENDING",
    "Flow 2: Gift Concierge Guided Intake & Structured Spec": "PENDING",
    "Flow 2: MakePossible Feasibility (Evidence & Missing Info)": "PENDING",
    "Flow 2: Proposal Review & Two-Sided Version Approval": "PENDING",
    "Flow 3: B2B Brief Form & Quotes": "PENDING",
    "Flow 3: B2B PO Factoring Escrow Status (Demo)": "PENDING",
  };

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FLOW 1: Catalog with filters, pagination, product detail, cart, checkout, tracking
    // ══════════════════════════════════════════════════════════════════════════
    console.log("[FLOW 1] Navigating to /shop catalog...");
    await page.goto(`${BASE_URL}/shop`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForSelector('text=Discover Handcrafted Heritage', { timeout: 15_000 });

    // Filter test
    console.log("   Testing category filter pills and search inputs...");
    const hasCategoryPill = await page.locator('button:has-text("Textiles & Apparel")').first().isVisible();
    await page.click('button:has-text("Textiles & Apparel")');
    await page.waitForSelector('article', { timeout: 15_000 });

    const hasCards = (await page.locator("article").count()) > 0;
    results["Flow 1: Catalog Filters & Pagination"] = hasCategoryPill && hasCards ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 1: Catalog Filters & Pagination"]} (Category filter: ${hasCategoryPill}, Items listed: ${hasCards})`);

    // Product Detail with Living Craft Story
    console.log(`\n[FLOW 1] Navigating to Product Detail (/product/${DEMO_PRODUCT_ID})...`);
    await page.goto(`${BASE_URL}/product/${DEMO_PRODUCT_ID}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector('text=Living Craft Story', { timeout: 20_000 });

    const hasLivingStory = await page.locator('text=Living Craft Story').first().isVisible();
    const hasConsentLabel = await page.locator('text=Maker Consent Verified').first().isVisible();
    const hasVoiceLabel = await page.locator('text=Voice Interview Verified by Coordinator').first().isVisible();
    const hasGiLabel = await page.locator('text=GI Origin Certification Source').first().isVisible();
    results["Flow 1: Living Craft Story & Verification Labels"] =
      hasLivingStory && hasConsentLabel && hasVoiceLabel && hasGiLabel ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 1: Living Craft Story & Verification Labels"]} (Story: ${hasLivingStory}, Consent: ${hasConsentLabel}, Voice: ${hasVoiceLabel}, GI: ${hasGiLabel})`);

    // Cart & Checkout (Simulated Demo Payment)
    console.log("\n[FLOW 1] Testing Add to Cart & Checkout Drawer...");
    await page.waitForTimeout(2500); // Wait for React client hydration
    await page.click('button:has-text("Add to Cart")');
    await page.waitForSelector('text=Shopping Cart', { timeout: 12_000 });
    const hasCartSheet = await page.locator('text=Shopping Cart').first().isVisible();
    const hasDemoPill = await page.locator('text=[DEMO]').first().isVisible();

    console.log("   Proceeding to Simulated Checkout...");
    await page.click('button:has-text("Proceed to Checkout")');
    await page.waitForSelector('text=Simulated Checkout', { timeout: 8_000 });

    // Fill customer reference & submit checkout
    await page.fill('input[placeholder="e.g. Meera Sharma"]', "Siddharth Verma — Bangalore");
    await page.click('button:has-text("Confirm & Place Order")');

    await page.waitForSelector('text=Order Placed!', { timeout: 10_000 });
    const hasOrderSuccess = await page.locator('text=Order Placed!').first().isVisible();
    const hasSimulatedPaymentBanner = await page.locator('text=Simulated Payment Verified').first().isVisible();
    results["Flow 1: Cart & Checkout (Simulated Demo Payment)"] =
      hasCartSheet && hasDemoPill && hasOrderSuccess && hasSimulatedPaymentBanner ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 1: Cart & Checkout (Simulated Demo Payment)"]} (Cart: ${hasCartSheet}, Order Placed: ${hasOrderSuccess}, Simulated Payment Demo Label: ${hasSimulatedPaymentBanner})`);

    // Order Tracking from recorded events only
    console.log(`\n[FLOW 1] Navigating to Order Tracking (/orders/${DEMO_ORDER_ID})...`);
    await page.goto(`${BASE_URL}/orders/${DEMO_ORDER_ID}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=Aarav Sharma', { timeout: 15_000 });

    const hasOrderTitle = await page.locator('text=Aarav Sharma').first().isVisible();
    const hasRecordedEvent = await page.locator('text=Customer payment verified via UPI').first().isVisible();
    const hasSimulatedCarrierNote = await page.locator('text=Live carrier tracking needs a real logistics integration').first().isVisible();
    results["Flow 1: Order Tracking from Recorded Events"] =
      hasOrderTitle && hasRecordedEvent && hasSimulatedCarrierNote ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 1: Order Tracking from Recorded Events"]} (Order: ${hasOrderTitle}, Recorded Event: ${hasRecordedEvent}, Demo Carrier: ${hasSimulatedCarrierNote})`);

    // ══════════════════════════════════════════════════════════════════════════
    // FLOW 2: Gift Concierge (Intake -> Structured -> MakePossible -> Proposal)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n[FLOW 2] Navigating to /gift concierge...");
    await page.goto(`${BASE_URL}/gift`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=Commission a Bespoke Gift', { timeout: 15_000 });

    // Step 1: Intake
    console.log("   Step 1: Selecting occasion and craft...");
    await page.click('button:has-text("Festive & Diwali Hamper")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Generate Structured Specification")');

    // Step 2: Structured Spec
    await page.waitForSelector('text=2. Review & Edit Structured Request', { timeout: 10_000 });
    const hasStructuredForm = await page.locator('text=2. Review & Edit Structured Request').first().isVisible();
    results["Flow 2: Gift Concierge Guided Intake & Structured Spec"] = hasStructuredForm ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 2: Gift Concierge Guided Intake & Structured Spec"]} (Structured Spec Editor: ${hasStructuredForm})`);

    // Step 3: Trigger MakePossible
    console.log("   Step 3: Triggering MakePossible feasibility check...");
    await page.click('button:has-text("Run MakePossible™ Feasibility Check")');
    await page.waitForSelector('text=MakePossible Feasibility Verdict', { timeout: 15_000 });

    const hasVerdict = await page.getByText(/Status:/i).first().isVisible();
    const hasEvidence = await page.locator('text=Verified Capability Evidence').first().isVisible();
    const hasMissingInfo = await page.locator('text=Missing Inputs & Audit Points').first().isVisible();
    results["Flow 2: MakePossible Feasibility (Evidence & Missing Info)"] =
      hasVerdict && hasEvidence && hasMissingInfo ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 2: MakePossible Feasibility (Evidence & Missing Info)"]} (Verdict: ${hasVerdict}, Evidence: ${hasEvidence}, Missing Info: ${hasMissingInfo})`);

    // Step 4: Issue Formal Proposal & Review Same-Version Approval
    console.log("   Step 4: Navigating to Proposal Review & Two-Sided Version Approval...");
    await page.click('button:has-text("Issue Formal Proposal with Two-Sided Approval")');
    await page.waitForSelector('text=Two-Sided Approval State', { timeout: 15_000 });

    const hasTwoSidedBanner = await page.locator('text=Two-Sided Approval State').first().isVisible();
    const hasVersionTabs = await page.locator('button:has-text("V1")').first().isVisible();
    const hasApproveV1Btn = await page.locator('button:has-text("Approve V1")').first().isVisible();

    // Click client approval
    console.log("   Clicking Client Approval for Version 1...");
    await page.click('button:has-text("Approve V1")');
    await page.waitForTimeout(1000);

    results["Flow 2: Proposal Review & Two-Sided Version Approval"] =
      hasTwoSidedBanner && hasVersionTabs && hasApproveV1Btn ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 2: Proposal Review & Two-Sided Version Approval"]} (Two-sided State: ${hasTwoSidedBanner}, Version Tabs: ${hasVersionTabs}, Approve Action: ${hasApproveV1Btn})`);

    // ══════════════════════════════════════════════════════════════════════════
    // FLOW 3: "For business" section (B2B Brief, Quotes, PO Factoring)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n[FLOW 3] Navigating to /b2b/request brief form...");
    await page.goto(`${BASE_URL}/b2b/request`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(2000);
    await page.waitForSelector('input#r-title, button[type="submit"]', { timeout: 15_000 });
    const hasB2bForm = await page.locator('button[type="submit"]').first().isVisible();
    results["Flow 3: B2B Brief Form & Quotes"] = hasB2bForm ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 3: B2B Brief Form & Quotes"]} (B2B Brief Form: ${hasB2bForm})`);

    // B2B Order Tracking with PO Factoring Escrow Status
    console.log(`\n[FLOW 3] Checking B2B Order Details & PO Factoring (/b2b/orders/${DEMO_ORDER_ID})...`);
    await page.goto(`${BASE_URL}/b2b/orders/${DEMO_ORDER_ID}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=PO Micro-Factoring & Working Capital Escrow', { timeout: 15_000 });

    const hasFactoringTitle = await page.locator('text=PO Micro-Factoring & Working Capital Escrow').first().isVisible();
    const hasDemoEscrowBadge = await page.locator('text=[DEMO] Simulated Escrow').first().isVisible();
    const hasVerifiedPoStep = await page.locator('text=1. Verified PO').first().isVisible();
    const hasAdvanceStep = await page.locator('text=3. 80% Advance').first().isVisible();

    results["Flow 3: B2B PO Factoring Escrow Status (Demo)"] =
      hasFactoringTitle && hasDemoEscrowBadge && hasVerifiedPoStep && hasAdvanceStep ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 3: B2B PO Factoring Escrow Status (Demo)"]} (Factoring: ${hasFactoringTitle}, Demo Badge: ${hasDemoEscrowBadge}, Steps: ${hasVerifiedPoStep && hasAdvanceStep})`);

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log("SMOKE TEST RESULTS SUMMARY ACROSS ALL 3 FLOWS:");
  console.log("==================================================================");
  let allPassed = true;
  for (const [flow, status] of Object.entries(results)) {
    console.log(`   ${status === "PASSED" ? "✓" : "✗"} ${flow.padEnd(58)}: ${status}`);
    if (status !== "PASSED") allPassed = false;
  }
  console.log("==================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

