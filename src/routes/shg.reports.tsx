import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  allOrderEventsQuery,
  artisansQuery,
  ordersQuery,
  paymentsQuery,
  productSignalsAllQuery,
  productsQuery,
} from "@/lib/data";
import { summarizeDemand } from "@/lib/demand";
import { downloadCsv, toCsv } from "@/lib/csv";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { ScrollText, Users, Package, Wallet } from "lucide-react";

export const Route = createFileRoute("/shg/reports")({
  head: () => ({ meta: [{ title: "Reports — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(artisansQuery());
    void context.queryClient.ensureQueryData(productsQuery({}));
    void context.queryClient.ensureQueryData(allOrderEventsQuery());
    void context.queryClient.ensureQueryData(paymentsQuery());
    void context.queryClient.ensureQueryData(productSignalsAllQuery());
  },
  component: ShgReports,
});

function ShgReports() {
  const { t } = useLang();
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: artisans } = useSuspenseQuery(artisansQuery());
  const { data: products } = useSuspenseQuery(productsQuery({}));
  const { data: events } = useSuspenseQuery(allOrderEventsQuery());
  const { data: payments } = useSuspenseQuery(paymentsQuery());
  const { data: signals } = useSuspenseQuery(productSignalsAllQuery());

  // Demand-informed planning: distinct recorded signals per piece.
  const demandRows = products
    .map((p) => ({ product: p, ...summarizeDemand(p.id, signals, orders) }))
    .filter((r) => r.views + r.saves + r.enquiries + r.purchases > 0)
    .sort((a, b) => b.purchases * 10 + b.views - (a.purchases * 10 + a.views));

  const exportDemand = () => {
    const csv = toCsv(demandRows, [
      { key: "product", label: "Product", value: (r) => r.product.name },
      { key: "views", label: "Views" },
      { key: "saves", label: "Saves" },
      { key: "enquiries", label: "Enquiries" },
      { key: "purchases", label: "Purchases" },
    ]);
    downloadCsv("kalaswar-demand-signals.csv", csv);
    toast.success(t("export_done"));
  };

  const exportOrders = () => {
    const csv = toCsv(orders, [
      { key: "customer_reference", label: "Reference" },
      { key: "product", label: "Product", value: (o) => o.product?.name ?? "" },
      { key: "artisan", label: "Artisan", value: (o) => o.artisan?.name ?? "Unassigned" },
      { key: "quantity", label: "Quantity" },
      { key: "status", label: "Status" },
      { key: "expected_dispatch_at", label: "Expected dispatch" },
      { key: "created_at", label: "Created" },
    ]);
    downloadCsv("kalaswar-orders.csv", csv);
    toast.success(t("export_done"));
  };

  const exportArtisans = () => {
    const csv = toCsv(artisans, [
      { key: "name", label: "Name" },
      { key: "craft", label: "Craft" },
      { key: "shg", label: "Collective", value: (a) => a.shg?.name ?? "" },
      { key: "shg", label: "Region", value: (a) => a.shg?.region ?? "" },
      { key: "preferred_language", label: "Language" },
    ]);
    downloadCsv("kalaswar-artisans.csv", csv);
    toast.success(t("export_done"));
  };

  const exportProducts = () => {
    const csv = toCsv(products, [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "price", label: "Price (INR)" },
      { key: "artisan", label: "Artisan", value: (p) => p.artisan?.name ?? "" },
      { key: "availability", label: "Available", value: (p) => (p.availability ? "yes" : "no") },
      { key: "image_url", label: "Image URL" },
    ]);
    downloadCsv("kalaswar-products.csv", csv);
    toast.success(t("export_done"));
  };

  const exportEvents = () => {
    const csv = toCsv(events, [
      { key: "order_reference", label: "Order" },
      { key: "event_type", label: "Step" },
      { key: "note", label: "Note" },
      { key: "created_at", label: "When" },
    ]);
    downloadCsv("kalaswar-order-records.csv", csv);
    toast.success(t("export_done"));
  };

  const exportPayments = () => {
    const csv = toCsv(payments, [
      { key: "created_at", label: "When" },
      { key: "direction", label: "Type" },
      { key: "order_reference", label: "Order" },
      { key: "artisan_name", label: "Artisan" },
      { key: "shg_name", label: "Collective" },
      { key: "amount", label: "Amount (INR)" },
      { key: "status", label: "Status" },
      { key: "note", label: "Note" },
    ]);
    downloadCsv("kalaswar-payments.csv", csv);
    toast.success(t("export_done"));
  };

  const reports = [
    { title: t("export_orders"), sub: `${orders.length}`, icon: ScrollText, fn: exportOrders },
    { title: t("export_events"), sub: `${events.length}`, icon: ScrollText, fn: exportEvents },
    { title: t("export_payments"), sub: `${payments.length}`, icon: Wallet, fn: exportPayments },
    { title: t("export_artisans"), sub: `${artisans.length}`, icon: Users, fn: exportArtisans },
    { title: t("export_products"), sub: `${products.length}`, icon: Package, fn: exportProducts },
  ];

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("reports_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("reports_sub")}</p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div key={r.title} className="flex flex-col rounded-md border border-border bg-card p-5">
            <r.icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-display text-xl text-foreground">{r.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("explore_results", { n: r.sub })}
            </p>
            <Button className="mt-4 w-fit" variant="outline" onClick={r.fn}>
              <Download className="size-4" aria-hidden="true" />
              CSV
            </Button>
          </div>
        ))}
      </div>

      {/* Demand signals — views, saves, enquiries, purchases stay distinct */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">{t("demand_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("demand_sub")}</p>
        {demandRows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("demand_none")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("demand_product")}</th>
                  <th className="px-4 py-3 font-medium">{t("demand_views")}</th>
                  <th className="px-4 py-3 font-medium">{t("demand_saves")}</th>
                  <th className="px-4 py-3 font-medium">{t("demand_enquiries")}</th>
                  <th className="px-4 py-3 font-medium">{t("demand_purchases")}</th>
                </tr>
              </thead>
              <tbody>
                {demandRows.map((r) => (
                  <tr key={r.product.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{r.product.name}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{r.views}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{r.saves}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{r.enquiries}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-foreground">{r.purchases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {demandRows.length > 0 && (
          <Button className="mt-3" variant="outline" onClick={exportDemand}>
            <Download className="size-4" aria-hidden="true" />
            CSV
          </Button>
        )}
      </section>

      <DemoNote className="mt-8">{t("reports_note")}</DemoNote>
    </div>
  );
}
