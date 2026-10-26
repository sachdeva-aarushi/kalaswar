import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quotationQuery, samplesQuery } from "@/lib/data";
import { acceptQuotationVersion, createSampleRequest, requestQuotationRevision } from "@/lib/data";
import { quoteTotals } from "@/lib/b2b";
import { StatusBadge, quoteStatusTone, TONE_BADGE } from "@/components/b2b/shared";
import type { QuotationSpec } from "@/lib/types";

export const Route = createFileRoute("/b2b/quotes/$id")({
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(quotationQuery(params.id));
    void context.queryClient.ensureQueryData(samplesQuery());
  },
  component: QuoteDetailPage,
});

const SPEC_LABELS: [keyof QuotationSpec, string][] = [
  ["product_spec", "qspec_product"],
  ["packaging_logistics", "qspec_packaging"],
  ["taxes_note", "qspec_taxes"],
  ["delivery_assumptions", "qspec_delivery"],
  ["payment_terms", "b2b_quote_terms"],
  ["expiry_date", "b2b_quote_expiry"],
  ["included_services", "b2b_quote_includes"],
  ["excluded_services", "b2b_quote_excludes"],
  ["limitations", "b2b_quote_limitations"],
  ["changes_from_previous", "qspec_changes_note"],
];

function QuoteDetailPage() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: quote } = useSuspenseQuery(quotationQuery(id));
  const { data: samples } = useSuspenseQuery(samplesQuery());
  const [revisionNote, setRevisionNote] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = quote?.versions?.[0];
  const accepted = quote?.versions?.find((v) => v.status === "accepted");
  const sampleExists = (samples ?? []).some((s) => s.quotation_id === id);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["quotations"] });
  };

  const acceptMut = useMutation({
    mutationFn: () => acceptQuotationVersion(id, latest!.id),
    onSuccess: () => {
      invalidate();
      setNote(t("b2b_quote_accepted_note"));
    },
    onError: (e) => setError((e as Error).message),
  });
  const reviseMut = useMutation({
    mutationFn: () => requestQuotationRevision(id, revisionNote),
    onSuccess: () => {
      invalidate();
      setRevisionNote("");
      setNote(t("b2b_quote_revision_sent"));
    },
  });
  const sampleMut = useMutation({
    mutationFn: () =>
      createSampleRequest({
        quotation_id: id,
        buyer_request_id: quote?.buyer_request_id ?? null,
        shg_id: quote?.shg_id ?? null,
        spec: {
          product_spec: latest?.spec.product_spec ?? null,
          sample_requirements: null,
        },
        spec_version: latest?.version ?? 1,
        fee_inr: Number(latest?.spec.sample_fee_inr ?? 0),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["samples"] });
      setNote(t("b2b_sample_requested_toast"));
    },
    onError: (e) => setError((e as Error).message),
  });

  if (!quote || !latest) return <p className="text-sm text-muted-foreground">Not found.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{quote.request_code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{quote.request_title}</h1>
          <p className="text-sm text-muted-foreground">
            {t("b2b_quote_from")}: {quote.shg_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={t(`b2b_qstatus_${quote.status}`)} tone={quoteStatusTone(quote.status)} />
          <Link to="/b2b/requests/$id" params={{ id: quote.buyer_request_id }} className="text-sm text-primary underline underline-offset-4">
            {t("b2b_nav_requests")}
            <ArrowRight className="ml-1 inline size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <p className="text-xs text-muted-foreground">{t("b2b_quote_not_binding")}</p>

      <section className="space-y-4">
        {quote.versions?.map((v) => {
          const totals = quoteTotals(v.spec);
          const isLatest = v.id === latest.id;
          return (
            <article
              key={v.id}
              className={`rounded-xl border bg-card p-5 ${isLatest ? "border-primary/50" : "border-border opacity-80"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {t("b2b_quote_version")} {v.version}
                  {v.status === "accepted" && (
                    <Badge variant="outline" className={`ml-2 ${TONE_BADGE["positive"]}`}>
                      {t("b2b_qstatus_accepted")}
                    </Badge>
                  )}
                  {v.status === "superseded" && (
                    <Badge variant="outline" className={`ml-2 ${TONE_BADGE["neutral"]}`}>
                      superseded
                    </Badge>
                  )}
                </p>
                <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {v.spec.product_spec && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("qspec_product")}</dt>
                    <dd>{v.spec.product_spec}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_quote_unit_price")}</dt>
                  <dd>₹{v.spec.unit_price_inr ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_f_qty")}</dt>
                  <dd>{v.spec.quantity ?? "—"}</dd>
                </div>
                {totals && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_quote_total")}</dt>
                    <dd>
                      ₹{totals.totalInr}
                      {totals.feesInr > 0 && <span className="text-xs text-muted-foreground"> ({t("b2b_quote_total")} incl. fees ₹{totals.feesInr})</span>}
                    </dd>
                  </div>
                )}
                {v.spec.lead_time_days != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_quote_lead_time")}</dt>
                    <dd>{v.spec.lead_time_days} d</dd>
                  </div>
                )}
                {v.spec.sample_fee_inr != null && Number(v.spec.sample_fee_inr) > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_quote_sample_fee")}</dt>
                    <dd>₹{v.spec.sample_fee_inr}</dd>
                  </div>
                )}
                {SPEC_LABELS.filter(([k]) => v.spec[k] != null && String(v.spec[k]).trim() !== "").map(([k, label]) => (
                  <div key={k} className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t(label)}</dt>
                    <dd>{String(v.spec[k])}</dd>
                  </div>
                ))}
              </dl>

              {isLatest && quote.status === "submitted" && !accepted && (
                <div className="mt-4 border-t border-border pt-3">
                  <Button size="sm" onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending}>
                    {t("b2b_quote_accept")}
                  </Button>
                </div>
              )}
              {v.status === "accepted" && v.accepted_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("b2b_qstatus_accepted")}: {new Date(v.accepted_at).toLocaleString()}
                </p>
              )}
            </article>
          );
        })}
      </section>

      {quote.status !== "accepted" && quote.status !== "declined" && quote.status !== "cancelled" && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <Label htmlFor={`qrev-${id}`}>{t("b2b_quote_revise")}</Label>
              <Input
                id={`qrev-${id}`}
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder={t("b2b_quote_revision_ph")}
              />
            </div>
            <Button variant="outline" disabled={reviseMut.isPending || !revisionNote.trim()} onClick={() => reviseMut.mutate()}>
              {t("b2b_quote_revise")}
            </Button>
          </div>
        </section>
      )}

      {latest && (
        <section className="rounded-xl border border-border bg-card p-5">
          {sampleExists ? (
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="mr-1 inline size-4 text-primary" aria-hidden="true" />
              {t("b2b_sample_requested_toast")}
            </p>
          ) : (
            <Button variant="outline" size="sm" onClick={() => sampleMut.mutate()} disabled={sampleMut.isPending}>
              {t("b2b_request_sample")} (v{latest.version})
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("b2b_sample_reapproval_note")}</p>
        </section>
      )}

      {note && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {note}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Info className="size-4" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
