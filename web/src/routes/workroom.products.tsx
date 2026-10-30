/**
 * /workroom/products — Products list for coordinators
 */

import { createFileRoute } from "@tanstack/react-router";
import { useProductList, usePublishProduct } from "@/features/products/hooks";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";

export const Route = createFileRoute("/workroom/products")({
  head: () => ({
    meta: [{ title: "Products — Kalaswar Workroom" }],
  }),
  component: WorkroomProducts,
});

function WorkroomProducts() {
  const { data, isLoading, isError, error, refetch } = useProductList();
  const publish = usePublishProduct();

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Products</h1>

      {isLoading ? (
        <KwLoadingState label="Loading products…" />
      ) : isError ? (
        <KwErrorState
          title="Could not load products"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : !data?.items?.length ? (
        <KwEmptyState
          title="No products yet"
          description="Products drafted via WhatsApp or the workroom will appear here."
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Price (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product.id}>
                  <td className="kw-body-md-med">{product.name}</td>
                  <td>
                    <span className={`kw-badge ${
                      product.status === "published" ? "kw-badge-success" :
                      product.status === "draft" ? "kw-badge-warning" :
                      "kw-badge-neutral"
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="kw-body-md tabular-nums">
                    {product.price_inr != null
                      ? `₹${product.price_inr.toLocaleString("en-IN")}`
                      : "–"}
                  </td>
                  <td>
                    {product.status === "draft" && (
                      <button
                        type="button"
                        className="kw-btn kw-btn-primary h-8 text-xs"
                        disabled={publish.isPending}
                        onClick={() => void publish.mutate(product.id)}
                      >
                        Publish
                      </button>
                    )}
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
