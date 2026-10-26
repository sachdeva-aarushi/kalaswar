import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buyerRequestsQuery,
  collectiveSnapshotsQuery,
  createQuotation,
  setBuyerRequestStatus,
} from "@/lib/data";
import { assessBuyerRequest, validateBrief } from "@/lib/b2b";
import { StatusBadge, requestStatusTone, TONE_BADGE } from "@/components/b2b/shared";
import { QuoteSpecForm } from "@/components/b2b/quote-spec-form";
import type { FeasibilityStatus } from "@/lib/makepossible";
import type { QuotationSpec } from "@/lib/types";

export const Route = createFileRoute("/shg/b2b")({
  head: () => ({
    meta: [
      { title: "B2B requests — Kalaswar coordinator" },
      { property: "og:title", content: "B2B requests — Kalaswar coordinator" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(buyerRequestsQuery());
    void context.queryClient.ensureQueryData(collectiveSnapshotsQuery());
  },
  component: CoordinatorB2bPage,
});

const FEAS_TONE: Record<FeasibilityStatus, string> = {
  potentially_feasible: "positive",
  feasible_with_changes: "warning",
  not_currently_feasible: "negative",
  insufficient_information: "neutral",
};

function CoordinatorB2bPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: requests } = useSuspenseQuery(buyerRequestsQuery());
  const { data: snapshots } = useSuspenseQuery(collectiveSnapshotsQuery());

  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [clarifyFor, setClarifyFor] = useState<string | null>(null);
  const [clarifyNote, setClarifyNote] = useState("");
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const [quoteShg, setQuoteShg] = useState<string>("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["buyerRequests"] });
    void queryClient.invalidateQueries({ queryKey: ["quotations"] });
  };

  const clarifyMut = useMutation({
    mutationFn: ({ id, note: n }: { id: string; note: string }) =>
      setBuyerRequestStatus(id, "under_review", { clarification_note: n }),
    onSuccess: () => {
      invalidate();
      setClarifyFor(null);
      setClarifyNote("");
      setNote(t("b2b_clarification_sent"));
    },
  });
  const declineMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      setBuyerRequestStatus(id, "declined", { decline_reason: reason }),
    onSuccess: () => {
      invalidate();
      setDeclineFor(null);
      setDeclineReason("");
      setNote(t("b2b_status_declined"));
    },
  });
  const quoteMut = useMutation({
    mutationFn: ({ id, shgId, spec }: { id: string; shgId: string; spec: QuotationSpec }) =>
      createQuotation({ buyer_request_id: id, shg_id: shgId, spec, created_by: "Coordinator — demonstration" }),
    onSuccess: () => {
      invalidate();
      setQuoteFor(null);
      setQuoteShg("");
      setNote(t("shg_quote_created"));
    },
    onError: (e) => setError((e as Error).message),
  });

  const reviewable = (requests ?? []).filter((r) =>
    ["submitted", "under_review", "feasibility_ready", "quoted", "accepted"].includes(r.status),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("shg_b2b")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("shg_b2b_intro")}</p>
      </header>

      {reviewable.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("shg_b2b_no_requests")}</p>
      ) : (
        <ul className="space-y-4">
          {reviewable.map((r) => {
            const brief = r.structured ?? {};
            const validation = validateBrief(brief);
            const open = openRequest === r.id;
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-5">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                  onClick={() => setOpenRequest(open ? null : r.id)}
                >
                  <span>
                    <span className="font-mono text-sm text-muted-foreground">{r.request_code}</span>
                    <span className="ml-2 font-medium">{r.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {r.buyer_org_name && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {r.buyer_org_name}
                      </Badge>
                    )}
                    <StatusBadge label={t(`b2b_status_${r.status}`)} tone={requestStatusTone(r.status)} />
                  </span>
                </button>

                {open && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("shg_b2b_brief")}</p>
                      <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                        {Object.entries(brief)
                          .filter(([k, v]) => v != null && String(v).trim() !== "" && !["clarification_note", "decline_reason", "confirmed_order_id", "confirmed_quotation_version"].includes(k))
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt className="text-xs text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                              <dd>{String(v)}</dd>
                            </div>
                          ))}
                      </dl>
                      {typeof brief["clarification_note"] === "string" && brief["clarification_note"] && (
                        <p className="mt-2 rounded-lg border border-border bg-background p-3">
                          <span className="font-medium">{t("b2b_clarification")}: </span>
                          {String(brief["clarification_note"])}
                        </p>
                      )}
                    </div>

                    {!validation.ok && (
                      <p className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <CircleAlert className="size-4" aria-hidden="true" />
                        {t("b2b_validation_missing")}
                      </p>
                    )}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("b2b_feasibility_title")}</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {snapshots.map((snap) => {
                          const a = assessBuyerRequest(brief, snap);
                          return (
                            <div key={snap.shg.id} className="rounded-lg border border-border bg-background p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">{snap.shg.name}</p>
                                <Badge variant="outline" className={TONE_BADGE[FEAS_TONE[a.status]]}>
                                  {t(`b2b_fp_${a.status}`)}
                                </Badge>
                              </div>
                              {a.missing.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground">{t("b2b_missing_info")}</p>
                                  <ul className="list-disc pl-5 text-xs">
                                    {a.missing.map((m) => (
                                      <li key={m}>{m}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {a.reasons.length > 0 && (
                                <ul className="mt-2 list-disc pl-5 text-xs">
                                  {a.reasons.map((x) => (
                                    <li key={x}>{x}</li>
                                  ))}
                                </ul>
                              )}
                              {a.suggestedChanges.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground">{t("b2b_changes")}</p>
                                  <ul className="list-disc pl-5 text-xs">
                                    {a.suggestedChanges.map((x) => (
                                      <li key={x}>{x}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      {clarifyFor === r.id ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-56 flex-1">
                            <Label htmlFor={`clar-${r.id}`}>{t("shg_b2b_clarify")}</Label>
                            <Input id={`clar-${r.id}`} value={clarifyNote} onChange={(e) => setClarifyNote(e.target.value)} placeholder={t("shg_b2b_clarify_ph")} />
                          </div>
                          <Button size="sm" disabled={clarifyMut.isPending || !clarifyNote.trim()} onClick={() => clarifyMut.mutate({ id: r.id, note: clarifyNote })}>
                            {t("b2b_submit")}
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setClarifyFor(r.id); setDeclineFor(null); }}>
                          {t("shg_b2b_clarify")}
                        </Button>
                      )}

                      {declineFor === r.id ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-56 flex-1">
                            <Label htmlFor={`dec-${r.id}`}>{t("shg_b2b_decline")}</Label>
                            <Input id={`dec-${r.id}`} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder={t("shg_b2b_decline_ph")} />
                          </div>
                          <Button size="sm" variant="destructive" disabled={declineMut.isPending || !declineReason.trim()} onClick={() => declineMut.mutate({ id: r.id, reason: declineReason })}>
                            {t("shg_b2b_decline")}
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setDeclineFor(r.id); setClarifyFor(null); }}>
                          {t("shg_b2b_decline")}
                        </Button>
                      )}

                      <Dialog
                        open={quoteFor === r.id}
                        onOpenChange={(o) => {
                          setQuoteFor(o ? r.id : null);
                          if (o) setQuoteShg(snapshots[0]?.shg.id ?? "");
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">{t("shg_b2b_prepare_quote")}</Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {t("shg_b2b_prepare_quote")} — {r.request_code}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div>
                              <Label>{t("shg_b2b_route")}</Label>
                              <Select value={quoteShg} onValueChange={setQuoteShg}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("shg_b2b_route")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {snapshots.map((s) => (
                                    <SelectItem key={s.shg.id} value={s.shg.id}>
                                      {s.shg.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="mt-1 text-xs text-muted-foreground">{t("shg_b2b_route_hint")}</p>
                            </div>
                            <QuoteSpecForm
                              submitLabel={t("shg_b2b_prepare_quote")}
                              pending={quoteMut.isPending}
                              onSubmit={(spec) => {
                                if (!quoteShg) return;
                                quoteMut.mutate({ id: r.id, shgId: quoteShg, spec });
                              }}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
