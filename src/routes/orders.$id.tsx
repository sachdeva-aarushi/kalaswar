import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Truck } from "lucide-react";

import { useLang, statusLabel } from "@/lib/i18n";
import { orderShipmentsQuery, ordersQuery } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/status-badge";
import { OrderRecordTimeline } from "@/components/order-record";
import { DemoNote } from "@/components/demo-note";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Track your order — Kalaswar" },
      {
        name: "description",
        content:
          "Follow a recorded order's journey — production, quality check, packing, dispatch — with honest, dated records.",
      },
      { property: "og:title", content: "Track your order — Kalaswar" },
      {
        property: "og:description",
        content: "Every recorded step of your order, as it happened.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ params, context }) => {
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(orderShipmentsQuery(params.id));
  },
  component: OrderTracking,
});

function OrderTracking() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: shipments } = useSuspenseQuery(orderShipmentsQuery(id));
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 pb-24 pt-28">
          <p className="border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">{t("ord_not_found")}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
        <Link
          to="/concierge"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("nav_concierge")}
        </Link>

        <header className="mt-6">
          <p className="kicker text-terracotta">{t("ord_kicker")}</p>
          <h1 className="mt-2 font-display text-4xl text-foreground">{order.customer_reference}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("ord_sub")}</p>
        </header>

        <section className="mt-8 border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{order.product?.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("tbl_qty")}: {order.quantity}
                {order.product ? ` · ${formatINR(Number(order.product.price))}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={order.status} />
              <p className="text-xs text-muted-foreground">
                {t("tbl_dispatch")}: {formatDate(order.expected_dispatch_at)}
              </p>
            </div>
          </div>
        </section>

        {/* Dispatch records — carrier tracking only when a real integration exists */}
        <section className="mt-8 border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
            <Truck className="size-4 text-primary" aria-hidden="true" />
            {t("ord_shipment")}
          </h2>
          {shipments.length === 0 ? (
            <p className="mt-4 border border-border bg-secondary p-6 text-center text-sm text-muted-foreground">{t("ord_none_ship")}</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {shipments.map((s) => (
                <li key={s.id} className="border border-border bg-background p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                  <p className="font-medium capitalize text-foreground">{s.status}</p>
                  {s.carrier && (
                    <p className="text-muted-foreground">
                      {t("ord_carrier")}: {s.carrier}
                    </p>
                  )}
                  {s.tracking_ref && (
                    <p className="text-muted-foreground">
                      {t("ord_tracking")}: <span className="font-mono">{s.tracking_ref}</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(s.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
          <DemoNote className="mt-3">{t("ship_demo")}</DemoNote>
        </section>

        {/* The order record — same timeline the coordinator records */}
        <section className="mt-8 border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <OrderRecordTimeline orderId={order.id} />
        </section>

        <DemoNote className="mt-8">{t("ord_demo")}</DemoNote>
      </main>
      <SiteFooter />
    </div>
  );
}
