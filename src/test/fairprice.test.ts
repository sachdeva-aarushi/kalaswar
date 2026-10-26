import { describe, expect, it } from "vitest";
import { computeFairPrice, diffAgainstSnapshot } from "@/lib/fairprice";

const base = {
  materials: [{ name: "Jute fabric", quantityPerUnit: 2, unit: "m", unitCostInr: 40 }],
  labourStages: [{ name: "Stitching", hoursPerUnit: 4, rateInrPerHour: 60 }],
};

describe("computeFairPrice", () => {
  it("computes material cost with wastage", () => {
    const r = computeFairPrice({
      materials: [{ name: "Fabric", quantityPerUnit: 2, unit: "m", unitCostInr: 40, wastagePercent: 10 }],
      labourStages: base.labourStages,
      targetMarginPercent: 30,
    });
    expect(r.materialCost).toBe(88); // 2 × 40 × 1.10
  });

  it("includes recorded labour in the production cost", () => {
    const r = computeFairPrice({ ...base, targetMarginPercent: 30 });
    // materials 80 + labour 240 = 320
    expect(r.labourCost).toBe(240);
    expect(r.productionCost).toBe(320);
  });

  it("refuses to suggest a price when a labour rate is missing — labour is never free", () => {
    const r = computeFairPrice({
      materials: base.materials,
      labourStages: [{ name: "Embroidery", hoursPerUnit: 6, rateInrPerHour: null }],
      targetMarginPercent: 30,
    });
    expect(r.incomplete).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.suggested).toBeNull();
    expect(r.missing.some((m) => m.includes("Labour rate"))).toBe(true);
    expect(r.labourLines[0]?.rateMissing).toBe(true);
  });

  it("reports missing labour hours instead of inventing them", () => {
    const r = computeFairPrice({ materials: base.materials, labourStages: [], targetMarginPercent: 30 });
    expect(r.missing.some((m) => m.startsWith("Labour hours"))).toBe(true);
    expect(r.valid).toBe(false);
  });

  it("keeps margin and markup distinct", () => {
    const margin = computeFairPrice({ ...base, targetMarginPercent: 25 });
    const markup = computeFairPrice({ ...base, markupPercent: 25 });
    // margin: 320 / 0.75 = 426.67 ; markup: 320 × 1.25 = 400
    expect(margin.priceMode).toBe("margin");
    expect(margin.suggested).toBeCloseTo(426.67, 2);
    expect(markup.priceMode).toBe("markup");
    expect(markup.suggested).toBe(400);
    expect(margin.suggested).not.toBe(markup.suggested);
  });

  it("applies a percentage platform fee on the final selling price", () => {
    const r = computeFairPrice({ ...base, targetMarginPercent: 20, platformFeePercent: 10 });
    // 320 / (1 − 0.20 − 0.10) = 457.14 ; fee = 45.71
    expect(r.suggested).toBeCloseTo(457.14, 2);
    expect(r.platformFee).toBeCloseTo(45.71, 2);
    expect(r.estimatedEarningsPerUnit).toBeCloseTo(457.14 - 320 - 45.71, 2);
  });

  it("rejects a 100% margin", () => {
    const r = computeFairPrice({ ...base, targetMarginPercent: 100 });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/100%/);
  });

  it("sums the breakdown to the production cost exactly", () => {
    const r = computeFairPrice({
      ...base,
      packagingPerUnitInr: 12.5,
      overheadPercent: 10,
      otherPerUnitInr: 5,
      logisticsPerUnitInr: 20,
      targetMarginPercent: 30,
    });
    const sum = r.materialCost + r.labourCost + r.packaging + r.overhead + r.other + r.logistics;
    expect(r.productionCost).toBeCloseTo(sum, 2);
  });

  it("is decimal-safe: paise arithmetic has no float drift", () => {
    const r = computeFairPrice({
      materials: [{ name: "Beads", quantityPerUnit: 3, unitCostInr: 13.33 }],
      labourStages: [{ name: "Stringing", hoursPerUnit: 1.5, rateInrPerHour: 45.55 }],
      targetMarginPercent: 0,
    });
    // 3 × 13.33 = 39.99 ; 1.5 × 45.55 lands at 68.324999… in binary float,
    // so the engine's single per-line paise rounding yields 68.32.
    expect(r.materialCost).toBe(39.99);
    expect(r.labourCost).toBe(68.32);
    expect(r.productionCost).toBe(108.31);
  });

  it("warns on a stage with zero hours instead of skipping it silently", () => {
    const r = computeFairPrice({
      ...base,
      labourStages: [...base.labourStages, { name: "Finishing", hoursPerUnit: 0, rateInrPerHour: 50 }],
      targetMarginPercent: 30,
    });
    expect(r.warnings.some((w) => w.includes("Finishing"))).toBe(true);
  });

  it("shows a floor that recovers costs under a platform fee", () => {
    const r = computeFairPrice({ ...base, platformFeePercent: 5, markupPercent: 0 });
    // floor = 320 / 0.95 = 336.84
    expect(r.floor).toBeCloseTo(336.84, 2);
  });
});

describe("diffAgainstSnapshot", () => {
  it("flags changed production cost without mutating anything", () => {
    expect(
      diffAgainstSnapshot({ productionCost: 320, suggested: 426.67 }, { productionCost: 350, suggested: 426.67 }),
    ).toEqual({ productionCostChanged: true, suggestedChanged: false });
  });

  it("treats null and a number as different", () => {
    expect(diffAgainstSnapshot({ productionCost: null, suggested: null }, { productionCost: 100, suggested: 130 }).productionCostChanged).toBe(true);
  });

  it("ignores paise-level float noise", () => {
    expect(diffAgainstSnapshot({ productionCost: 320.001, suggested: null }, { productionCost: 320.0009, suggested: null }).productionCostChanged).toBe(false);
  });
});
