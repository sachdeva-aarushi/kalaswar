import { describe, expect, it } from "vitest";
import { estimatePrice } from "../lib/price-estimate";
import { matchCraftGuides } from "../lib/guides";
import type { CraftGuide } from "../lib/types";

describe("estimatePrice", () => {
  it("adds materials, labour, overhead, then margin — in that order", () => {
    const e = estimatePrice({
      materialsCost: 100,
      labourHours: 4,
      labourRatePerHour: 50,
      overheadPercent: 10,
      marginPercent: 30,
    });
    expect(e.materials).toBe(100);
    expect(e.labour).toBe(200);
    expect(e.overhead).toBe(30);
    expect(e.subtotal).toBe(330);
    expect(e.margin).toBe(99);
    expect(e.suggested).toBe(429);
    expect(e.floor).toBe(330);
  });

  it("refuses to suggest a price when labour is unrecorded", () => {
    const e = estimatePrice({
      materialsCost: 100,
      labourHours: 0,
      labourRatePerHour: 50,
      overheadPercent: 10,
      marginPercent: 30,
    });
    expect(e.valid).toBe(false);
    expect(e.missing).toContain("hours");
    expect(e.suggested).toBe(0);
  });

  it("flags a missing wage rate separately from missing hours", () => {
    const e = estimatePrice({
      materialsCost: 100,
      labourHours: 3,
      labourRatePerHour: 0,
      overheadPercent: 0,
      marginPercent: 0,
    });
    expect(e.valid).toBe(false);
    expect(e.missing).toEqual(["rate"]);
  });

  it("treats zero overhead and margin as cost recovery, not an error", () => {
    const e = estimatePrice({
      materialsCost: 200,
      labourHours: 2,
      labourRatePerHour: 100,
      overheadPercent: 0,
      marginPercent: 0,
    });
    expect(e.valid).toBe(true);
    expect(e.suggested).toBe(400);
    expect(e.floor).toBe(400);
  });
});

describe("matchCraftGuides", () => {
  const guides = [
    { title: "Coiling a kouna grass basket", craft: "kouna grass weaving" },
    { title: "Warli painting basics", craft: "warli painting" },
    { title: "Drying and storing grass", craft: "kouna grass weaving" },
  ] as unknown as CraftGuide[];

  it("ranks guides sharing craft tokens above unrelated ones", () => {
    const m = matchCraftGuides(guides, "kouna grass weaving");
    expect(m[0]?.title).toMatch(/kouna grass/i);
    expect(m.some((g) => g.title.includes("Warli"))).toBe(false);
  });

  it("returns nothing when no guide shares the craft — never a distant guess", () => {
    expect(matchCraftGuides(guides, "puppet making")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(matchCraftGuides(guides, "kouna grass weaving", 1)).toHaveLength(1);
  });
});
