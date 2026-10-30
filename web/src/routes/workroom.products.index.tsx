/**
 * /workroom/products — Products list for coordinators
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useProductList, usePublishProduct } from "@/features/products/hooks";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";
import { Plus, Package } from "lucide-react";

export const Route = createFileRoute("/workroom/products/")({
  head: () => ({
    meta: [{ title: "Products — Kalaswar Workroom" }],
  }),
  component: WorkroomProductsList,
});

function WorkroomProductsList() {
  const { data, isLoading, isError, error, refetch } = useProductList();
  const publish = usePublishProduct();

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Products</h1>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Verified artisan catalog, pricing calculations, and draft listings.
          </p>
        </div>
        <Link
          to="/workroom/products/new"
          className="kw-btn kw-btn-primary h-10 text-xs inline-flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="size-4" />
          <span>New Product</span>
        </Link>
      </div>

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
          action={
            <Link to="/workroom/products/new" className="kw-btn kw-btn-primary h-10 text-xs mt-2">
              Create First Product
            </Link>
          }
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>Name / Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Price (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => {
                const name = product.title || product.name || "Handcrafted Item";
                const price = product.price ?? product.price_inr;
                return (
                  <tr key={product.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                    <td className="kw-body-md font-semibold text-[var(--kw-primary)]">{name}</td>
                    <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">{product.category || "Textiles"}</td>
                    <td>
                      <span
                        className={`kw-badge ${
                          product.status === "published"
                            ? "kw-badge-success"
                            : product.status === "draft"
                            ? "kw-badge-warning"
                            : "kw-badge-neutral"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="kw-body-md font-medium tabular-nums">
                      {price != null ? `₹${price.toLocaleString("en-IN")}` : "–"}
                    </td>
                    <td>
                      {product.status === "draft" ? (
                        <button
                          type="button"
                          className="kw-btn kw-btn-primary h-8 text-xs"
                          disabled={publish.isPending}
                          onClick={() => void publish.mutate(product.id)}
                        >
                          Publish
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--kw-primary)] font-medium">Published</span>
                      )}
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
