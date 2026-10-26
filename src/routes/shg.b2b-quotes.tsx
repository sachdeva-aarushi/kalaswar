import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  quotationsQuery,
  submitQuotationVersion,
  addQuotationVersion,
  cancelQuotation,
  confirmB2bOrder,
  samplesQuery,
  updateSampleStatus,
} from "@/lib/data";
import { quoteTotals } from "@/lib/b2b";
import { StatusBadge, quoteStatusTone, sampleStatusTone } from "@/components/b2b/shared";
import { QuoteSpecForm } from "@/components/b2b/quote-spec-form";
import type { QuotationSpec } from "@/lib/types";

const SAMPLE_STAGES: Record<string, string[]> = {
  requested: ["under_review", "cancelled"],
  under_review: ["approved_for_production", "cancelled"],
  approved_for_production: ["in_production"],
  in_production: ["ready_for_review"],
  ready_for_review: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
  feedback_received: [],
  approved: [],
  revision_requested: [],
  cancelled: [],
};

export const Route = createFileRoute("/shg/b2b-quotes")({
  head: () => ({
    meta: [
      { title: "B2B quotes — Kalaswar coordinator" },
      { property: "og:title", content: "B2B quotes — Kalaswar coordinator" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(quotationsQuery());
    void context.queryClient.ensureQueryData(samplesQuery());
  },
  component: CoordinatorQuotesPage,
});

function CoordinatorQuotesPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: quotes } = useSuspenseQuery(quotationsQuery());
  const { data: samples } = useSuspenseQuery(samplesQuery());

  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versionFor, setVersionFor] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["quotations"] });
    void queryClient.invalidateQueries({ queryKey: ["buyerRequests"] });
  };

  const submitMut = useMutation({
    mutationFn: ({ quotationId, versionId }: { quotationId: string; versionId: string }) =>
      submitQuotationVersion(quotationId, versionId),
    onSuccess: () => {
      invalidate();
      setNote(t("shg_quote_submitted"));
    },
    onError: (e) => setError((e as Error).message),
  });
  const versionMut = useMutation({
    mutationFn: ({ quotationId, spec }: { quotationId: string; spec: QuotationSpec }) =>
      addQuotationVersion({ quotation_id: quotationId, spec, created_by: "Coordinator — demonstration" }),
    onSuccess: () => {
      invalidate();
      setVersionFor(null);
      setNote(t("shg_quote_created"));
    },
    onError: (e) => setError((e as Error).message),
  });
  const cancelMut = useMutation({
    mutationFn: (quotationId: string) => cancelQuotation(quotationId),
    onSuccess: () => {
      invalidate();
      setNote(t("b2b_qstatus_cancelled"));
    },
  });
  const sampleMut = useMutation({
    mutationFn: ({ sampleId, status, note }: { sampleId: string; status: string; note?: string }) =>
      updateSampleStatus(sampleId, status as Parameters<typeof updateSampleStatus>[1], note),
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["samples"] });
      setNote(t(`b2b_sstatus_${vars.status}`));
    },
    onError: (e) => setError((e as Error).message),
  });
  const confirmMut = useMutation({
    mutationFn: (quotationId: string) => confirmB2bOrder(quotationId),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["b2bOrders"] });
      setNote(t("shg_b2b_confirmed"));
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("shg_b2b_quotes")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("qspec_version_note")}</p>
      </header>

      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("shg_b2b_no_quotes")}</p>
      ) : (
        <ul className="space-y-4">
          {quotes.map((q) => {
            const latest = q.versions?.[0];
            const hasDraft = q.versions?.some((v) => v.status === "draft") ?? false;
            const acceptedVersion = q.versions?.find((v) => v.status === "accepted");
            const totals = latest ? quoteTotals(latest.spec) : null;
            return (
              <li key={q.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{q.request_code}</p>
                    <p className="font-medium">{q.request_title}</p>
                    <p className="text-sm text-muted-foreground">{q.buyer_org_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={t(`b2b_qstatus_${q.status}`)} tone={quoteStatusTone(q.status)} />
                    {q.status === "revision_requested" && (
                      <Badge variant="outline" className="border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        {t("shg_quote_revision_pending")}
                      </Badge>
                    )}
                  </div>
                </div>

                {latest && (
                  <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {t("b2b_quote_version")} {latest.version} · {latest.status}
                    </p>
                    <p>
                      {latest.spec.product_spec}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("qspec_price")}: ₹{latest.spec.unit_price_inr ?? "—"} × {latest.spec.quantity ?? "—"}
                      {totals ? ` = ₹${totals.totalInr}` : ""}
                      {latest.spec.lead_time_days != null ? ` · ${t("qspec_lead")}: ${latest.spec.lead_time_days}d` : ""}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {hasDraft && latest && (
                    <Button
                      size="sm"
                      disabled={submitMut.isPending}
                      onClick={() => submitMut.mutate({ quotationId: q.id, versionId: latest.id })}
                    >
                      {t("shg_quote_submit")}
                    </Button>
                  )}
                  {q.status !== "cancelled" && q.status !== "accepted" && (
                    <Dialog
                      open={versionFor === q.id}
                      onOpenChange={(o) => setVersionFor(o ? q.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          {t("qspec_new_version")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {t("qspec_new_version")} — {q.request_code}
                          </DialogTitle>
                        </DialogHeader>
                        <QuoteSpecForm
                          initial={latest?.spec}
                          isRevision
                          submitLabel={t("qspec_new_version")}
                          pending={versionMut.isPending}
                          onSubmit={(spec) => versionMut.mutate({ quotationId: q.id, spec })}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                  {q.status === "accepted" && !acceptedVersion?.accepted_at && null}
                  {q.status === "accepted" && (
                    <Button size="sm" onClick={() => confirmMut.mutate(q.id)} disabled={confirmMut.isPending}>
                      {t("shg_b2b_confirm_order")}
                    </Button>
                  )}
                  {["draft", "submitted", "revision_requested", "revised"].includes(q.status) && (
                    <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(q.id)} disabled={cancelMut.isPending}>
                      {t("shg_quote_cancel")}
                    </Button>
                  )}
                  <Link to="/b2b/quotes/$id" params={{ id: q.id }} className="text-xs text-muted-foreground underline underline-offset-4">
                    {t("b2b_view_quote")}
                  </Link>
                </div>
                {q.status === "accepted" && (
                  <p className="mt-2 text-xs text-muted-foreground">{t("shg_b2b_confirm_needs_accept")}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold tracking-tight">{t("b2b_samples_title")}</h2>
        {(samples ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("b2b_no_samples")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(samples ?? []).map((sm) => {
              const nexts = SAMPLE_STAGES[sm.status] ?? [];
              return (
                <li key={sm.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-mono text-xs text-muted-foreground">{sm.quotation_request_code}</span>{" "}
                      <span className="text-muted-foreground">{sm.shg_name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {t("b2b_sample_spec_version")} {sm.spec_version}
                      </Badge>
                      <StatusBadge label={t(`b2b_sstatus_${sm.status}`)} tone={sampleStatusTone(sm.status)} />
                    </span>
                  </div>
                  {nexts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {nexts.map((st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant="outline"
                          disabled={sampleMut.isPending}
                          onClick={() => sampleMut.mutate({ sampleId: sm.id, status: st })}
                        >
                          → {t(`b2b_sstatus_${st}`)}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
