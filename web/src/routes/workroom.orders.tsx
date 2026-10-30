/**
 * /workroom/orders — Orders list for coordinators
 */

import { createFileRoute } from "@tanstack/react-router";
import { useOrderList } from "@/features/orders/hooks";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";

export const Route = createFileRoute("/workroom/orders")({
  head: () => ({
    meta: [{ title: "Orders — Kalaswar Workroom" }],
  }),
  component: WorkroomOrders,
});

function WorkroomOrders() {
  const { data, isLoading, isError, error, refetch } = useOrderList();

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Orders</h1>

      {isLoading ? (
        <KwLoadingState label="Loading orders…" />
      ) : isError ? (
        <KwErrorState
          title="Could not load orders"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : !data?.items?.length ? (
        <KwEmptyState
          title="No orders yet"
          description="Orders will appear here once customers place them."
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Amount (₹)</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order.id}>
                  <td className="kw-body-md font-mono text-xs">{order.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`kw-badge ${
                      order.status === "completed" ? "kw-badge-success" :
                      order.status === "pending" ? "kw-badge-warning" :
                      "kw-badge-neutral"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="kw-body-md">{order.quantity}</td>
                  <td className="kw-body-md-med tabular-nums">
                    {order.total_amount_inr != null
                      ? `₹${order.total_amount_inr.toLocaleString("en-IN")}`
                      : "–"}
                  </td>
                  <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN") : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
