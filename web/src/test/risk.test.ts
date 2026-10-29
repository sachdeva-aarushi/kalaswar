import { describe, expect, it } from "vitest";
import { assessOrderRisk } from "../lib/risk";

const today = new Date("2026-10-26T00:00:00Z");
const days = (n: number) => new Date(today.getTime() + n * 86400000).toISOString();

describe("assessOrderRisk", () => {
  it("flags overdue work as high risk, but only while not already delayed", () => {
    expect(
      assessOrderRisk({ status: "in_production", expected_dispatch_at: days(-2), assigned: true }, { today }),
    ).toMatchObject({ level: "high", reasons: ["overdue"] });
    expect(
      assessOrderRisk({ status: "delayed", expected_dispatch_at: days(-2), assigned: true }, { today }),
    ).toMatchObject({ level: "low", reasons: [] });
  });

  it("warns when the deadline is within the lead window", () => {
    const r = assessOrderRisk(
      { status: "in_production", expected_dispatch_at: days(2), assigned: true },
      { today, leadDays: 3 },
    );
    expect(r.level).toBe("medium");
    expect(r.reasons).toContain("due_soon");
    expect(r.daysRemaining).toBe(2);
  });

  it("flags pending work with nobody assigned", () => {
    const r = assessOrderRisk(
      { status: "pending", expected_dispatch_at: days(10), assigned: false },
      { today },
    );
    expect(r.level).toBe("medium");
    expect(r.reasons).toEqual(["unassigned"]);
  });

  it("clears work that is assigned with a comfortable deadline", () => {
    const r = assessOrderRisk(
      { status: "in_production", expected_dispatch_at: days(14), assigned: true },
      { today },
    );
    expect(r.level).toBe("low");
    expect(r.reasons).toEqual([]);
  });

  it("never invents a deadline when none is recorded", () => {
    const r = assessOrderRisk({ status: "pending", expected_dispatch_at: null, assigned: true }, { today });
    expect(r.daysRemaining).toBeNull();
    expect(r.reasons).toEqual([]);
  });

  it("delivered orders always come back clear", () => {
    const r = assessOrderRisk(
      { status: "delivered", expected_dispatch_at: days(-9), assigned: true },
      { today },
    );
    expect(r).toEqual({ level: "low", reasons: [], daysRemaining: null });
  });
});
