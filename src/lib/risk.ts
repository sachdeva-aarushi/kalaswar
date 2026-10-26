/**
 * Production risk radar — deterministic flags from recorded order data:
 * status, expected dispatch date, quantity, and whether anyone is assigned.
 * Every flag carries the reason it fired; nothing is predicted beyond the
 * recorded deadline and today's date.
 */

export type RiskLevel = "high" | "medium" | "low";

export interface RiskInput {
  status: string;
  /** ISO date string or null when not recorded. */
  expected_dispatch_at: string | null;
  assigned: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  /** Human-readable reasons, one per flag that fired. */
  reasons: string[];
  daysRemaining: number | null;
}

export function assessOrderRisk(
  order: RiskInput,
  opts: { today: Date; leadDays?: number },
): RiskAssessment {
  const leadDays = opts.leadDays ?? 3;

  // Delivered work carries no risk.
  if (order.status === "delivered") return { level: "low", reasons: [], daysRemaining: null };

  const reasons: string[] = [];
  let daysRemaining: number | null = null;

  if (order.expected_dispatch_at) {
    const due = new Date(order.expected_dispatch_at);
    daysRemaining = Math.ceil(
      (due.getTime() - opts.today.getTime()) / 86400000,
    );
    if (daysRemaining < 0 && order.status !== "delayed") {
      reasons.push("overdue");
    } else if (daysRemaining >= 0 && daysRemaining <= leadDays && order.status !== "delayed") {
      reasons.push("due_soon");
    }
  }

  if (!order.assigned && (order.status === "pending" || order.status === "in_production")) {
    reasons.push("unassigned");
  }

  const level: RiskLevel =
    reasons.includes("overdue") ? "high" : reasons.length > 0 ? "medium" : "low";
  return { level, reasons, daysRemaining };
}
