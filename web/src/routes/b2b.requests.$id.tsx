import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, CheckCircle2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buyerRequestQuery, collectiveSnapshotsQuery, quotationsForRequestQuery } from "@/lib/data";
import { assessBuyerRequest, validateBrief } from "@/lib/b2b";
import { StatusBadge, requestStatusTone, quoteStatusTone, TONE_BADGE } from "@/components/b2b/shared";
import type { FeasibilityStatus } from "@/lib/makepossible";

export const Route = createFileRoute("/b2b/requests/$id")({
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(buyerRequestQuery(params.id));
    void context.queryClient.ensureQueryData(collectiveSnapshotsQuery());
    void context.queryClient.ensureQueryData(quotationsForRequestQuery(params.id));
  },
  component: RequestDetailPage,
});

const FEAS_TONE: Record<FeasibilityStatus, string> = {
  potentially_feasible: "positive",
  feasible_with_changes: "warning",
  not_currently_feasible: "negative",
  insufficient_information: "neutral",
};

function RequestDetailPage() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { data: request } = useSuspenseQuery(buyerRequestQuery(id));
  const { data: snapshots } = useSuspenseQuery(collectiveSnapshotsQuery());
  const { data: quotes } = useSuspenseQuery(quotationsForRequestQuery(id));

  if (!request) return <p className="text-sm text-muted-foreground">Not found.</p>;

  const brief = request.structured ?? {};
  const validation = validateBrief(brief);
  const structuredKeys: [string, string][] = [
    ["craft_category", "b2b_f_category"],
    ["product_references", "b2b_f_refs"],
    ["quantity", "b2b_f_qty"],
    ["budget_per_unit", "b2b_f_budget_unit"],
    ["budget_total", "b2b_f_budget_total"],
    ["intended_use", "b2b_f_use"],
    ["customisation", "b2b_f_custom"],
    ["materials", "b2b_f_materials"],
    ["dimensions", "b2b_f_dims"],
    ["packaging", "b2b_f_packaging"],
    ["branding", "b2b_f_branding"],
    ["sample_requirements", "b2b_f_sample"],
    ["deadline", "b2b_f_deadline"],
    ["delivery_location", "b2b_f_delivery"],
    ["reference_links", "b2b_f_ref_links"],
    ["notes", "b2b_f_notes"],
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{request.request_code}</p>
          <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">{request.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={t(`b2b_status_${request.status}`)} tone={requestStatusTone(request.status)} />
          {request.status === "draft" && (
            <Button asChild size="sm" variant="outline">
              <Link to="/b2b/request" search={{ edit: request.id }}>
                {t("b2b_request_edit")}
              </Link>
            </Button>
          )}
        </div>
      </header>

      <section className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <h2 className="font-display text-xl font-medium tracking-tight text-foreground">{t("shg_b2b_brief")}</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {structuredKeys
            .filter(([k]) => brief[k] != null && String(brief[k]).trim() !== "")
            .map(([k, label]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t(label)}</dt>
                <dd>{String(brief[k])}</dd>
              </div>
            ))}
        </dl>
        {request.status === "draft" && !validation.ok && (
          <p className="mt-3 flex items-center gap-2 text-sm text-wine">
            <CircleAlert className="size-4" aria-hidden="true" />
            {t("b2b_validation_missing")}
          </p>
        )}
        {typeof brief["clarification_note"] === "string" && brief["clarification_note"] && (
          <p className="mt-3 border border-border bg-background p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg text-sm">
            <span className="font-medium">{t("b2b_clarification")}: </span>
            {String(brief["clarification_note"])}
          </p>
        )}
        {typeof brief["decline_reason"] === "string" && brief["decline_reason"] && (
          <p className="mt-3 text-sm text-destructive">
            {t("b2b_decline_reason")}: {String(brief["decline_reason"])}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground">{t("b2b_feasibility_title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("b2b_feasibility_note")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {snapshots.map((snap) => {
            const a = assessBuyerRequest(brief, snap);
            const d = a.dataUsed;
            return (
              <article key={snap.shg.id} className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{snap.shg.name}</p>
                  <Badge variant="outline" className={TONE_BADGE[FEAS_TONE[a.status]]}>
                    {t(`b2b_fp_${a.status}`)}
                  </Badge>
                </div>
                {(a.reasons.length > 0 || a.missing.length > 0 || a.suggestedChanges.length > 0) && (
                  <div className="mt-3 space-y-2 text-sm">
                    {a.reasons.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5">
                        {a.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                    {a.missing.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("b2b_missing_info")}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {a.missing.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {a.suggestedChanges.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("b2b_changes")}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {a.suggestedChanges.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {a.reasons.length === 0 && a.missing.length === 0 && a.suggestedChanges.length === 0 && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                    {t("b2b_reasons")}: {t("b2b_fp_potentially_feasible").toLowerCase()}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                  {d.matchedSkills.length > 0 && <span>{t("b2b_recorded_skills")}: {d.matchedSkills.join(", ")}</span>}
                  {d.monthlyCapacity != null && <span>{t("b2b_capacity_pieces_month")}: {d.monthlyCapacity}</span>}
                  {d.estimatedProductionDays != null && <span>≈ {d.estimatedProductionDays} d</span>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <h2 className="font-display text-xl font-medium tracking-tight text-foreground">{t("b2b_quotes_received")}</h2>
        {quotes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("b2b_no_quotes_yet")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{q.shg_name}</span>
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
      </section>
    </div>
  );
}
