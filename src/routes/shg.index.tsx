import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useLang, statusLabel } from "@/lib/i18n";
import { allOrderEventsQuery, artisansQuery, ordersQuery, paymentsQuery, shgsQuery } from "@/lib/data";
import { computeShgRanking } from "@/lib/ranking";
import { formatDate } from "@/lib/money";
import { DemoNote } from "@/components/demo-note";
import type { OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/shg/")({
  head: () => ({
    meta: [{ title: "Overview — Coordinator Workspace — Kalaswar" }],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(artisansQuery());
    void context.queryClient.ensureQueryData(shgsQuery());
    void context.queryClient.ensureQueryData(paymentsQuery());
    void context.queryClient.ensureQueryData(allOrderEventsQuery());
  },
  component: ShgOverview,
});

function ShgOverview() {
  const { t } = useLang();
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: artisans } = useSuspenseQuery(artisansQuery());
  const { data: shgs } = useSuspenseQuery(shgsQuery());
  const { data: payments } = useSuspenseQuery(paymentsQuery());
  const { data: allEvents } = useSuspenseQuery(allOrderEventsQuery());

  const ranking = computeShgRanking(
    shgs.map((s) => ({ id: s.id, name: s.name, region: s.region })),
    orders,
    allEvents,
    payments,
  );

  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const activeArtisans = new Set(
    orders
      .filter((o) => o.status === "in_production" || o.status === "ready_for_dispatch")
      .flatMap((o) => (o.artisan ? [o.artisan.id] : [])),
  ).size;

  const kpis: { label: string; value: number; tone?: "alert" | undefined }[] = [
    { label: t("kpi_total"), value: orders.length },
    { label: t("kpi_awaiting"), value: count("pending") },
    { label: t("kpi_production"), value: count("in_production") },
    { label: t("kpi_ready"), value: count("ready_for_dispatch") },
    { label: t("kpi_delayed"), value: count("delayed"), tone: count("delayed") > 0 ? "alert" : undefined },
    { label: t("kpi_artisans"), value: activeArtisans },
  ];

  // Recent activity: latest assignments and new orders, merged chronologically.
  const events: { at: number; text: string; sub: string }[] = [];
  for (const o of orders) {
    events.push({
      at: new Date(o.created_at).getTime(),
      text: o.customer_reference,
      sub: `${o.product?.name ?? ""} × ${o.quantity} — ${statusLabel(t, o.status)}`,
    });
    const latest = o.assignments?.[0];
    if (latest?.artisan) {
      events.push({
        at: new Date(latest.assigned_at).getTime(),
        text: o.customer_reference,
        sub: `${t("assigned_to")} ${latest.artisan.name}`,
      });
    }
  }
  events.sort((a, b) => b.at - a.at);

  return (
    <div>
      <header>
        <p className="kicker text-terracotta">{t("shg_workspace")}</p>
        <h1 className="mt-2 font-display text-3xl text-foreground md:text-4xl">{t("shg_overview")}</h1>
      </header>

      <section aria-label={t("kpi_total")} className="mt-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card p-5">
            <p
              className={`font-display text-4xl tabular-nums ${
                k.tone === "alert" ? "text-terracotta" : "text-foreground"
              }`}
            >
              {k.value}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">{t("rank_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("rank_sub")}</p>
        <ol className="mt-4 space-y-3">
          {ranking.map((r, i) => (
            <li key={r.shgId} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.region}</p>
                  </div>
                </div>
                <p className="font-display text-3xl tabular-nums text-foreground">
                  {r.score}
                  <span className="ml-1 text-xs text-muted-foreground">/100</span>
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("rank_ontime")}</dt>
                  <dd className="mt-0.5 tabular-nums text-foreground">
                    {Math.round(r.onTimeRate * 100)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("rank_fairness")}</dt>
                  <dd className="mt-0.5 tabular-nums text-foreground">
                    {Math.round(r.fairnessRate * 100)}%
                  </dd>
                </div>
              </dl>
            </li>
          ))}
          {ranking.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">{t("app_none")}</li>
          )}
        </ol>
        <DemoNote className="mt-3">{t("rank_note")}</DemoNote>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">{t("kpi_activity")}</h2>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {events.slice(0, 7).map((e, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{e.text}</p>
                <p className="truncate text-sm text-muted-foreground">{e.sub}</p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">{formatDate(new Date(e.at))}</time>
            </li>
          ))}
          {events.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">{t("app_none")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}
