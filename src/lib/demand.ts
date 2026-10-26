/**
 * Demand-informed planning — aggregates distinct recorded signals per product.
 * Views, saves, enquiries and purchases stay separate: each is a different
 * strength of evidence, and no single "interest score" is invented.
 */

export interface SignalRow {
  product_id: string;
  signal_type: string;
}

export interface DemandSummary {
  views: number;
  saves: number;
  enquiries: number;
  purchases: number;
}

export function summarizeDemand(
  productId: string,
  signals: SignalRow[],
  orders: { product_id?: string | null; product?: { id?: string } | null }[],
): DemandSummary {
  const views = signals.filter((s) => s.product_id === productId && s.signal_type === "view").length;
  const saves = signals.filter((s) => s.product_id === productId && s.signal_type === "save").length;
  const enquiries = signals.filter((s) => s.product_id === productId && s.signal_type === "enquiry").length;
  const purchases = orders.filter((o) => o.product_id === productId).length;
  return { views, saves, enquiries, purchases };
}
