import type { OrderWithDetails, OrderEvent, Payment } from "./types";

/**
 * Pure SHG ranking: on-time delivery + earnings fairness, half and half.
 * No data access — the caller passes records, so the score is testable.
 */

export interface ShgScore {
  shgId: string;
  name: string;
  region: string;
  orders: number;
  onTimeRate: number; // 0..1
  fairnessRate: number; // 0..1
  score: number; // 0..100
}

export interface ShgRef {
  id: string;
  name: string;
  region: string;
}

export function computeShgRanking(
  shgs: ShgRef[],
  orders: OrderWithDetails[],
  events: OrderEvent[],
  payments: Payment[],
): ShgScore[] {
  return shgs
    .map((shg) => {
      const artisanIds = new Set(
        orders.flatMap((o) => (o.artisan && o.artisan.shg_id === shg.id ? [o.artisan.id] : [])),
      );
      const shgOrders = orders.filter((o) => o.artisan && artisanIds.has(o.artisan.id));

      // On-time delivery: delivered orders whose recorded delivery moment is
      // not past the promised dispatch date.
      const deliveredIds = new Set(
        shgOrders.filter((o) => o.status === "delivered").map((o) => o.id),
      );
      const deliveryEvents = events.filter(
        (e) => deliveredIds.has(e.order_id) && e.event_type === "delivered",
      );
      let onTime = 0;
      let counted = 0;
      for (const e of deliveryEvents) {
        const order = shgOrders.find((o) => o.id === e.order_id);
        if (!order?.expected_dispatch_at) continue; // no promise — not counted
        counted += 1;
        if (new Date(e.created_at).getTime() <= new Date(order.expected_dispatch_at).getTime()) {
          onTime += 1;
        }
      }
      const onTimeRate = counted > 0 ? onTime / counted : 0;

      // Earnings fairness: payouts recorded to artisans ÷ customer payments
      // received by the collective, capped at 1.
      const shgOrderIds = new Set(shgOrders.map((o) => o.id));
      const received = payments
        .filter(
          (p) =>
            p.direction === "customer_payment" &&
            ((p.shg_id && p.shg_id === shg.id) || (p.order_id && shgOrderIds.has(p.order_id))),
        )
        .reduce((s, p) => s + Number(p.amount), 0);
      const paidOut = payments
        .filter(
          (p) =>
            p.direction === "artisan_payout" &&
            p.artisan_id !== null &&
            artisanIds.has(p.artisan_id),
        )
        .reduce((s, p) => s + Number(p.amount), 0);
      const fairnessRate = received > 0 ? Math.min(1, paidOut / received) : 0;

      return {
        shgId: shg.id,
        name: shg.name,
        region: shg.region,
        orders: shgOrders.length,
        onTimeRate,
        fairnessRate,
        score: Math.round(onTimeRate * 50 + fairnessRate * 50),
      };
    })
    .sort((a, b) => b.score - a.score || b.onTimeRate - a.onTimeRate);
}
