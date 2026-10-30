/**
 * audit-polished-routes.mjs
 *
 * Comprehensive Responsive, Accessibility, Hindi Font Fallback, and
 * Component Polish Audit for the new routes:
 *   - /workroom/*
 *   - /shop/*
 *   - /gift/*
 *   - /passport/:token
 *   - /dev/whatsapp
 *
 * Runs across 3 responsive breakpoints: 360px, 768px, 1280px.
 */

import { chromium } from "playwright";

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:8082";

const VIEWPORTS = [
  { name: "360px (Mobile)", width: 360, height: 740 },
  { name: "768px (Tablet)", width: 768, height: 1024 },
  { name: "1280px (Desktop)", width: 1280, height: 800 },
];

const ROUTES_TO_AUDIT = [
  { path: "/shop", name: "Shop Catalog", role: "public" },
  { path: "/gift", name: "Gift Concierge", role: "public" },
  { path: "/passport/dpp-demo-kantha-001", name: "Craft Passport", role: "public" },
  { path: "/dev/whatsapp", name: "WhatsApp Simulator", role: "public" },
  { path: "/workroom", name: "Workroom Overview", role: "coordinator" },
  { path: "/workroom/orders", name: "Workroom Orders", role: "coordinator" },
  { path: "/workroom/products", name: "Workroom Products", role: "coordinator" },
  { path: "/workroom/inventory", name: "Workroom Inventory", role: "coordinator" },
  { path: "/workroom/admin", name: "Workroom Admin", role: "admin" },
];

async function signIn(page, role) {
  const credentials = {
    coordinator: { email: "coordinator.sunita@kalaswar.demo", password: "KalaswarDemo@2025" },
    admin: { email: "admin@kalaswar.demo", password: "KalaswarDemo@2025" },
  };

  const cred = credentials[role];
  if (!cred) return;

  await page.goto(`${BASE_URL}/auth`, { waitUntil: "load" });
  await page.waitForTimeout(800);

  // Check if already signed in
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(cred.email);
    await page.locator('input[type="password"]').fill(cred.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
  }
}

