import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useLang } from "@/lib/i18n";
import { artisansQuery, ordersQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shg/artisans")({
  head: () => ({ meta: [{ title: "Artisans — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(artisansQuery());
    void context.queryClient.ensureQueryData(ordersQuery());
  },
  component: ShgArtisans,
});

function ShgArtisans() {
  const { t } = useLang();
  const { data: artisans } = useSuspenseQuery(artisansQuery());
  const { data: orders } = useSuspenseQuery(ordersQuery());

  const workload = new Map<string, { assignments: number; units: number }>();
  for (const o of orders) {
    if (o.status !== "in_production" && o.status !== "ready_for_dispatch") continue;
    if (!o.artisan) continue;
    const w = workload.get(o.artisan.id) ?? { assignments: 0, units: 0 };
    w.assignments += 1;
    w.units += o.quantity;
    workload.set(o.artisan.id, w);
  }

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("shg_artisans")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("explore_results", { n: artisans.length })}
        </p>
      </header>

      <ul className="mt-8 divide-y divide-border border-y border-border">
        {artisans.map((a) => {
          const w = workload.get(a.id) ?? { assignments: 0, units: 0 };
          return (
            <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              {a.photo_url && (
                <img
                  src={a.photo_url}
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to="/artisan/$id"
                  params={{ id: a.id }}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {a.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {a.craft} · {a.shg?.name}
                </p>
              </div>
              <div className="flex gap-6 text-sm sm:justify-end">
                <div>
                  <p className="font-display text-xl tabular-nums text-foreground">
                    {w.assignments}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("artisans_active")}</p>
                </div>
                <div>
                  <p
                    className={cn(
                      "font-display text-xl tabular-nums",
                      w.units > 15 ? "text-terracotta" : "text-foreground",
                    )}
                  >
                    {w.units}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("artisans_workload")}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
