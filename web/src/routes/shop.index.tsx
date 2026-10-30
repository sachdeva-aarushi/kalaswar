/**
 * /shop (index) — Public Craft Catalog with Filters & Pagination
 *
 * Scoped under .kw-app styling tokens.
 * Flow 1:
 * - Real API integration with GET /api/v1/products?category=...&search=...&page=...&page_size=...
 * - Dynamic category pills, search input, price range filter, and in-stock toggle
 * - Paginated navigation with total pages and record count
 * - 1-Click "Add to Cart" calling real cart API and opening CartDrawer
 * - Links to detailed craft story page (/product/$id)
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Filter,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
} from "lucide-react";
import { useProductList } from "@/features/products/hooks";
import { useAddToCart } from "@/features/cart/hooks";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { KwLoadingState, KwErrorState, KwEmptyState, KwProductGridSkeleton } from "@/components/kw-primitives";

export const Route = createFileRoute("/shop/")({
  head: () => ({ meta: [{ title: "Craft Catalog — Kalaswar" }] }),
  component: ShopIndex,
});

const CATEGORIES = [
  "All",
  "Home Decor",
  "Textiles & Apparel",
  "Paintings & Folk Art",
  "Natural Fiber Crafts",
  "Pottery & Terracotta",
] as const;

function ShopIndex() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const addToCart = useAddToCart();

  const { data, isLoading, isError, error, refetch } = useProductList({
    page: currentPage,
    category: selectedCategory !== "All" ? selectedCategory : undefined,
    search: searchTerm.trim() || undefined,
    status: "published",
  });

  const allItems = data?.items ?? [];
  // Client-side price bounds & availability filter if backend query params are loose
  const filteredItems = allItems.filter((item) => {
    const price = item.price ?? item.price_inr ?? 0;
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;
    if (onlyAvailable && !item.availability) return false;
    return true;
  });

  const totalPages = data?.total_pages ?? Math.max(1, Math.ceil((data?.total ?? filteredItems.length) / 20));

  const handleAddToCart = async (product: (typeof allItems)[0]) => {
    try {
      await addToCart.mutateAsync({
        product_id: product.id,
        quantity: 1,
      });
      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 2000);
      setCartDrawerOpen(true);
    } catch (err) {
      console.error("Add to cart failed:", err);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSearchTerm("");
    setMinPrice("");
    setMaxPrice("");
    setOnlyAvailable(false);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-[var(--kw-space-xl)] max-w-7xl mx-auto px-2 sm:px-4">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="kw-badge kw-badge-primary">GI Certified</span>
            <span className="text-xs text-[var(--kw-on-surface-variant)]">100% Artisan Direct</span>
          </div>
          <h1 className="kw-headline-xl text-[var(--kw-on-surface)] mt-1">Discover Handcrafted Heritage</h1>
          <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)] max-w-2xl">
            Authentic crafts preserved by rural women collectives across West Bengal, Bihar, and Maharashtra. Every piece names its maker.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/gift" className="kw-btn kw-btn-secondary h-10 text-xs">
            <Sparkles className="size-3.5 mr-1 text-[var(--kw-primary)]" />
            <span>Commission Bespoke Gift</span>
          </Link>
          <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
        </div>
      </div>

      {/* ── Filters & Search Bar ─────────────────────────────────────────── */}
      <div className="kw-card p-4 space-y-4 border border-[var(--kw-outline-variant)]">
        {/* Search & Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-[var(--kw-on-surface-variant)]" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Search crafts by name, technique or material"
              placeholder="Search by craft, silk, wood, motif…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-xs text-[var(--kw-on-surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--kw-primary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Minimum price in Indian Rupees"
              placeholder="Min ₹"
              className="w-1/2 h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-xs text-[var(--kw-on-surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--kw-primary)]"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Maximum price in Indian Rupees"
              placeholder="Max ₹"
              className="w-1/2 h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-xs text-[var(--kw-on-surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--kw-primary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="size-4 rounded accent-[var(--kw-primary)]"
              />
              <span>In-Stock Only</span>
            </label>
          </div>

          <div className="flex justify-end items-center">
            {(selectedCategory !== "All" || searchTerm || minPrice || maxPrice || onlyAvailable) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[var(--kw-primary)] hover:underline font-semibold"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-xs text-[var(--kw-on-surface-variant)] font-semibold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="size-3.5" />
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-[var(--kw-primary)] text-white shadow-xs"
                  : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container-high)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Grid ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <KwProductGridSkeleton count={8} />
      ) : isError ? (
        <KwErrorState
          title="Could not load products"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : filteredItems.length === 0 ? (
        <KwEmptyState
          title="No crafts match your filter"
          description="Try broadening your search term or clearing price filters."
          action={
            <button
              type="button"
              onClick={handleResetFilters}
              className="kw-btn kw-btn-primary h-9 text-xs mt-2"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[var(--kw-space-md)]">
          {filteredItems.map((product) => {
            const title = product.title || product.name || "Handcrafted Heritage";
            const price = product.price ?? product.price_inr ?? 0;
            const isAdded = addedProductId === product.id;

            return (
              <article
                key={product.id}
                className="kw-card p-4 flex flex-col justify-between border border-[var(--kw-outline-variant)] hover:shadow-md transition-shadow group"
              >
                <div className="space-y-3">
                  {/* Image container */}
                  <div className="relative aspect-4/3 rounded-lg bg-[var(--kw-surface-container)] overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Handmade Craft
                      </div>
                    )}

                    {/* GI Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-amber-900 border border-amber-200">
                      <ShieldCheck className="size-3 text-emerald-600" aria-hidden="true" />
                      <span>GI Origin</span>
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold">
                      {product.category || "Craft"}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <Link
                      to="/product/$id"
                      params={{ id: product.id }}
                      className="kw-headline-sm text-sm font-bold text-[var(--kw-on-surface)] group-hover:text-[var(--kw-primary)] line-clamp-1"
                    >
                      {title}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--kw-on-surface-variant)] line-clamp-2 leading-relaxed">
                      {product.description || "Authentic handcrafted craft by certified rural artisan collectives."}
                    </p>
                  </div>
                </div>

                {/* Price & Action Row */}
                <div className="pt-4 mt-3 border-t border-[var(--kw-outline-variant)] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Living Price</span>
                    <span className="font-bold text-base text-[var(--kw-primary)] tabular-nums">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/product/$id"
                      params={{ id: product.id }}
                      className="size-8 rounded-lg border border-[var(--kw-outline-variant)] flex items-center justify-center text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)]"
                      title={`View craft details for ${title}`}
                      aria-label={`View craft details for ${title}`}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      disabled={addToCart.isPending}
                      onClick={() => void handleAddToCart(product)}
                      aria-label={`Add ${title} to cart`}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                        isAdded
                          ? "bg-emerald-600 text-white"
                          : "kw-btn kw-btn-primary"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="size-3.5" aria-hidden="true" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="size-3.5" aria-hidden="true" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Pagination Controls ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--kw-outline-variant)] pt-4">
          <p className="text-xs text-[var(--kw-on-surface-variant)]">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="kw-btn kw-btn-secondary h-8 px-2.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5 mr-0.5" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="kw-btn kw-btn-secondary h-8 px-2.5 text-xs disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
