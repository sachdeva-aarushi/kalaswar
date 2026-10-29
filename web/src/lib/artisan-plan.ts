/**
 * Deterministic weekly plan for an artisan's assigned work.
 * Buckets come only from recorded fields: assignment, expected dispatch date,
 * and status. Nothing is inferred from prose.
 */

export interface PlanOrder {
  id: string;
  status: string;
  expected_dispatch_at: string | null;
  quantity: number;
  product_name?: string | null;
  customer_reference?: string | null;
}

export interface PlanBucket {
  overdue: PlanOrder[];
  thisWeek: PlanOrder[];
  later: PlanOrder[];
  done: PlanOrder[];
}

const DONE_STATUSES = new Set(["delivered", "dispatched"]);

export function planAssignedWork(
  orders: PlanOrder[],
  today: Date = new Date(),
): PlanBucket {
  const bucket: PlanBucket = { overdue: [], thisWeek: [], later: [], done: [] };
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 7);

  for (const o of orders) {
    if (DONE_STATUSES.has(o.status)) {
      bucket.done.push(o);
      continue;
    }
    if (!o.expected_dispatch_at) {
      bucket.thisWeek.push(o); // undated work still needs attention
      continue;
    }
    const due = new Date(o.expected_dispatch_at);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    if (dueDay < start) bucket.overdue.push(o);
    else if (dueDay <= weekEnd) bucket.thisWeek.push(o);
    else bucket.later.push(o);
  }
  for (const key of ["overdue", "thisWeek", "later", "done"] as const) {
    bucket[key].sort((a, b) => {
      const ad = a.expected_dispatch_at ?? "9999-12-31";
      const bd = b.expected_dispatch_at ?? "9999-12-31";
      return ad.localeCompare(bd);
    });
  }
  return bucket;
}
