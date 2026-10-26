import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { DemoBadge } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  assessFeasibility,
  type FeasibilityAssessment,
  type FeasibilityStatus,
} from "@/lib/makepossible";
import {
  approveProposal,
  collectiveSnapshotsQuery,
  createProposal,
  customRequestsQuery,
  declineRequest,
  fetchApprovalsForProposals,
  fetchProposalsForRequest,
  productsQuery,
  sendRequestToShg,
  attachComparables,
  type CustomRequestWithShg,
} from "@/lib/data";

export const Route = createFileRoute("/shg/requests")({
  head: () => ({
    meta: [
      { title: "Custom Requests — Kalaswar Workroom" },
      {
        name: "description",
        content:
          "Review customer custom-order requests with MakePossible feasibility evidence, then accept, decline, or propose terms for the customer to approve.",
      },
      { property: "og:title", content: "Custom Requests — Kalaswar Workroom" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(customRequestsQuery());
    void context.queryClient.ensureQueryData(collectiveSnapshotsQuery());
    void context.queryClient.ensureQueryData(productsQuery());
  },
  component: CustomRequestsPage,
});

function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3);
}

const STATUS_BADGE: Record<FeasibilityStatus, string> = {
  potentially_feasible: "border-primary/40 bg-primary/10 text-primary",
  feasible_with_changes: "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  not_currently_feasible: "border-destructive/40 bg-destructive/10 text-destructive",
  insufficient_information: "border-border bg-muted text-muted-foreground",
};

const REQUEST_STATUS_CLASS: Record<string, string> = {
  submitted: "border-border bg-muted text-muted-foreground",
  under_review: "border-border bg-muted text-muted-foreground",
  accepted: "border-primary/40 bg-primary/10 text-primary",
  proposed: "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  confirmed: "border-primary/40 bg-primary/10 text-primary",
  declined: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

interface ProposalFormState {
  name: string;
  description: string;
  materials: string;
  personalisation: string;
  quantity: string;
  price: string;
  days: string;
  dispatch: string;
  cancellation: string;
  changes: string;
}

function emptyProposalForm(request: CustomRequestWithShg): ProposalFormState {
  const s = request.structured as Record<string, unknown>;
  return {
    name: request.title,
    description: "",
    materials: String(s["materials"] ?? ""),
    personalisation: String(s["personalisation"] ?? ""),
    quantity: String(s["quantity"] ?? ""),
    price: "",
    days: "",
    dispatch: "",
    cancellation: "",
    changes: "",
  };
}

function RequestReview({ request }: { request: CustomRequestWithShg }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: snapshots } = useSuspenseQuery(collectiveSnapshotsQuery());
  const { data: products } = useSuspenseQuery(productsQuery());

  const [open, setOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pf, setPf] = useState<ProposalFormState>(() => emptyProposalForm(request));

  const latestQ = useQuery({
    queryKey: ["proposalsFor", request.id],
    queryFn: () => fetchProposalsForRequest(request.id),
    enabled: open,
  });
  const latest = latestQ.data?.[0];
  const approvalsQ = useQuery({
    queryKey: ["approvalsFor", latest?.id ?? ""],
    queryFn: () => fetchApprovalsForProposals([latest!.id]),
    enabled: open && !!latest,
  });
  const approvals = approvalsQ.data ?? [];
  const customerApproved = approvals.some((a) => a.approver_role === "customer");
  const coordinatorApproved = approvals.some((a) => a.approver_role === "coordinator");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["customRequests"] });
    void queryClient.invalidateQueries({ queryKey: ["proposalsFor", request.id] });
    void queryClient.invalidateQueries({ queryKey: ["approvalsFor"] });
  };

  const declineMut = useMutation({
    mutationFn: () => declineRequest(request.id, declineReason.trim()),
    onSuccess: () => {
      invalidate();
      setDeclineOpen(false);
      setNote(t("shg_decline_done"));
    },
    onError: (e) => setError((e as Error).message),
  });
  const proposeMut = useMutation({
    mutationFn: () =>
      createProposal({
        request_id: request.id,
        spec: {
          name: pf.name.trim(),
          description: pf.description.trim() || undefined,
          materials: pf.materials.trim() || undefined,
          personalisation: pf.personalisation.trim() || undefined,
          quantity: Number(pf.quantity) || undefined,
          price_per_unit_inr: pf.price ? Number(pf.price) : undefined,
          total_inr: pf.price && pf.quantity ? Number(pf.price) * Number(pf.quantity) : undefined,
          production_days: pf.days ? Number(pf.days) : undefined,
          dispatch_terms: pf.dispatch.trim() || undefined,
          cancellation_terms: pf.cancellation.trim() || undefined,
          changes_from_request: pf.changes.trim() || undefined,
        },
      }),
    onSuccess: (proposal) => {
      invalidate();
      setProposalOpen(false);
      setNote(t("shg_proposal_sent", { n: proposal.version }));
    },
    onError: (e) => setError((e as Error).message),
  });
  const approveMut = useMutation({
    mutationFn: () => approveProposal(latest!.id, "coordinator"),
    onSuccess: invalidate,
    onError: (e) => setError((e as Error).message),
  });
  const routeMut = useMutation({
    mutationFn: (shgId: string) => sendRequestToShg(request.id, shgId),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["collectiveSnapshots"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  /* Feasibility evidence for the assigned collective (or unassigned note). */
  const s = request.structured as Record<string, unknown>;
  const categoryTokens = [
    ...tokensOf(String(s["craft_preference"] ?? "")),
    ...tokensOf(String(s["materials"] ?? "")),
  ];
  const snapshot = request.shg_id
    ? snapshots.find((snap) => snap.shg.id === request.shg_id) ?? null
    : null;
  const comparableSnapshot = snapshot
    ? attachComparables([snapshot], products, categoryTokens)[0]
    : null;
  const assessment: FeasibilityAssessment | null =
    comparableSnapshot && s["quantity"]
      ? assessFeasibility(
          {
            quantity: Number(s["quantity"]),
            craft_preference: (s["craft_preference"] as string) ?? null,
            materials: (s["materials"] as string) ?? null,
            budget_inr_per_unit: (s["budget_inr_per_unit"] as number) ?? null,
            deadline_in_days: (s["deadline_in_days"] as number) ?? null,
          },
          comparableSnapshot,
        )
      : null;
  const routed = request.shg_id != null;
  const unassignedTokens = tokensOf(String(s["craft_preference"] ?? ""));
  const suggestedShg = routed
    ? null
    : attachComparables(snapshots, products, unassignedTokens).reduce(
        (best, snap) => {
          const a = assessFeasibility(
            {
              quantity: Number(s["quantity"]) || 0,
              craft_preference: (s["craft_preference"] as string) ?? null,
              materials: (s["materials"] as string) ?? null,
              budget_inr_per_unit: (s["budget_inr_per_unit"] as number) ?? null,
              deadline_in_days: (s["deadline_in_days"] as number) ?? null,
            },
            snap,
          );
          const rank: Record<FeasibilityStatus, number> = {
            potentially_feasible: 0,
            feasible_with_changes: 1,
            insufficient_information: 2,
            not_currently_feasible: 3,
          };
          if (!best || rank[a.status] < rank[best.assessment.status]) {
            return { snapshot: snap, assessment: a };
          }
          return best;
        },
        null as { snapshot: (typeof snapshots)[number]; assessment: FeasibilityAssessment } | null,
      );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          <span className="font-mono text-sm text-muted-foreground">{request.request_code}</span>
          <span className="ml-2 font-medium">{request.title}</span>
        </span>
        <Badge variant="outline" className={REQUEST_STATUS_CLASS[request.status] ?? ""}>
          {request.status.replace(/_/g, " ")}
        </Badge>
      </button>
      {request.shg_name && <p className="mt-1 text-sm text-muted-foreground">{request.shg_name}</p>}

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          <p className="text-muted-foreground">{request.brief}</p>

          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(s)
              .filter(([k]) => !["decline_reason", "revision_note"].includes(k))
              .map(([k, v]) =>
                v == null ? null : (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd>{String(v)}</dd>
                  </div>
                ),
              )}
          </dl>

          {/* Feasibility evidence */}
          {assessment && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-medium">
                  <ClipboardList className="size-4" aria-hidden="true" />
                  {t("shg_request_feasibility")}
                </p>
                <Badge variant="outline" className={STATUS_BADGE[assessment.status]}>
                  {t(`concierge_status_${assessment.status}`)}
                </Badge>
              </div>
              {assessment.reasons.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {assessment.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              {assessment.notes.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {assessment.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              {assessment.missing.length > 0 && (
                <>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("concierge_missing")}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {assessment.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </>
              )}
              {assessment.dataUsed.estimatedProductionDays != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("concierge_basis_days", { n: assessment.dataUsed.estimatedProductionDays })}
                </p>
              )}
            </div>
          )}

          {!routed && suggestedShg && (
            <div className="rounded-lg border border-border bg-background p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("concierge_send")}
              </p>
              <p className="mt-1">
                {suggestedShg.snapshot.shg.name} · {t(`concierge_status_${suggestedShg.assessment.status}`)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => routeMut.mutate(suggestedShg.snapshot.shg.id)}
              >
                {t("shg_request_review")} → {suggestedShg.snapshot.shg.name}
              </Button>
            </div>
          )}

          {/* Actions */}
          {routed && request.status !== "confirmed" && request.status !== "declined" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => { setPf(latest ? { ...emptyProposalForm(request), ...pickSpec(latest) } : emptyProposalForm(request)); setProposalOpen((o) => !o); }}>
                {latest ? t("shg_revise") : t("shg_prepare_proposal")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeclineOpen((o) => !o)}>
                {t("shg_decline")}
              </Button>
              {latest && !coordinatorApproved && (
                <Button size="sm" variant="outline" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
                  {t("shg_coordinator_approve")}
                </Button>
              )}
              {latest && coordinatorApproved && (
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  {t("concierge_approved")}
                </Badge>
              )}
            </div>
          )}

          {declineOpen && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1">
                <Label htmlFor={`dec-${request.id}`}>{t("shg_decline_reason")}</Label>
                <Input id={`dec-${request.id}`} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => declineMut.mutate()}
                disabled={declineMut.isPending || !declineReason.trim()}
              >
                {t("shg_decline")}
              </Button>
            </div>
          )}

          {proposalOpen && (
            <form
              className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!pf.name.trim() || !pf.price || !pf.quantity) {
                  setError(t("concierge_required"));
                  return;
                }
                setError(null);
                proposeMut.mutate();
              }}
            >
              <div className="sm:col-span-2">
                <Label htmlFor={`p-name-${request.id}`}>{t("shg_proposal_name")}</Label>
                <Input id={`p-name-${request.id}`} value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`p-desc-${request.id}`}>{t("shg_proposal_desc")}</Label>
                <Textarea id={`p-desc-${request.id}`} value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label htmlFor={`p-qty-${request.id}`}>{t("concierge_quantity")}</Label>
                <Input id={`p-qty-${request.id}`} type="number" min={1} value={pf.quantity} onChange={(e) => setPf({ ...pf, quantity: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor={`p-price-${request.id}`}>{t("shg_proposal_price")}</Label>
                <Input id={`p-price-${request.id}`} type="number" min={0} value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor={`p-days-${request.id}`}>{t("shg_proposal_days")}</Label>
                <Input id={`p-days-${request.id}`} type="number" min={1} value={pf.days} onChange={(e) => setPf({ ...pf, days: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`p-mat-${request.id}`}>{t("concierge_materials")}</Label>
                <Input id={`p-mat-${request.id}`} value={pf.materials} onChange={(e) => setPf({ ...pf, materials: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`p-pers-${request.id}`}>{t("concierge_personalisation")}</Label>
                <Input id={`p-pers-${request.id}`} value={pf.personalisation} onChange={(e) => setPf({ ...pf, personalisation: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`p-disp-${request.id}`}>{t("shg_proposal_dispatch")}</Label>
                <Input id={`p-disp-${request.id}`} value={pf.dispatch} onChange={(e) => setPf({ ...pf, dispatch: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`p-cancel-${request.id}`}>{t("shg_proposal_cancellation")}</Label>
                <Input id={`p-cancel-${request.id}`} value={pf.cancellation} onChange={(e) => setPf({ ...pf, cancellation: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`p-changes-${request.id}`}>{t("shg_proposal_changes")}</Label>
                <Input id={`p-changes-${request.id}`} value={pf.changes} onChange={(e) => setPf({ ...pf, changes: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit" size="sm" disabled={proposeMut.isPending}>
                  {t("shg_send_proposal")}
                </Button>
                {latest && <span className="text-xs text-muted-foreground">{t("concierge_version", { n: latest.version + 1 })}</span>}
              </div>
            </form>
          )}

          {latest && !proposalOpen && (
            <p className="text-xs text-muted-foreground">
              {t("concierge_proposal_from", { shg: request.shg_name ?? "" })} · {t("concierge_version", { n: latest.version })} ·{" "}
              {customerApproved ? t("concierge_approved") : t("concierge_waiting_you")}
            </p>
          )}

          {note && (
            <p className="flex items-center gap-2 text-sm text-primary">
              <Info className="size-4" aria-hidden="true" />
              {note}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

function pickSpec(proposal: { spec: unknown }): Partial<ProposalFormState> {
  const s = proposal.spec as Record<string, unknown>;
  return {
    name: String(s["name"] ?? ""),
    description: String(s["description"] ?? ""),
    materials: String(s["materials"] ?? ""),
    personalisation: String(s["personalisation"] ?? ""),
    quantity: String(s["quantity"] ?? ""),
    price: String(s["price_per_unit_inr"] ?? ""),
    days: String(s["production_days"] ?? ""),
    dispatch: String(s["dispatch_terms"] ?? ""),
    cancellation: String(s["cancellation_terms"] ?? ""),
    changes: String(s["changes_from_request"] ?? ""),
  };
}

function CustomRequestsPage() {
  const { t } = useLang();
  const { data: requests } = useSuspenseQuery(customRequestsQuery());
  return (
    <div>
      <header>
        <h1 className="font-serif text-3xl">{t("shg_requests")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("shg_requests_sub")}</p>
        <div className="mt-3">
          <DemoBadge />
        </div>
      </header>
      <div className="mt-6 space-y-3">
        {(requests ?? []).map((r) => (
          <RequestReview key={r.id} request={r} />
        ))}
      </div>
    </div>
  );
}
