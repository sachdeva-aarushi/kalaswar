/**
 * /workroom/orders — Orders list for coordinators
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useOrderList } from "@/features/orders/hooks";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";
import { ArrowRight, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/workroom/orders/")({
  head: () => ({
    meta: [{ title: "Orders — Kalaswar Workroom" }],
  }),
  component: WorkroomOrdersList,
});

function WorkroomOrdersList() {
  const { data, isLoading, isError, error, refetch } = useOrderList();

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Orders</h1>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Manage live batch orders, milestones, artisan assignments and dispatch timelines.
          </p>
        </div>
      </div>

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
          description="Orders will appear here once customers place them or proposals are approved."
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Customer / Client</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Amount (₹)</th>
                <th>Expected Dispatch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => {
                const total = order.total_amount ?? order.total_amount_inr;
                return (
                  <tr key={order.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                    <td className="kw-body-md font-mono text-xs font-semibold text-[var(--kw-primary)]">
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="kw-body-md font-medium">
                      {order.product_title || "Handcrafted Craft Item"}
                    </td>
                    <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                      {order.customer_reference || "Direct Customer"}
                    </td>
                    <td>
                      <span
                        className={`kw-badge ${
                          order.status === "completed" || order.status === "delivered"
                            ? "kw-badge-success"
                            : order.status === "in_production"
                            ? "kw-badge-primary"
                            : order.status === "delayed"
                            ? "kw-badge-danger"
                            : "kw-badge-warning"
                        }`}
                      >
                        {order.status === "in_production"
                          ? "In Production"
                          : order.status === "delayed"
                          ? "At Risk / Delayed"
                          : order.status}
                      </span>
                    </td>
                    <td className="kw-body-md tabular-nums">{order.quantity}</td>
                    <td className="kw-body-md font-semibold tabular-nums">
                      {total != null ? `₹${total.toLocaleString("en-IN")}` : "–"}
                    </td>
                    <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                      {order.expected_dispatch_at
                        ? new Date(order.expected_dispatch_at).toLocaleDateString("en-IN")
                        : "–"}
                    </td>
                    <td>
                      <Link
                        to="/workroom/orders/$id"
                        params={{ id: order.id }}
                        className="kw-btn kw-btn-secondary h-8 text-xs inline-flex items-center gap-1"
                      >
                        <span>Manage</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
