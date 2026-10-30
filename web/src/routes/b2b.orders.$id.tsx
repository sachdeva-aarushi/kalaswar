import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { b2bOrdersQuery, orderEventsQuery } from "@/lib/data";

/** Stage keys recorded by the coordinator workspace; other event types fall back to their raw label. */
const STAGE_KEYS = new Set([
  "materials_confirmed", "work_assigned", "production_started", "mid_review",
  "quality_inspection", "rework", "final_approval", "packing", "dispatch", "delivery_confirmation",
]);

export const Route = createFileRoute("/b2b/orders/$id")({
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(b2bOrdersQuery());
    void context.queryClient.ensureQueryData(orderEventsQuery(params.id));
  },
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { data: orders } = useSuspenseQuery(b2bOrdersQuery());
  const { data: events } = useSuspenseQuery(orderEventsQuery(id));
  const order = orders.find((o) => o.id === id) || {
    id,
    customer_reference: "PO-2026-B2B-0081 — FabIndia Hospitality Hamper",
    status: "in_production",
    request_code: "REQ-2026-B2B-01",
    request_title: "100x Kantha Handcrafted Corporate Stoles",
    buyer_org_name: "FabIndia Sustainability Division",
    expected_dispatch_at: "2026-11-20",
  };

  return (
    <div className="space-y-10">
      <header>
        <Link to="/b2b/orders" className="text-sm text-muted-foreground underline underline-offset-4">
          <ArrowLeft className="mr-1 inline size-3.5" aria-hidden="true" />
          {t("b2b_orders_title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-lg font-semibold">{order.customer_reference}</h1>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {order.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("b2b_order_for")}: {order.request_code} — {order.request_title} · {order.buyer_org_name}
        </p>
        {order.expected_dispatch_at && (
          <p className="text-sm text-muted-foreground">
            {t("b2b_f_deadline")}: {new Date(order.expected_dispatch_at).toLocaleDateString()}
          </p>
        )}
      </header>

      <section className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <h2 className="font-display text-xl font-medium tracking-tight text-foreground">{t("b2b_stage_title")}</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">—</p>
        ) : (
          <ol className="mt-5 grid gap-3 text-sm [&>li]:border [&>li]:border-border [&>li]:border-l-gold [&>li]:bg-background [&>li]:p-4 [&>li]:transition-all [&>li]:duration-300 [&>li:hover]:-translate-y-0.5 [&>li:hover]:border-primary/40 [&>li:hover]:shadow-lg [&>li:first-child]:border-l-primary">
            {[...events].reverse().map((e) => (
              <li key={e.id}>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                <p>
                  {STAGE_KEYS.has(e.event_type) ? t(`b2b_stage_${e.event_type}`) : e.event_type.replace(/_/g, " ")}
                  {e.note ? ` — ${e.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* PO Micro-Factoring Escrow Status (DEMO) */}
      <section className="border border-border bg-card p-6 space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground">
            PO Micro-Factoring & Working Capital Escrow
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            [DEMO] Simulated Escrow
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Corporate Purchase Order working capital advance released to the artisan collective on simulated Layer-2 escrow.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">1. Verified PO</span>
            <span className="font-semibold text-emerald-700">100% Locked ✓</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">2. Escrow Lock</span>
            <span className="font-semibold text-purple-700 font-mono text-[11px]">0x8f2d…3c1b</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">3. 80% Advance</span>
            <span className="font-semibold text-emerald-700">Disbursed to SHG</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">4. Settlement</span>
            <span className="font-semibold text-foreground">20% on Delivery</span>
          </div>
        </div>
      </section>
    </div>
  );
}
