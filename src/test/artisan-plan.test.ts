import { describe, expect, it } from "vitest";
import { planAssignedWork } from "../lib/artisan-plan";

const today = new Date("2026-10-26T10:00:00Z");

const o = (
  id: string,
  expected_dispatch_at: string | null,
  status = "in_production",
) => ({ id, expected_dispatch_at, status, quantity: 1 });

describe("planAssignedWork", () => {
  it("buckets work by recorded dispatch dates", () => {
    const plan = planAssignedWork(
      [
        o("past", "2026-10-20"),
        o("in-week", "2026-10-30"),
        o("beyond", "2026-11-20"),
        o("nodate", null),
        o("done", "2026-10-21", "delivered"),
      ],
      today,
    );
    expect(plan.overdue.map((x) => x.id)).toEqual(["past"]);
    expect(plan.thisWeek.map((x) => x.id)).toEqual(["in-week", "nodate"]);
    expect(plan.later.map((x) => x.id)).toEqual(["beyond"]);
    expect(plan.done.map((x) => x.id)).toEqual(["done"]);
  });

  it("treats today and day 7 as this week", () => {
    const plan = planAssignedWork([o("a", "2026-10-26"), o("b", "2026-11-02")], today);
    expect(plan.thisWeek.map((x) => x.id)).toEqual(["a", "b"]);
    expect(plan.overdue).toEqual([]);
    expect(plan.later).toEqual([]);
  });

  it("sorts each bucket soonest-first", () => {
    const plan = planAssignedWork([o("late", "2026-10-29"), o("soon", "2026-10-27")], today);
    expect(plan.thisWeek.map((x) => x.id)).toEqual(["soon", "late"]);
  });

  it("keeps an empty plan empty", () => {
    expect(planAssignedWork([], today)).toEqual({
      overdue: [],
      thisWeek: [],
      later: [],
      done: [],
    });
  });
});
