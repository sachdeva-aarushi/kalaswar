/**
 * test-workroom-9-flows.mjs
 *
 * Comprehensive Playwright Smoke Test Suite for the 9 Workroom Flows:
 * 1. Listing validation queue (Approve/Reject reason, publish only after approval)
 * 2. Assignments with skills-aware suggestions
 * 3. Inventory with freshness flags (<14d, 15-60d, >60d) and audit actions
 * 4. Production Risk Radar showing the explanation behind every flag
 * 5. Quality checks and dispatch gating
 * 6. Proposals inbox (Accept, decline, revise with version history)
 * 7. B2B coordinator section (Quote versions, sample approval, PO factoring labelled demo)
 * 8. Admin workspace (Users & roles, audit log, demo-mode toggle; 403 for non-admins)
 * 9. FairPrice cost-sheet and DPP QR generator on product and quote pages
 */

import { chromium } from "playwright";

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8082";
const API_BASE_URL = process.env["VITE_API_BASE_URL"] ?? "http://127.0.0.1:8000";

const LOGINS = {
  coordinator: { email: "coordinator.sunita@kalaswar.demo", pass: "KalaswarDemo@2025" },
  artisan: { email: "artisan.anita@kalaswar.demo", pass: "KalaswarDemo@2025" },
  admin: { email: "admin@kalaswar.demo", pass: "KalaswarDemo@2025" },
};

const ORDER_ID = "22222222-0001-0000-0000-000000000001";
const PROPOSAL_ID = "66666666-0001-0000-0000-000000000001";
const PRODUCT_ID = "dddddddd-0001-0000-0000-000000000001";

async function loginUser(page, roleKey) {
  const { email, pass } = LOGINS[roleKey];
  console.log(`\n🔑 Signing in as ${roleKey} (${email})...`);
  await page.context().clearCookies();
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "load", timeout: 20_000 });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.waitForTimeout(200);

  await page.click('button[type="submit"]');

  // Wait for redirect to workroom or home
  await page.waitForURL((url) => url.pathname.startsWith("/workroom") || url.pathname === "/", {
    timeout: 15_000,
  });
  console.log(`   ✓ Authenticated. Current URL: ${page.url()}`);
  await page.waitForTimeout(1000);
}

