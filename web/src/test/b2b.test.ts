import { describe, expect, it } from "vitest";
import {
  assessBuyerRequest,
  changedCommercialFields,
  prefillBriefForReorder,
  quoteTotals,
  specForAssessment,
  validateBrief,
} from "@/lib/b2b";
import type { CollectiveSnapshot } from "@/lib/makepossible";
import type { QuotationSpec } from "@/lib/types";

const completeBrief = {
  title: "500 woven gift hampers",
  craft_category: "kouna grass weaving",
  quantity: "500",
  deadline: "2030-06-01",
  delivery_location: "Pune, Maharashtra",
};

const emptySnapshot: CollectiveSnapshot = {
  shg: { id: "s1", name: "Test Collective", monthly_capacity: null },
  skills: [],
  materials: [],
  activeWorkloadUnits: 0,
  comparablePrices: { min: 0, avg: 0, max: 0, count: 0 },
};

describe("brief validation", () => {
  it("reports every missing required field", () => {
    const result = validateBrief({});
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["title", "craft_category", "quantity", "deadline", "delivery_location"]);
  });

  it("accepts a complete brief", () => {
    expect(validateBrief(completeBrief).ok).toBe(true);
  });

  it("accepts a numeric quantity as provided by the form", () => {
    expect(validateBrief({ ...completeBrief, quantity: 80 }).ok).toBe(true);
    expect(validateBrief({ ...completeBrief, quantity: 0 }).ok).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    const result = validateBrief({ ...completeBrief, quantity: "0" });
    expect(result.ok).toBe(false);
    expect(result.invalid).toContain("quantity");
  });

  it("rejects an unparseable deadline", () => {
    const result = validateBrief({ ...completeBrief, deadline: "sometime soon" });
    expect(result.invalid).toContain("deadline");
  });
});

describe("feasibility mapping", () => {
  it("computes deadline days from the deadline date", () => {
    const today = new Date("2030-01-01T00:00:00Z");
    const spec = specForAssessment({ ...completeBrief, deadline: "2030-01-11" }, today);
    expect(spec.deadline_in_days).toBe(10);
    expect(spec.quantity).toBe(500);
  });

  it("reports missing information rather than feasibility when nothing is recorded", () => {
    const assessment = assessBuyerRequest(completeBrief, emptySnapshot, new Date("2030-01-01T00:00:00Z"));
    expect(assessment.status).toBe("insufficient_information");
    expect(assessment.missing.length).toBeGreaterThan(0);
  });

  it("passes a total-only budget through so the engine flags the missing per-unit price", () => {
    const spec = specForAssessment({ ...completeBrief, budget_total: "300000" });
    expect(spec.budget_inr_per_unit).toBeNull();
    expect(spec.budget_inr_total).toBe(300000);
  });
});

describe("quotation versioning", () => {
  const base: QuotationSpec = {
    product_spec: "Kouna gift hamper, large",
    quantity: 500,
    unit_price_inr: 850,
    lead_time_days: 45,
    delivery_assumptions: "Ex-workshop, buyer arranges freight",
    expiry_date: "2030-03-01",
  };

  it("requires a new version when price, quantity, spec or dates change", () => {
    expect(changedCommercialFields(base, { ...base, unit_price_inr: 900 })).toContain("unit_price_inr");
    expect(changedCommercialFields(base, { ...base, quantity: 400 })).toContain("quantity");
    expect(changedCommercialFields(base, { ...base, product_spec: "small" })).toContain("product_spec");
    expect(changedCommercialFields(base, { ...base, lead_time_days: 60 })).toContain("lead_time_days");
  });

  it("does not require a version for non-commercial edits", () => {
    expect(changedCommercialFields(base, { ...base, payment_terms: "50% advance" })).toEqual([]);
  });
});

describe("quotation totals", () => {
  it("computes goods, fees and total", () => {
    const totals = quoteTotals({ quantity: 40, unit_price_inr: 850, fees_pct: 5 });
    expect(totals).toEqual({ goodsInr: 34000, feesInr: 1700, totalInr: 35700 });
  });

  it("returns null instead of guessing when price or quantity is missing", () => {
    expect(quoteTotals({ quantity: 40 })).toBeNull();
    expect(quoteTotals({ unit_price_inr: 850 })).toBeNull();
    expect(quoteTotals({ quantity: 0, unit_price_inr: 850 })).toBeNull();
  });
});

describe("reorder prefill", () => {
  it("strips confirmed and decision state so the reorder is revalidated", () => {
    const brief = {
      ...completeBrief,
      confirmed_order_id: "o1",
      decline_reason: "x",
      clarification_note: "y",
      reorder_of: "KBR-1",
    };
    const next = prefillBriefForReorder(brief);
    expect(next["confirmed_order_id"]).toBeUndefined();
    expect(next["decline_reason"]).toBeUndefined();
    expect(next["clarification_note"]).toBeUndefined();
    expect(next["reorder_of"]).toBeUndefined();
    expect(next["reorder"]).toBe(true);
    expect(next["title"]).toBe(completeBrief.title);
  });
});
