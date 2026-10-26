import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { formatINR } from "@/lib/money";
import type { ProductWithArtisan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  className,
  priority = false,
}: {
  product: ProductWithArtisan;
  className?: string;
  priority?: boolean;
}) {
  const { t } = useLang();
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className={cn(
        "group block focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            width={1024}
            height={1024}
            loading={priority ? "eager" : "lazy"}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="aspect-[4/5] w-full" aria-hidden="true" />
        )}
        {!product.availability && (
          <span className="absolute left-3 top-3 bg-card px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            {t("unavailable")}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg leading-snug text-foreground group-hover:text-primary">
          {product.name}
        </h3>
        <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
          {formatINR(product.price)}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("by")} {product.artisan?.name}
        {product.shg ? ` · ${product.shg.name}` : ""}
      </p>
    </Link>
  );
}
