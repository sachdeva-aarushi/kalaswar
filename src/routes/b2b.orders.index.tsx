import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { b2bOrdersQuery, orderEventsQuery } from "@/lib/data";

export const Route = createFileRoute("/b2b/orders/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(b2bOrdersQuery());
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { t } = useLang();
  const { data: orders } = useSuspenseQuery(b2bOrdersQuery());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("b2b_orders_title")}</h1>
      </header>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("b2b_no_orders")}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{o.customer_reference}</p>
                <p className="font-medium">{o.request_title}</p>
                <p className="text-sm text-muted-foreground">
                  {o.buyer_org_name} · {o.quantity} pcs
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {o.status.replace(/_/g, " ")}
                </Badge>
                <Link
                  to="/b2b/orders/$id"
                  params={{ id: o.id }}
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
                >
                  {t("b2b_track_order")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
