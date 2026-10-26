import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { useLang, statusLabel } from "@/lib/i18n";
import { ordersQuery } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/status-badge";
import { DemoNote } from "@/components/demo-note";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your orders — Kalaswar" },
      {
        name: "description",
        content:
          "Every recorded order and its honest journey — assignment, production, quality check, packing and dispatch.",
      },
      { property: "og:title", content: "Your orders — Kalaswar" },
      {
        property: "og:description",
        content: "Every recorded order, with its dated journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(ordersQuery());
  },
  component: OrdersIndex,
});

function OrdersIndex() {
  const { t } = useLang();
  const { data: orders } = useSuspenseQuery(ordersQuery());

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
        <header>
          <p className="kicker text-terracotta">{t("orders_index_kicker")}</p>
          <h1 className="mt-2 font-display text-4xl text-foreground md:text-5xl">
            {t("orders_index_title")}
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
            {t("orders_index_sub")}
          </p>
        </header>

        {orders.length === 0 ? (
          <p className="mt-10 border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
            {t("orders_index_empty")}
          </p>
        ) : (
          <div className="mt-10 grid gap-4">
            {orders.map((o) => (
              <Link
                key={o.id}
                to="/orders/$id"
                params={{ id: o.id }}
                className="group flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {o.product?.name ?? o.customer_reference}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("tbl_qty")}: {o.quantity}
                    {o.product ? ` · ${formatINR(Number(o.product.price))}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("tbl_dispatch")}: {formatDate(o.expected_dispatch_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <ArrowRight
                    className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}

        <DemoNote className="mt-8">{t("ord_demo")}</DemoNote>
      </main>
      <SiteFooter />
    </div>
  );
}
