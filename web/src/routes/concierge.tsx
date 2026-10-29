import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles, Send, CheckCircle2, CircleAlert, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { DemoBadge } from "@/components/demo-note";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  assessFeasibility,
  type CollectiveSnapshot,
  type FeasibilityAssessment,
  type FeasibilityStatus,
} from "@/lib/makepossible";
import {
  approveProposal,
  collectiveSnapshotsQuery,
  confirmCustomOrder,
  createCustomRequest,
  customRequestsQuery,
  fetchApprovalsForProposals,
  fetchProposalsForRequest,
  productsQuery,
  requestRevision,
  sendRequestToShg,
  attachComparables,
  type CustomRequestWithShg,
} from "@/lib/data";
import type { Proposal } from "@/lib/types";

export const Route = createFileRoute("/concierge")({
  head: () => ({
    meta: [
      { title: "Gift Concierge — Kalaswar" },
      {
        name: "description",
        content:
          "Describe the handmade gift you imagine. MakePossible checks it against what women-led artisan collectives can genuinely make, and a coordinator proposes the terms you approve.",
      },
      { property: "og:title", content: "Gift Concierge — Kalaswar" },
      {
        property: "og:description",
        content: "Imagine it. We'll find out if it can be made.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(collectiveSnapshotsQuery());
    void context.queryClient.ensureQueryData(customRequestsQuery());
    void context.queryClient.ensureQueryData(productsQuery());
  },
  component: ConciergePage,
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
  feasible_with_changes: "border-terracotta/40 bg-terracotta/10 text-terracotta",
  not_currently_feasible: "border-destructive/40 bg-destructive/10 text-destructive",
  insufficient_information: "border-border bg-muted text-muted-foreground",
};

function statusKey(status: FeasibilityStatus): string {
  return `concierge_status_${status}`;
}

function AssessmentCard({
  snap,
  assessment,
  shgName,
  onSend,
  assigned,
}: {
  snap: CollectiveSnapshot;
  assessment: FeasibilityAssessment;
  shgName: string;
  onSend: () => void;
  assigned: boolean;
}) {
  const { t } = useLang();
  const d = assessment.dataUsed;
  return (
    <div className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{shgName}</p>
          <p className="text-sm text-muted-foreground">{snap.shg.name === shgName ? "" : snap.shg.name}</p>
        </div>
        <Badge variant="outline" className={STATUS_BADGE[assessment.status]}>
          {t(statusKey(assessment.status))}
        </Badge>
      </div>

      {(assessment.reasons.length > 0 || assessment.missing.length > 0 || assessment.notes.length > 0) && (
        <div className="mt-4 space-y-3 text-sm">
          {assessment.reasons.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("concierge_reasons")}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {assessment.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {assessment.missing.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CircleAlert className="size-3.5" aria-hidden="true" />
                {t("concierge_missing")}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {assessment.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {assessment.suggestedChanges.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("concierge_changes")}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {assessment.suggestedChanges.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {assessment.notes.length > 0 && (
            <div>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {assessment.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {assessment.reasons.length === 0 && assessment.missing.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
          {t("concierge_reasons")}: {t("concierge_status_potentially_feasible").toLowerCase()}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{t("concierge_basis")}:</span>
        {d.matchedSkills.length > 0 && (
          <span>{t("concierge_basis_skills", { list: d.matchedSkills.join(", ") })}</span>
        )}
        {d.monthlyCapacity != null && <span>{t("concierge_basis_capacity", { n: d.monthlyCapacity })}</span>}
        <span>{t("concierge_basis_workload", { n: d.activeWorkloadUnits })}</span>
        {d.estimatedProductionDays != null && (
          <span>{t("concierge_basis_days", { n: d.estimatedProductionDays })}</span>
        )}
      </div>

      <div className="mt-4">
        {assessment.status === "not_currently_feasible" ? (
          <Button variant="outline" size="sm" disabled>
            {t("concierge_no_send")}
          </Button>
        ) : assigned ? (
          <Button variant="outline" size="sm" disabled>
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button size="sm" onClick={onSend}>
            <Send className="size-4" aria-hidden="true" />
            {t("concierge_send")}
          </Button>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: CustomRequestWithShg }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const proposalsQ = useQuery({
    queryKey: ["proposalsFor", request.id],
    queryFn: () => fetchProposalsForRequest(request.id),
    enabled: open,
  });
  const latest: Proposal | undefined = proposalsQ.data?.[0];
  const approvalsQ = useQuery({
    queryKey: ["approvalsFor", latest?.id ?? ""],
    queryFn: () => fetchApprovalsForProposals([latest!.id]),
    enabled: open && !!latest,
  });
  const approvals = approvalsQ.data ?? [];
  const customerApproved = approvals.some((a) => a.approver_role === "customer");
  const coordinatorApproved = approvals.some((a) => a.approver_role === "coordinator");

  const confirmedOrderId = String(
    (request.structured as { confirmed_order_id?: string } | null)?.confirmed_order_id ?? "",
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["customRequests"] });
    void queryClient.invalidateQueries({ queryKey: ["proposalsFor", request.id] });
    void queryClient.invalidateQueries({ queryKey: ["approvalsFor"] });
  };

  const approveMut = useMutation({
    mutationFn: () => approveProposal(latest!.id, "customer"),
    onSuccess: () => {
      invalidate();
      setNote(t("concierge_waiting_coordinator"));
    },
  });
  const reviseMut = useMutation({
    mutationFn: () => requestRevision(request.id, revisionNote),
    onSuccess: () => {
      invalidate();
      setRevisionNote("");
      setNote(t("concierge_revision_sent"));
    },
  });
  const confirmMut = useMutation({
    mutationFn: () => confirmCustomOrder(request.id),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      setNote(t("concierge_confirmed"));
    },
    onError: (e) => setNote((e as Error).message),
  });

  const declinedReason =
    request.status === "declined"
      ? String(
          (request.structured as { decline_reason?: string } | null)?.decline_reason ??
            "—",
        )
      : null;

  return (
    <div className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          <span className="font-mono text-sm text-muted-foreground">{request.request_code}</span>
          <span className="ml-2 font-medium">{request.title}</span>
        </span>
        <Badge variant="outline" className="border-border text-muted-foreground">
          {request.status.replace(/_/g, " ")}
        </Badge>
      </button>
      {request.shg_name && (
        <p className="mt-1 text-sm text-muted-foreground">{request.shg_name}</p>
      )}
      {declinedReason && (
        <p className="mt-2 text-sm text-destructive">
          {t("concierge_declined", { reason: declinedReason })}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          <p className="text-muted-foreground">{request.brief}</p>

          {latest && (
            <div className="border border-border bg-secondary p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {t("concierge_proposal_from", { shg: request.shg_name ?? "" })}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t("concierge_version", { n: latest.version })}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {latest.spec.name && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("shg_proposal_name")}
                    </dt>
                    <dd>{latest.spec.name}</dd>
                  </div>
                )}
                {latest.spec.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("shg_proposal_desc")}
                    </dt>
                    <dd>{latest.spec.description}</dd>
                  </div>
                )}
                {latest.spec["materials"] && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("concierge_materials")}
                    </dt>
                    <dd>{latest.spec["materials"]}</dd>
                  </div>
                )}
                {latest.spec.personalisation && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("concierge_personalisation")}
                    </dt>
                    <dd>{latest.spec.personalisation}</dd>
                  </div>
                )}
                {latest.spec.price_per_unit_inr != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("concierge_price", {
                        price: latest.spec.price_per_unit_inr,
                        total: latest.spec.total_inr ?? latest.spec.price_per_unit_inr * (latest.spec["quantity"] ?? 1),
                      })}
                    </dt>
                    <dd>
                      {t("concierge_price", {
                        price: latest.spec.price_per_unit_inr,
                        total: latest.spec.total_inr ?? latest.spec.price_per_unit_inr * (latest.spec["quantity"] ?? 1),
                      })}
                    </dd>
                  </div>
                )}
                {latest.spec.production_days != null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("concierge_deadline")}
                    </dt>
                    <dd>{t("concierge_days", { n: latest.spec.production_days })}</dd>
                  </div>
                )}
                {latest.spec.dispatch_terms && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("shg_proposal_dispatch")}
                    </dt>
                    <dd>{latest.spec.dispatch_terms}</dd>
                  </div>
                )}
                {latest.spec.cancellation_terms && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("shg_proposal_cancellation")}
                    </dt>
                    <dd>{latest.spec.cancellation_terms}</dd>
                  </div>
                )}
                {latest.spec.changes_from_request && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("concierge_changes")}
                    </dt>
                    <dd>{t("concierge_changes_from_request", { note: latest.spec.changes_from_request })}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {coordinatorApproved ? (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                    {t("shg_coordinator_approve")} · {t("concierge_approved")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {t("concierge_waiting_coordinator")}
                  </Badge>
                )}
                {customerApproved ? (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                    {t("concierge_approved")}
                  </Badge>
                ) : (
                  <Button size="sm" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
                    {t("concierge_approve")}
                  </Button>
                )}
              </div>

              {customerApproved && coordinatorApproved && request.status !== "confirmed" && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
                    {t("concierge_confirm_order")}
                  </Button>
                </div>
              )}
              {request.status === "confirmed" && confirmedOrderId && (
                <p className="mt-3">
                  <Link
                    to="/orders/$id"
                    params={{ id: confirmedOrderId }}
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    {t("ord_track")}
                  </Link>
                </p>
              )}
            </div>
          )}

          {request.status !== "declined" && request.status !== "confirmed" && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1">
                <Label htmlFor={`rev-${request.id}`}>{t("concierge_revision")}</Label>
                <Input
                  id={`rev-${request.id}`}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder={t("concierge_revision_ph")}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reviseMut.mutate()}
                disabled={reviseMut.isPending || !revisionNote.trim()}
              >
                {t("concierge_revision")}
              </Button>
            </div>
          )}

          {note && (
            <p className="flex items-center gap-2 text-sm text-primary">
              <Info className="size-4" aria-hidden="true" />
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ConciergePage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: snapshots } = useSuspenseQuery(collectiveSnapshotsQuery());
  const { data: products } = useSuspenseQuery(productsQuery());
  const { data: requests } = useSuspenseQuery(customRequestsQuery());

  const [activeId, setActiveId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    brief: "",
    occasion: "",
    recipient: "",
    style: "",
    craft: "",
    materials: "",
    personalisation: "",
    quantity: "",
    budget: "",
    deadline: "",
    destination: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const createMut = useMutation({
    mutationFn: () =>
      createCustomRequest({
        title: form.title.trim(),
        brief: form.brief.trim(),
        structured: {
          occasion: form.occasion.trim() || null,
          recipient: form.recipient.trim() || null,
          style: form.style.trim() || null,
          craft_preference: form.craft.trim() || null,
          materials: form.materials.trim() || null,
          personalisation: form.personalisation.trim() || null,
          quantity: Number(form.quantity) || null,
          budget_inr_per_unit: form.budget ? Number(form.budget) : null,
          deadline_in_days: form.deadline ? Number(form.deadline) : null,
          destination: form.destination.trim() || null,
        },
      }),
    onSuccess: (created) => {
      setActiveId(created.id);
      setCreatedCode(created.request_code);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["customRequests"] });
    },
    onError: (e) => setFormError((e as Error).message),
  });

  const sendMut = useMutation({
    mutationFn: ({ requestId, shgId }: { requestId: string; shgId: string }) =>
      sendRequestToShg(requestId, shgId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customRequests"] });
    },
  });

  const activeRequest = activeId ? requests?.find((r) => r.id === activeId) ?? null : null;
  const spec = (activeRequest?.structured ?? {}) as Record<string, unknown>;
  const categoryTokens = [
    ...tokensOf(String(spec["craft_preference"] ?? "")),
    ...tokensOf(String(spec["materials"] ?? "")),
  ];
  const assessed: { snap: CollectiveSnapshot; assessment: FeasibilityAssessment }[] | null =
    activeRequest && spec["quantity"]
      ? attachComparables(snapshots, products, categoryTokens).map((snap) => ({
          snap,
          assessment: assessFeasibility(
            {
              quantity: Number(spec["quantity"]),
              craft_preference: (spec["craft_preference"] as string) ?? null,
              materials: (spec["materials"] as string) ?? null,
              budget_inr_per_unit: (spec["budget_inr_per_unit"] as number) ?? null,
              deadline_in_days: (spec["deadline_in_days"] as number) ?? null,
            },
            snap,
          ),
        }))
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-24 md:px-6">
      <SiteHeader />
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {t("concierge_kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl">{t("concierge_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("concierge_sub")}</p>
        <p className="mt-2 text-sm text-muted-foreground/80">{t("concierge_journey")}</p>
        <div className="mt-4">
          <DemoBadge />
        </div>
      </header>

      {/* Start a request */}
      <section className="mt-10 border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <h2 className="font-display text-2xl">{t("concierge_new_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("concierge_new_sub")}</p>
        <form
          className="mt-6 grid gap-6 sm:grid-cols-2 [&_label]:mb-2 [&_label]:block [&_label]:text-sm [&_label]:font-medium [&_input]:h-12 [&_input]:border-border [&_input]:bg-background [&_textarea]:border-border [&_textarea]:bg-background"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim() || !form.brief.trim() || !form.quantity) {
              setFormError(t("concierge_required"));
              return;
            }
            setFormError(null);
            createMut.mutate();
          }}
        >
          <div className="grid gap-5 border border-border bg-secondary p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg sm:col-span-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="c-title">{t("shg_proposal_name")} *</Label>
            <Input id="c-title" value={form.title} onChange={set("title")} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="c-brief">{t("concierge_brief")} *</Label>
            <Textarea id="c-brief" value={form.brief} onChange={set("brief")} placeholder={t("concierge_brief_ph")} rows={3} required />
          </div>
          </div>
          <div className="grid gap-5 border border-border bg-secondary p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg sm:col-span-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-occasion">{t("concierge_occasion")}</Label>
            <Input id="c-occasion" value={form.occasion} onChange={set("occasion")} />
          </div>
          <div>
            <Label htmlFor="c-recipient">{t("concierge_recipient")}</Label>
            <Input id="c-recipient" value={form.recipient} onChange={set("recipient")} />
          </div>
          <div>
            <Label htmlFor="c-style">{t("concierge_style")}</Label>
            <Input id="c-style" value={form.style} onChange={set("style")} />
          </div>
          <div>
            <Label htmlFor="c-craft">{t("concierge_craft")}</Label>
            <Input id="c-craft" value={form.craft} onChange={set("craft")} />
          </div>
          <div>
            <Label htmlFor="c-materials">{t("concierge_materials")}</Label>
            <Input id="c-materials" value={form.materials} onChange={set("materials")} />
          </div>
          <div>
            <Label htmlFor="c-pers">{t("concierge_personalisation")}</Label>
            <Input id="c-pers" value={form.personalisation} onChange={set("personalisation")} />
          </div>
          </div>
          <div className="grid gap-5 border border-border bg-secondary p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg sm:col-span-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-qty">{t("concierge_quantity")} *</Label>
            <Input id="c-qty" type="number" min={1} value={form.quantity} onChange={set("quantity")} required />
          </div>
          <div>
            <Label htmlFor="c-budget">{t("concierge_budget")}</Label>
            <Input id="c-budget" type="number" min={0} value={form.budget} onChange={set("budget")} />
          </div>
          <div>
            <Label htmlFor="c-deadline">{t("concierge_deadline")}</Label>
            <Input id="c-deadline" type="number" min={1} value={form.deadline} onChange={set("deadline")} />
          </div>
          <div>
            <Label htmlFor="c-dest">{t("concierge_destination")}</Label>
            <Input id="c-dest" value={form.destination} onChange={set("destination")} />
          </div>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={createMut.isPending}>
              <Sparkles className="size-4" aria-hidden="true" />
              {t("concierge_create")}
            </Button>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
        </form>
      </section>

      {/* MakePossible results for the active request */}
      {activeRequest && assessed && (
        <section className="mt-10">
          <h2 className="font-display text-2xl">{t("concierge_check_title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("concierge_check_sub")}</p>
          {createdCode && (
            <p className="mt-3 flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t("concierge_created", { code: createdCode })}
            </p>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {assessed.map(({ snap, assessment }) => (
              <AssessmentCard
                key={snap.shg.id}
                snap={snap}
                assessment={assessment}
                shgName={snap.shg.name}
                assigned={activeRequest.shg_id === snap.shg.id}
                onSend={() =>
                  sendMut.mutate({ requestId: activeRequest.id, shgId: snap.shg.id })
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Requests + proposals */}
      <section className="mt-12">
        <h2 className="font-display text-2xl">{t("concierge_requests_title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("concierge_requests_sub")}</p>
        <div className="mt-5 space-y-3">
          {(requests ?? []).length === 0 && (
            <p className="border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">{t("concierge_none_yet")}</p>
          )}
          {(requests ?? []).map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        {t("footer_demo")}{" "}
        <Link to="/explore" className="text-primary underline underline-offset-4">
          {t("nav_explore")}
        </Link>
      </p>
    </div>
  );
}
