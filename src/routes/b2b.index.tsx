import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, RotateCcw } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { buyersQuery, buyerRequestsQuery, quotationsQuery, samplesQuery, b2bOrdersQuery } from "@/lib/data";
import { SectionTitle, StatusBadge, requestStatusTone, quoteStatusTone } from "@/components/b2b/shared";

export const Route = createFileRoute("/b2b/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(buyersQuery());
    void context.queryClient.ensureQueryData(buyerRequestsQuery());
    void context.queryClient.ensureQueryData(quotationsQuery());
    void context.queryClient.ensureQueryData(samplesQuery());
    void context.queryClient.ensureQueryData(b2bOrdersQuery());
  },
  component: B2bOverview,
});

function B2bOverview() {
  const { t } = useLang();
  const { data: buyers } = useSuspenseQuery(buyersQuery());
  const { data: requests } = useSuspenseQuery(buyerRequestsQuery());
  const { data: quotes } = useSuspenseQuery(quotationsQuery());
  const { data: samples } = useSuspenseQuery(samplesQuery());
  const { data: orders } = useSuspenseQuery(b2bOrdersQuery());

  const hasBuyer = (buyers?.length ?? 0) > 0;
  const active = (requests ?? []).filter((r) => !["declined", "cancelled"].includes(r.status));
  const openQuotes = (quotes ?? []).filter((q) =>
    ["submitted", "revision_requested", "revised"].includes(q.status),
  );
  const approvedSamples = (samples ?? []).filter((s) => s.status === "approved");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("b2b_title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("b2b_intro")}</p>
        {!hasBuyer && (
          <p className="mt-3 rounded-lg border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            {t("b2b_needs_profile")}{" "}
            <Link to="/b2b/buyer-profile" className="underline underline-offset-4">
              {t("b2b_nav_profile")} →
            </Link>
          </p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionTitle>{t("b2b_active_requests")}</SectionTitle>
          {active.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("b2b_no_requests")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {active.slice(0, 6).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <Link
                    to="/b2b/requests/$id"
                    params={{ id: r.id }}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {r.request_code}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <StatusBadge label={t(`b2b_status_${r.status}`)} tone={requestStatusTone(r.status)} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/b2b/request" search={{ from: r.id }}>
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      {t("b2b_reorder")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionTitle>{t("b2b_open_quotes")}</SectionTitle>
          {openQuotes.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("b2b_no_quotes")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {openQuotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{q.request_code}</span>
                  <span className="min-w-0 flex-1 truncate">{q.request_title}</span>
                  <StatusBadge label={t(`b2b_qstatus_${q.status}`)} tone={quoteStatusTone(q.status)} />
                  <Link
                    to="/b2b/quotes/$id"
                    params={{ id: q.id }}
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                  >
                    {t("b2b_view_quote")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionTitle>{t("b2b_sample_approvals")}</SectionTitle>
          {approvedSamples.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("b2b_no_samples")}</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {approvedSamples.map((s) => (
                <li key={s.id}>
                  {s.buyer_org_name} · {t("b2b_sample_spec_version")} {s.spec_version} ·{" "}
                  <StatusBadge label={t(`b2b_sstatus_${s.status}`)} tone="positive" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionTitle>{t("b2b_confirmed_orders")}</SectionTitle>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("b2b_no_orders")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{o.customer_reference}</span>
                  <span className="min-w-0 flex-1 truncate">{o.request_title}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/b2b/orders/$id" params={{ id: o.id }}>
                      {t("b2b_track_order")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">{t("b2b_reorder_note")}</p>
    </div>
  );
}