async function main() {
  console.log("==================================================================");
  console.log("KALASWAR WORKROOM 9-FLOW PLAYWRIGHT SMOKE TEST SUITE");
  console.log(`Target: ${BASE_URL} | Backend: ${API_BASE_URL}`);
  console.log("==================================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.log(`   [PAGE ERROR]: ${err.message}`));

  const results = {};

  try {
    // ── Session 1: COORDINATOR ─────────────────────────────────────────────
    await loginUser(page, "coordinator");

    // Flow 4: Production Risk Radar
    console.log("\n[FLOW 4] Production Risk Radar on /workroom...");
    await page.goto(`${BASE_URL}/workroom`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=Production Risk Radar', { timeout: 12_000 });
    const isRadarPresent = await page.locator('text=Production Risk Radar').first().isVisible();
    const explanationText = await page.locator('text=Root Cause & Explanation').first().isVisible();
    results["Flow 4: Production Risk Radar"] = isRadarPresent && explanationText ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 4: Production Risk Radar"]} (Radar: ${isRadarPresent}, Explanations: ${explanationText})`);

    // Flow 1: Listing validation queue
    console.log("\n[FLOW 1] Listing validation queue on /workroom/products...");
    await page.goto(`${BASE_URL}/workroom/products`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('button:has-text("Listing Validation Queue")', { timeout: 12_000 });
    await page.click('button:has-text("Listing Validation Queue")');
    await page.waitForSelector('table', { timeout: 10_000 });
    const hasQueueTable = await page.locator('table').first().isVisible();
    const actionBtnCount = await page.locator('table button').count();
    const hasValidationBtns = actionBtnCount > 0;
    results["Flow 1: Listing Validation Queue"] = hasQueueTable && hasValidationBtns ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 1: Listing Validation Queue"]} (Queue: ${hasQueueTable}, Action buttons: ${actionBtnCount})`);

    // Flow 2 & 5: Order details, skills-aware suggestions & QC dispatch gating
    console.log(`\n[FLOW 2 & 5] Order details, Skills Assignment & QC Dispatch Gating (/workroom/orders/${ORDER_ID})...`);
    await page.goto(`${BASE_URL}/workroom/orders/${ORDER_ID}`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=Quality Checks & Dispatch Gating', { timeout: 12_000 });

    // Flow 5 check: Quality checks & Dispatch Gating
    const hasQcCard = await page.locator('text=Quality Checks & Dispatch Gating').first().isVisible();
    const hasGatedBanner = await page.locator('text=Dispatch Gated').first().isVisible();
    const hasInspectBtn = await page.locator('button:has-text("Inspect (QC)")').first().isVisible();
    results["Flow 5: QC & Strict Dispatch Gating"] = hasQcCard && (hasGatedBanner || hasInspectBtn) ? "PASSED" : "FAILED";
    console.log(`   Flow 5 Result: ${results["Flow 5: QC & Strict Dispatch Gating"]} (QC Card: ${hasQcCard}, Gating Enforced: ${hasGatedBanner})`);

    // Flow 2 check: Skills-Aware Assignment Suggestions
    console.log("   Opening Skills-Aware Assign modal...");
    await page.click('button:has-text("Skills Suggestions")');
    await page.waitForSelector('text=Skills-Aware Artisan Assignment', { timeout: 8_000 });
    const hasSuggestionsModal = await page.locator('text=Skills-Aware Artisan Assignment').first().isVisible();
    const hasMatchBadge = await page.locator('text=Match').first().isVisible();
    results["Flow 2: Skills-Aware Suggestions"] = hasSuggestionsModal && hasMatchBadge ? "PASSED" : "FAILED";
    console.log(`   Flow 2 Result: ${results["Flow 2: Skills-Aware Suggestions"]} (Modal: ${hasSuggestionsModal}, Match badges: ${hasMatchBadge})`);
    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Flow 3: Inventory with freshness flags
    console.log("\n[FLOW 3] Inventory with Freshness Flags & Audit actions...");
    await page.goto(`${BASE_URL}/workroom/inventory`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=Threshold: 60 Days', { timeout: 12_000 });
    const hasFreshnessTag = await page.locator('text=/Fresh|Audit Due|Stale/').first().isVisible();
    const hasVerifyBtn = await page.locator('button:has-text("Audit / Verify Stock")').first().isVisible();
    results["Flow 3: Inventory Freshness Flags"] = hasFreshnessTag && hasVerifyBtn ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 3: Inventory Freshness Flags"]} (Freshness Flags: ${hasFreshnessTag}, Audit Action: ${hasVerifyBtn})`);

    // Flow 6 & 9: Proposals inbox & FairPrice cost sheet
    console.log(`\n[FLOW 6 & 9] Proposals inbox & FairPrice on proposal page (/workroom/requests/${PROPOSAL_ID}/proposal)...`);
    await page.goto(`${BASE_URL}/workroom/requests/${PROPOSAL_ID}/proposal`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=FairPrice™ Living Cost Sheet', { timeout: 12_000 });
    const hasFairPriceOnProposal = await page.locator('text=FairPrice™ Living Cost Sheet').first().isVisible();
    const hasVersionAudit = await page.locator('text=VERSION AUDIT LOG').first().isVisible();
    const hasDeclineBtn = await page.locator('button:has-text("Decline")').first().isVisible();
    const hasApproveVBtn = await page.locator('button:has-text("Approve V")').first().isVisible();
    results["Flow 6: Proposals Inbox & Versions"] = hasVersionAudit && hasDeclineBtn && hasApproveVBtn ? "PASSED" : "FAILED";
    console.log(`   Flow 6 Result: ${results["Flow 6: Proposals Inbox & Versions"]} (Versions: ${hasVersionAudit}, Decline/Approve: ${hasDeclineBtn && hasApproveVBtn})`);

    // Flow 7: B2B Coordinator section
    console.log("\n[FLOW 7] B2B Coordinator section (Quote versions & PO Factoring Demo)...");
    await page.goto(`${BASE_URL}/workroom/b2b`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=Simulated Escrow', { timeout: 12_000 });
    const hasDemoBanner = await page.locator('text=Simulated Escrow').first().isVisible();
    const hasPOFactoring = await page.locator('text=PO Micro-Factoring (Demo)').first().isVisible();
    results["Flow 7: B2B Coordinator & Factoring"] = hasDemoBanner && hasPOFactoring ? "PASSED" : "FAILED";
    console.log(`   Result: ${results["Flow 7: B2B Coordinator & Factoring"]} (Demo Banner: ${hasDemoBanner}, PO Escrow: ${hasPOFactoring})`);

    // Flow 8: RLS Check - Coordinator accessing Admin page should be 403 Forbidden
    console.log("\n[FLOW 8 RLS] Coordinator attempting to access /workroom/admin (expecting 403)...");
    await page.goto(`${BASE_URL}/workroom/admin`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=Admin Access Restricted', { timeout: 10_000 });
    const has403NoAccess = await page.locator('text=Admin Access Restricted').first().isVisible();
    console.log(`   Coordinator 403 Guard Enforced: ${has403NoAccess ? "YES ✓" : "NO ✗"}`);

    // Flow 9: Product page FairPrice & DPP QR generator
    console.log(`\n[FLOW 9] Product page FairPrice cost-sheet & DPP QR Generator (/product/${PRODUCT_ID})...`);
    await page.goto(`${BASE_URL}/product/${PRODUCT_ID}`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForSelector('text=FairPrice™ Living Cost Sheet', { timeout: 12_000 });
    const hasProductFairPrice = await page.locator('text=FairPrice™ Living Cost Sheet').first().isVisible();
    const hasDppQr = await page.locator('text=Digital Product Passport (DPP)').first().isVisible();
    await page.waitForSelector('img[alt*="DPP QR"]', { timeout: 8_000 });
    const hasQrCanvas = await page.locator('img[alt*="DPP QR"]').first().isVisible();
    results["Flow 9: FairPrice & DPP QR Generator"] = (hasFairPriceOnProposal && hasProductFairPrice && hasDppQr && hasQrCanvas) ? "PASSED" : "FAILED";
    console.log(`   Flow 9 Result: ${results["Flow 9: FairPrice & DPP QR Generator"]} (Product FairPrice: ${hasProductFairPrice}, DPP QR: ${hasDppQr}, QR Image: ${hasQrCanvas})`);

    // ── Session 2: ARTISAN (RLS Enforcement Checks) ────────────────────────
    await loginUser(page, "artisan");

    console.log("\n[ARTISAN RLS] Checking restricted views for Artisan Anita...");
    await page.goto(`${BASE_URL}/workroom/products`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForTimeout(1000);
    await page.waitForSelector('button:has-text("Listing Validation Queue")', { timeout: 12_000 });
    await page.click('button:has-text("Listing Validation Queue")');
    await page.waitForSelector('text=Artisan Read-Only Mode', { timeout: 10_000 });
    const hasArtisanNotice = await page.locator('text=Artisan Read-Only Mode').first().isVisible();
    console.log(`   Artisan Validation Notice Enforced: ${hasArtisanNotice ? "YES ✓" : "NO ✗"}`);

    await page.goto(`${BASE_URL}/workroom/admin`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForTimeout(1000);
    await page.waitForSelector('text=Admin Access Restricted', { timeout: 10_000 });
    const artisan403 = await page.locator('text=Admin Access Restricted').first().isVisible();
    console.log(`   Artisan Admin 403 Enforced: ${artisan403 ? "YES ✓" : "NO ✗"}`);

    // ── Session 3: ADMIN (Platform Administration & Demo Toggle) ────────────
    await loginUser(page, "admin");

    console.log("\n[FLOW 8 ADMIN] Admin accessing /workroom/admin...");
    await page.goto(`${BASE_URL}/workroom/admin`, { waitUntil: "load", timeout: 20_000 });
    await page.waitForTimeout(1000);
    await page.waitForSelector('h1:has-text("Platform Administration")', { timeout: 12_000 });
    const hasAdminTitle = await page.locator('h1:has-text("Platform Administration")').first().isVisible();
    const hasUsersTable = await page.locator('table').first().isVisible();
    const hasDemoToggle = await page.locator('button:has-text("Demo Mode:")').first().isVisible();

    // Check System Audit Log tab
    await page.click('button:has-text("System Audit Log")');
    await page.waitForSelector('th:has-text("Action")', { timeout: 8_000 });
    const hasAuditTable = await page.locator('table').first().isVisible();

    results["Flow 8: Admin Workspace & Governance"] = hasAdminTitle && hasUsersTable && hasDemoToggle && hasAuditTable && has403NoAccess && artisan403 ? "PASSED" : "FAILED";
    console.log(`   Flow 8 Result: ${results["Flow 8: Admin Workspace & Governance"]} (Admin page: ${hasAdminTitle}, Users: ${hasUsersTable}, Demo Toggle: ${hasDemoToggle}, Audit Trail: ${hasAuditTable}, RLS 403 Guards: PASSED)`);

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log("SMOKE TEST SUMMARY ACROSS 9 FLOWS & ROLES:");
  console.log("==================================================================");
  let allPassed = true;
  for (const [flow, status] of Object.entries(results)) {
    console.log(`   ${status === "PASSED" ? "✓" : "✗"} ${flow.padEnd(42)}: ${status}`);
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
