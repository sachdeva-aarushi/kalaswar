import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { samplesQuery, setSampleFeedback } from "@/lib/data";
import { StatusBadge, sampleStatusTone, TONE_BADGE } from "@/components/b2b/shared";

export const Route = createFileRoute("/b2b/samples")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(samplesQuery());
  },
  component: SamplesPage,
});

function SamplesPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: samples } = useSuspenseQuery(samplesQuery());
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const feedbackMut = useMutation({
    mutationFn: ({ sampleId, decision }: { sampleId: string; decision: "approved" | "revision_requested" }) =>
      setSampleFeedback(sampleId, feedback, decision),
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["samples"] });
      setFeedback("");
      setFeedbackFor(null);
      setNote(t(vars.decision === "approved" ? "b2b_sstatus_approved" : "b2b_sstatus_revision_requested"));
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="space-y-10 [&_input]:min-h-11 [&_input]:rounded-none [&_input]:border-border [&_input]:bg-background [&_textarea]:rounded-none [&_textarea]:border-border [&_textarea]:bg-background [&_[data-slot=select-trigger]]:min-h-11 [&_[data-slot=select-trigger]]:rounded-none [&_[data-slot=select-trigger]]:border-border [&_[data-slot=select-trigger]]:bg-background">
      <header>
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">{t("b2b_samples_title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("b2b_sample_reapproval_note")}</p>
      </header>

      {samples.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("b2b_no_samples")}</p>
      ) : (
        <ul className="space-y-4">
          {samples.map((s) => (
            <li key={s.id} className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{s.quotation_request_code}</p>
                  <p className="text-sm font-medium">{s.buyer_org_name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {t("b2b_sample_spec_version")} {s.spec_version}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {t("b2b_sample_fee")}: ₹{s.fee_inr}
                  </Badge>
                  <StatusBadge label={t(`b2b_sstatus_${s.status}`)} tone={sampleStatusTone(s.status)} />
                </div>
              </div>

              {s.spec?.["product_spec"] ? (
                <p className="mt-2 text-sm text-muted-foreground">{String(s.spec["product_spec"])}</p>
              ) : null}

              {s.events && s.events.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">{t("b2b_sample_events")}</summary>
                  <ul className="mt-5 grid gap-3 text-xs [&>li]:border [&>li]:border-border [&>li]:border-l-gold [&>li]:bg-background [&>li]:p-3 [&>li]:transition-all [&>li]:duration-300 [&>li:hover]:-translate-y-0.5 [&>li:hover]:border-primary/40 [&>li:hover]:shadow-lg [&>li:first-child]:border-l-primary">
                    {s.events.map((e) => (
                      <li key={e.id}>
                        {new Date(e.occurred_at).toLocaleString()} — e.event_type
                        {e.note ? ` — ${e.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {["ready_for_review", "delivered", "feedback_received", "dispatched"].includes(s.status) && (
                <div className="mt-3 border-t border-border pt-3">
                  {feedbackFor === s.id ? (
                    <div className="space-y-2">
                      <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t("b2b_sample_feedback_ph")} rows={2} />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={feedbackMut.isPending || !feedback.trim()}
                          onClick={() => feedbackMut.mutate({ sampleId: s.id, decision: "approved" })}
                        >
                          {t("b2b_sample_approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={feedbackMut.isPending || !feedback.trim()}
                          onClick={() => feedbackMut.mutate({ sampleId: s.id, decision: "revision_requested" })}
                        >
                          {t("b2b_sample_revision")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setFeedbackFor(s.id); setFeedback(s.feedback ?? ""); }}>
                      {t("b2b_sample_feedback_ph")}
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
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
