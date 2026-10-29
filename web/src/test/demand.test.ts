import { describe, expect, it } from "vitest";
import { summarizeDemand } from "../lib/demand";

describe("summarizeDemand", () => {
  const signals = [
    { product_id: "p1", signal_type: "view" },
    { product_id: "p1", signal_type: "view" },
    { product_id: "p1", signal_type: "save" },
    { product_id: "p1", signal_type: "enquiry" },
    { product_id: "p2", signal_type: "view" },
  ];
  const orders = [{ product_id: "p1" }, { product_id: "p1" }, { product_id: "p2" }];

  it("keeps views, saves, enquiries and purchases as distinct counts", () => {
    expect(summarizeDemand("p1", signals, orders)).toEqual({
      views: 2,
      saves: 1,
      enquiries: 1,
      purchases: 2,
    });
  });

  it("never merges a purchase into a softer signal", () => {
    const s = summarizeDemand("p2", signals, orders);
    expect(s.purchases).toBe(1);
    expect(s.enquiries).toBe(0);
  });

  it("returns zeros for a piece nobody has seen", () => {
    expect(summarizeDemand("p9", signals, orders)).toEqual({
      views: 0,
      saves: 0,
      enquiries: 0,
      purchases: 0,
    });
  });
});
