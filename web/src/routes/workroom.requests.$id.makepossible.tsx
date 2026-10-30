/**
 * /workroom/requests/$id/makepossible — MakePossible Feasibility Result & Assessment
 *
 * Stitch Screen ID: 6e684ee84d01422b8fe15f892a18703c
 * Scoped under .kw-app.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Sparkles,
  FileText,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useProposalDetail } from "@/features/proposals/hooks";
import {
  useEvaluateFeasibility,
  type MakePossibleEvaluationResult,
} from "@/features/makepossible/hooks";
import { useInventorySummary } from "@/features/inventory/hooks";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { ScoreRadarCard } from "@/components/workroom/score-radar-card";

export const Route = createFileRoute("/workroom/requests/$id/makepossible")({
  head: () => ({
    meta: [{ title: "MakePossible Result — Kalaswar Workroom" }],
  }),
  component: WorkroomMakePossiblePage,
});

function WorkroomMakePossiblePage() {
  const { id } = Route.useParams();
  const { data: proposal, isLoading, isError, error, refetch: refetchProposal } = useProposalDetail(id);
  const { data: inventorySummary } = useInventorySummary();
  const evaluateFeasibility = useEvaluateFeasibility();

  const [evaluation, setEvaluation] = useState<MakePossibleEvaluationResult | null>(null);

  const runEvaluation = () => {
    evaluateFeasibility.mutate(
      {
        request: {
          quantity: proposal?.current_spec.quantity ?? 500,
          craft_preference: proposal?.current_spec.craft ?? "Kantha hand embroidery",
          materials: proposal?.current_spec.materials_summary ?? "Cotton canvas and threads",
          budget_inr_total: 425000,
          deadline_in_days: proposal?.current_spec.timeline_days ?? 20,
        },
        snapshot: {
          shg_id: "bbbbbbbb-0001-0000-0000-000000000001",
          shg_name: "Santiniketan Mahila Hastakala Samiti",
          monthly_capacity: 120,
          skills: [
            { skill: "Kantha hand embroidery", level: "expert" },
            { skill: "Piping & seam assembly", level: "core" },
          ],
          materials: [
            { name: "Cotton canvas (10oz Raw)", unit: "meters", quantity: 120, low_stock_threshold: 40 },
            { name: "Sal-forest green thread", unit: "skeins", quantity: 18, low_stock_threshold: 30 },
          ],
          active_workload_units: 30,
        },
      },
      {
        onSuccess: (data) => {
          setEvaluation(data);
        },
      },
    );
  };

  useEffect(() => {
    if (proposal) {
      runEvaluation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal?.id]);

  if (isLoading) {
    return <KwLoadingState label="Loading request & evaluating capability…" retry={() => void refetchProposal()} />;
  }

  if (isError || !proposal) {
    return (
      <KwErrorState
        title="Could not evaluate request"
        detail={(error as Error)?.message || `Proposal / request '${id}' not found.`}
        retry={() => void refetchProposal()}
      />
    );
  }

  const spec = proposal.current_spec;

  return (
    <div className="space-y-6 pb-28">
      {/* ── Top Header Zone ────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div className="space-y-1">
          <Link
            to="/workroom/requests"
            className="inline-flex items-center gap-1.5 text-[var(--kw-primary)] kw-body-sm hover:underline w-fit"
          >
            <ArrowLeft className="size-4" />
            <span>Requests</span>
          </Link>
          <div className="flex flex-wrap items-baseline gap-4 mt-0.5">
            <h1 className="kw-headline-xl text-[var(--kw-primary)]">
              {proposal.title}
            </h1>
            <span className="text-xs text-[var(--kw-on-surface-variant)]">
              Aarav Tech Pvt Ltd · Due 12 Nov · Budget ₹4,25,000
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--kw-primary)] font-semibold">
            <Sparkles className="size-3.5" />
            <span>Ready to review · Evaluated via Collective Data Mesh</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runEvaluation}
            disabled={evaluateFeasibility.isPending}
            className="kw-btn kw-btn-secondary h-10 text-xs inline-flex items-center gap-2"
          >
            <RefreshCw className={`size-3.5 ${evaluateFeasibility.isPending ? "animate-spin" : ""}`} />
            <span>Run again</span>
          </button>
          <button
            type="button"
            className="size-10 rounded-lg bg-[var(--kw-surface-container)] text-[var(--kw-primary)] font-semibold text-xs flex items-center justify-center"
          >
            हि
          </button>
        </div>
      </header>

      {/* ── Main Score Radar & Criteria Checklist ──────────────────────────── */}
      {evaluation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8/12): Score Radar Card & 5 Criteria */}
          <div className="lg:col-span-8 space-y-6">
            <ScoreRadarCard result={evaluation} />
          </div>

          {/* Right Column (4/12): Operational Summary & Proceed to Proposal */}
          <div className="lg:col-span-4 space-y-6">
            {/* Proceed to Proposal Card */}
            <div className="kw-card p-5 space-y-4 bg-[var(--kw-surface-container-low)]">
              <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs block">
                Next Step
              </span>
              <div className="space-y-1">
                <h3 className="kw-headline-sm text-[var(--kw-primary)] font-semibold">
                  Generate Proposal
                </h3>
                <p className="kw-body-sm text-[var(--kw-on-surface-variant)] text-xs">
                  Create a versioned commercial quote with the 2-batch schedule and cost-plus build-up.
                </p>
              </div>

              <Link
                to="/workroom/requests/$id/proposal"
                params={{ id: proposal.id }}
                className="w-full kw-btn kw-btn-primary h-11 text-xs justify-center shadow-sm"
              >
                <FileText className="size-4" />
                <span>Open Proposal Editor</span>
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </div>

            {/* Inventory cluster context */}
            <div className="kw-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-[var(--kw-primary)]" />
                <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
                  Cluster Inventory Status
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--kw-outline-variant)]">
                  <span>Tracked Materials:</span>
                  <span className="font-semibold text-[var(--kw-primary)]">
                    {inventorySummary?.total_materials ?? 12} items
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--kw-outline-variant)]">
                  <span>Materials below threshold:</span>
                  <span className="font-semibold text-[var(--kw-secondary)]">
                    {inventorySummary?.low_stock_count ?? 3} items
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Stale inventory counts:</span>
                  <span className="font-semibold text-[var(--kw-tertiary-container)]">
                    {inventorySummary?.stale_materials_count ?? 1} items
                  </span>
                </div>
              </div>
              <Link
                to="/workroom/inventory"
                className="text-xs text-[var(--kw-primary)] hover:underline inline-flex items-center gap-1 font-semibold pt-1"
              >
                <span>Manage raw materials</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <KwLoadingState label="Computing MakePossible feasibility matrix…" />
      )}
    </div>
  );
}
