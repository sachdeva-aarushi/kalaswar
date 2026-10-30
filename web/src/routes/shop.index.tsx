/**
 * /shop (index) — Public shop listing
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useProductList } from "@/features/products/hooks";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";

export const Route = createFileRoute("/shop/")({
  head: () => ({ meta: [{ title: "Shop All Crafts — Kalaswar" }] }),
  component: ShopIndex,
});

function ShopIndex() {
  const { data, isLoading, isError, error, refetch } = useProductList({ status: "published" });

  return (
    <div className="space-y-[var(--kw-space-xl)] max-w-6xl mx-auto">
      <div>
        <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">Shop All Crafts</h1>
        <p className="mt-2 kw-body-lg text-[var(--kw-on-surface-variant)]">
          Handcrafted by women artisan collectives across India. Every piece names its maker.
        </p>
      </div>

      {isLoading ? (
        <KwLoadingState label="Loading crafts…" />
      ) : isError ? (
        <KwErrorState
          title="Could not load products"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : !data?.items?.length ? (
        <KwEmptyState
          title="No products available"
          description="The collection is being prepared. Check back soon."
          action={
            <Link to="/" className="kw-btn kw-btn-primary inline-flex">
              Browse the catalogue
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-[var(--kw-space-lg)] sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((product) => (
            <article key={product.id} className="kw-card flex flex-col gap-3">
              <div className="aspect-[4/3] rounded-[var(--kw-radius)] bg-[var(--kw-surface-container)] flex items-center justify-center overflow-hidden">
                {product.cloudinary_public_id ? (
                  <img
                    src={`https://res.cloudinary.com/kalaswar/image/upload/f_auto,q_auto,w_400/${product.cloudinary_public_id}`}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">No image</span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">{product.name}</h2>
                {product.description && (
                  <p className="mt-1 kw-body-sm text-[var(--kw-on-surface-variant)] line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                {product.price_inr != null && (
                  <span className="kw-label-md text-[var(--kw-primary-container)] tabular-nums">
                    ₹{product.price_inr.toLocaleString("en-IN")}
                  </span>
                )}
                <Link to="/auth" search={{ redirect: undefined }} className="kw-btn kw-btn-secondary h-8 text-xs">
                  Add to cart
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
