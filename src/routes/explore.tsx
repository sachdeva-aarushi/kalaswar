import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { productsQuery } from "@/lib/data";
import { CATEGORIES } from "@/lib/constants";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { ProductCard } from "@/components/product-card";
import { DemoNote } from "@/components/demo-note";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ExploreSearch {
  category?: string | undefined;
  q?: string | undefined;
  sort?: string | undefined;
}

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    ...(typeof search["category"] === "string" ? { category: search["category"] } : {}),
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
    ...(typeof search["sort"] === "string" ? { sort: search["sort"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Explore Crafts — Kalaswar" },
      {
        name: "description",
        content:
          "Browse handmade pieces from India's women artisan collectives — woven baskets, textiles, paintings and clay, each naming its maker.",
      },
      { property: "og:title", content: "Explore Crafts — Kalaswar" },
      {
        property: "og:description",
        content: "Handmade pieces from India's women artisan collectives.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(productsQuery({}));
  },
  component: ExplorePage,
});

function ExplorePage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { category = "all", q = "", sort } = Route.useSearch();
  const [searchText, setSearchText] = useState(q);

  useEffect(() => setSearchText(q), [q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchText !== q) {
        navigate({
          to: "/explore",
          search: (prev: ExploreSearch) => ({
            ...prev,
            ...(searchText ? { q: searchText } : {}),
          }),
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchText, q, navigate]);

  const { data: products, isPending } = useSuspenseQuery(
    productsQuery({
      category,
      ...(q ? { search: q } : {}),
      ...(sort === "price_asc" || sort === "price_desc" ? { sort } : {}),
    }),
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-28 md:px-6 md:pt-32">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl text-foreground md:text-5xl">{t("explore_title")}</h1>
          <p className="mt-4 text-muted-foreground">{t("explore_sub")}</p>
        </header>

        {/* Search + sort */}
        <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t("explore_search")}
              aria-label={t("explore_search")}
              className="h-11 pl-9"
            />
          </div>
          <Select
            value={sort ?? "default"}
            onValueChange={(v) =>
              navigate({
                to: "/explore",
                search: (prev: ExploreSearch) => ({
                  ...prev,
                  ...(v !== "default" ? { sort: v } : {}),
                }),
              })
            }
          >
            <SelectTrigger className="h-11 w-full md:w-52" aria-label={t("explore_sort")}>
              <SelectValue placeholder={t("explore_sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">{t("explore_sort")}</SelectItem>
              <SelectItem value="price_asc">{t("sort_price_asc")}</SelectItem>
              <SelectItem value="price_desc">{t("sort_price_desc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category chips */}
        <nav aria-label="Craft categories" className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/explore"
            search={(prev: ExploreSearch) => ({ ...prev, category: undefined })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              category === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:border-primary/50 hover:text-primary",
            )}
          >
            {t("explore_all")}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to="/explore"
              search={(prev: ExploreSearch) => ({ ...prev, category: c })}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:border-primary/50 hover:text-primary",
              )}
            >
              {c}
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("explore_results", { n: products.length })}
          </p>
          <DemoNote className="justify-end">{t("demo_note")}</DemoNote>
        </div>

        {/* Grid */}
        {isPending ? (
          <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/5] w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-16 border-t border-border pt-16 text-center">
            <p className="font-display text-2xl text-foreground">{t("explore_empty")}</p>
            <Link to="/explore" search={{}} className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
              {t("explore_all")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 8) * 0.05}>
                <ProductCard product={p} priority={i < 4} />
              </Reveal>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
