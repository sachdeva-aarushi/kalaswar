import { describe, expect, it } from "vitest";
import {
  assessFeasibility,
  estimateProductionDays,
  type CollectiveSnapshot,
} from "@/lib/makepossible";

function snap(overrides: Partial<CollectiveSnapshot> = {}): CollectiveSnapshot {
  return {
    shg: { id: "shg-1", name: "Kouna Sakhi Group", monthly_capacity: 55 },
    skills: [{ skill: "kouna grass weaving", level: "core", notes: null }],
    materials: [
      {
        name: "Kouna grass (dried, twisted)",
        unit: "kg",
        quantity: 48,
        low_stock_threshold: 12,
        updated_at: new Date().toISOString(),
      },
    ],
    activeWorkloadUnits: 10,
    comparablePrices: { min: 500, avg: 900, max: 1650, count: 4 },
    ...overrides,
  };
}

const baseSpec = {
  quantity: 40,
  craft_preference: "woven grass pouches",
  materials: "natural grass",
  budget_inr_per_unit: 550,
  deadline_in_days: 30,
};

describe("estimateProductionDays", () => {
  it("is deterministic from recorded capacity with a dispatch buffer", () => {
    expect(estimateProductionDays(40, 55)).toBe(26);
    expect(estimateProductionDays(1, 55)).toBe(5);
  });

  it("reports unknown when capacity is not recorded", () => {
    expect(estimateProductionDays(40, null)).toBeNull();
  });
});

describe("assessFeasibility", () => {
  it("returns potentially_feasible when all recorded data supports the request", () => {
    const a = assessFeasibility(baseSpec, snap());
    expect(a.status).toBe("potentially_feasible");
    expect(a.reasons).toHaveLength(0);
    expect(a.missing).toHaveLength(0);
    // A budget below the average comparable price is an observation, not a blocker.
    expect(a.notes[0]).toContain("₹550");
    expect(a.dataUsed.matchedSkills).toContain("kouna grass weaving");
  });

  it("flags a budget below every comparable price as feasible_with_changes", () => {
    const a = assessFeasibility({ ...baseSpec, budget_inr_per_unit: 200 }, snap());
    expect(a.status).toBe("feasible_with_changes");
    expect(a.suggestedChanges.join(" ")).toContain("₹200");
  });

  it("flags a tight deadline as feasible_with_changes, never silently", () => {
    // 40 pieces at 55/month ≈ 26 days incl. buffer → deadline 22 days is tight but not hopeless
    const a = assessFeasibility({ ...baseSpec, deadline_in_days: 22 }, snap());
    expect(a.status).toBe("feasible_with_changes");
    expect(a.reasons.join(" ")).toContain("deadline");
  });

  it("rejects an unrecorded craft as not_currently_feasible instead of guessing", () => {
    const a = assessFeasibility(
      { ...baseSpec, craft_preference: "pashmina weaving" },
      snap(),
    );
    expect(a.status).toBe("not_currently_feasible");
    expect(a.reasons[0]).toContain("pashmina weaving");
  });

  it("rejects quantities far beyond recorded capacity as not_currently_feasible", () => {
    const a = assessFeasibility({ ...baseSpec, quantity: 200 }, snap());
    expect(a.status).toBe("not_currently_feasible");
  });

  it("returns insufficient_information when capacity is unknown — unknown is a valid result", () => {
    const a = assessFeasibility(baseSpec, snap({ shg: { id: "shg-1", name: "X", monthly_capacity: null } }));
    expect(a.status).toBe("insufficient_information");
    expect(a.missing.join(" ")).toContain("capacity");
  });

  it("returns insufficient_information when no skills are recorded", () => {
    const a = assessFeasibility(baseSpec, snap({ skills: [] }));
    expect(a.status).toBe("insufficient_information");
    expect(a.missing.join(" ")).toContain("skills");
  });

  it("returns insufficient_information when no comparable prices exist to check the budget", () => {
    const a = assessFeasibility(
      baseSpec,
      snap({ comparablePrices: { min: 0, avg: 0, max: 0, count: 0 } }),
    );
    expect(a.status).toBe("insufficient_information");
    expect(a.missing.join(" ")).toContain("comparable");
  });

  it("never returns potentially_feasible when information is missing", () => {
    const a = assessFeasibility(
      { ...baseSpec, deadline_in_days: null },
      snap({ comparablePrices: { min: 0, avg: 0, max: 0, count: 0 } }),
    );
    expect(a.status).not.toBe("potentially_feasible");
    expect(a.missing.length).toBeGreaterThan(0);
  });

  it("warns about low-stock materials instead of assuming availability", () => {
    const a = assessFeasibility(
      baseSpec,
      snap({
        materials: [
          {
            name: "Kouna grass (dried, twisted)",
            unit: "kg",
            quantity: 8,
            low_stock_threshold: 12,
            updated_at: new Date().toISOString(),
          },
        ],
      }),
    );
    expect(a.reasons.join(" ")).toContain("low-stock");
  });
});