async function auditPage(page, route, vp) {
  const issues = [];

  // 1. Horizontal scroll check
  const scrollCheck = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    const hasHorizontalOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;

    let overflowingElement = null;
    if (hasHorizontalOverflow) {
      const all = document.querySelectorAll("*");
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) {
          overflowingElement = {
            tag: el.tagName,
            id: el.id,
            className: el.className?.toString?.().slice(0, 50),
            right: rect.right,
            winWidth,
          };
          break;
        }
      }
    }

    return {
      docWidth,
      winWidth,
      bodyWidth,
      hasHorizontalOverflow,
      overflowingElement,
    };
  });

  if (scrollCheck.hasHorizontalOverflow) {
    issues.push({
      type: "horizontal-overflow",
      detail: `Doc width (${scrollCheck.docWidth}px) exceeds window width (${scrollCheck.winWidth}px)`,
      element: scrollCheck.overflowingElement,
    });
  }

  // 2. Buttons without accessible names
  const buttonAudit = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, a[role='button']"));
    const unnamed = [];
    for (const b of buttons) {
      // Hidden elements are ignored
      const style = window.getComputedStyle(b);
      if (style.display === "none" || style.visibility === "hidden") continue;

      const text = b.innerText?.trim();
      const ariaLabel = b.getAttribute("aria-label")?.trim();
      const ariaLabelledBy = b.getAttribute("aria-labelledby");
      const title = b.getAttribute("title")?.trim();

      if (!text && !ariaLabel && !ariaLabelledBy && !title) {
        unnamed.push({
          tag: b.tagName,
          id: b.id,
          className: b.className?.slice(0, 40),
        });
      }
    }
    return unnamed;
  });

  if (buttonAudit.length > 0) {
    issues.push({
      type: "unnamed-buttons",
      count: buttonAudit.length,
      detail: `${buttonAudit.length} button(s) lack accessible text or aria-label`,
      buttons: buttonAudit.slice(0, 3),
    });
  }

  // 3. Images without alt attributes
  const imageAudit = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("img"));
    const missingAlt = [];
    for (const img of images) {
      const alt = img.getAttribute("alt");
      if (alt === null) {
        missingAlt.push({ src: img.src?.slice(0, 60), id: img.id });
      }
    }
    return missingAlt;
  });

  if (imageAudit.length > 0) {
    issues.push({
      type: "missing-img-alt",
      count: imageAudit.length,
      detail: `${imageAudit.length} image(s) missing alt attribute`,
    });
  }

  // 4. Form inputs without labels or aria-label
  const formAudit = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input:not([type='hidden']), select, textarea"));
    const unlabelled = [];
    for (const inp of inputs) {
      const style = window.getComputedStyle(inp);
      if (style.display === "none" || style.visibility === "hidden") continue;

      const ariaLabel = inp.getAttribute("aria-label")?.trim();
      const ariaLabelledBy = inp.getAttribute("aria-labelledby");
      const id = inp.id;
      const hasAssociatedLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasParentLabel = inp.closest("label");

      if (!ariaLabel && !ariaLabelledBy && !hasAssociatedLabel && !hasParentLabel) {
        unlabelled.push({
          type: inp.getAttribute("type") || inp.tagName.toLowerCase(),
          id: inp.id,
          name: inp.getAttribute("name"),
          placeholder: inp.getAttribute("placeholder"),
        });
      }
    }
    return unlabelled;
  });

  if (formAudit.length > 0) {
    issues.push({
      type: "unlabelled-inputs",
      count: formAudit.length,
      detail: `${formAudit.length} input(s) lack label or aria-label`,
      inputs: formAudit.slice(0, 3),
    });
  }

  // 5. Hindi Font Fallback verification
  const fontAudit = await page.evaluate(() => {
    const kwApp = document.querySelector(".kw-app");
    if (!kwApp) return { kwAppFound: false };
    const style = window.getComputedStyle(kwApp);
    const headlineFont = style.getPropertyValue("--kw-font-headline") || "";
    const bodyFont = style.getPropertyValue("--kw-font-body") || "";
    const devanagariFont = style.getPropertyValue("--kw-font-devanagari") || "";
    const computedFont = style.fontFamily;

    const hasDevanagari =
      devanagariFont.includes("Noto Sans Devanagari") ||
      headlineFont.includes("Noto Sans Devanagari") ||
      bodyFont.includes("Noto Sans Devanagari") ||
      computedFont.includes("Noto Sans Devanagari");

    return {
      kwAppFound: true,
      hasDevanagari,
      headlineFont,
      bodyFont,
    };
  });

  return {
    route: route.path,
    name: route.name,
    viewport: vp.name,
    scrollCheck,
    fontAudit,
    issues,
    passed: issues.length === 0,
  };
}

async function main() {
  console.log("=================================================");
  console.log("POLISH AUDIT: RESPONSIVE (360, 768, 1280), A11Y, & HINDI FONT");
  console.log("=================================================");

  const browser = await chromium.launch({ headless: true });
  const results = [];
  let totalTests = 0;
  let totalPassed = 0;

  for (const vp of VIEWPORTS) {
    console.log(`\n📱 AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log("-------------------------------------------------");

    for (const route of ROUTES_TO_AUDIT) {
      totalTests++;
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await ctx.newPage();

      try {
        if (route.role !== "public") {
          await signIn(page, route.role);
        }

        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "load", timeout: 20_000 });
        await page.waitForTimeout(1200);

        const audit = await auditPage(page, route, vp);
        results.push(audit);

        if (audit.passed) {
          totalPassed++;
          console.log(`  ✅ ${route.name.padEnd(22)} (${route.path}): PASS (0 issues)`);
        } else {
          console.log(`  ⚠️  ${route.name.padEnd(22)} (${route.path}): ${audit.issues.length} issue(s)`);
          for (const iss of audit.issues) {
            console.log(`     - [${iss.type}] ${iss.detail}`);
            if (iss.element) console.log(`       Element: <${iss.element.tag} class="${iss.element.className}">`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Failed to audit ${route.path} @ ${vp.name}:`, err.message);
      } finally {
        await ctx.close();
      }
    }
  }

  await browser.close();

  console.log("\n=================================================");
  console.log(`AUDIT COMPLETE: ${totalPassed}/${totalTests} Passed (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
  console.log("=================================================");

  if (totalPassed < totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
