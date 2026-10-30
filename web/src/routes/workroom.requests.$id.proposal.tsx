/**
 * /workroom/requests/$id/proposal — Kalaswar Workroom Proposal Editor, Review & Version History
 *
 * Scoped under .kw-app.
 * Flows handled:
 * - Flow 6: Proposals inbox: accept, decline or revise, with version history
 * - Flow 9: FairPrice cost-sheet component inside product and quote pages
 * - RLS enforcement: Coordinators & Admins can accept/decline/revise; Artisans are read-only.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Send,
  Eye,
  Check,
  X,
  History,
  Package,
  XCircle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  useProposalDetail,
  useSubmitProposal,
  useApproveProposal,
  useDeclineProposal,
  useReviseProposal,
  type ProposalVersionDetail,
} from "@/features/proposals/hooks";
import { useAuth } from "@/features/auth";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { CostPlusTable } from "@/components/workroom/cost-plus-table";
import { FairPriceCostSheet } from "@/components/workroom/fair-price-cost-sheet";

export const Route = createFileRoute("/workroom/requests/$id/proposal")({
  head: () => ({
    meta: [{ title: "Proposal & FairPrice — Kalaswar Workroom" }],
  }),
  component: WorkroomProposalDetailPage,
});

function WorkroomProposalDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArtisan = user?.role === "artisan";

  const { data: proposal, isLoading, isError, error, refetch } = useProposalDetail(id);
  const submitProposal = useSubmitProposal();
  const approveProposal = useApproveProposal();
  const declineProposal = useDeclineProposal();
  const reviseProposal = useReviseProposal();

  const [buyerNote, setBuyerNote] = useState(
    "We've added your logo patch and split into 2 batches (Batch 1 by 12 Nov, Batch 2 by 19 Nov), as you asked.",
  );
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);

  // Modals state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return <KwLoadingState label="Loading proposal specifications…" retry={() => void refetch()} />;
  }

  if (isError || !proposal) {
    return (
      <KwErrorState
        title="Could not load proposal"
        detail={(error as Error)?.message || `Proposal '${id}' not found.`}
        retry={() => void refetch()}
      />
    );
  }

  const currentVerNum = proposal.current_version;
  const activeVersion = selectedVersionNum ?? currentVerNum;
  const versionObj = proposal.versions.find((v) => v.version === activeVersion);
  const spec = versionObj?.spec || proposal.current_spec;
  const isHistorical = activeVersion !== currentVerNum;
  const isLocked = proposal.status === "submitted" || proposal.status === "confirmed";

  const handleConfirmSubmit = async () => {
    setActionError(null);
    try {
      await submitProposal.mutateAsync(proposal.id);
      setSubmitModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to submit proposal.";
      setActionError(msg);
    }
  };

  const handleConfirmApprove = async () => {
    setActionError(null);
    try {
      await approveProposal.mutateAsync({
        id: proposal.id,
        payload: {
          version: activeVersion,
          approver_role: "coordinator",
          approver_name: user?.name || "Cluster Coordinator",
          notes: "Coordinator verified collective capacity, GI technique and living wage costing.",
        },
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to approve proposal.";
      setActionError(msg);
    }
  };

  const handleConfirmDecline = async () => {
    setActionError(null);
    if (!declineReason.trim()) {
      setActionError("Please provide a reason for declining this proposal.");
      return;
    }
    try {
      await declineProposal.mutateAsync({
        id: proposal.id,
        payload: {
          version: activeVersion,
          reason: declineReason.trim(),
          declined_by: user?.name || "Cluster Coordinator",
        },
      });
      setDeclineModalOpen(false);
      setDeclineReason("");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to decline proposal.";
      setActionError(msg);
    }
  };

  const handleConfirmRevise = async () => {
    setActionError(null);
    if (!revisionReason.trim()) {
      setActionError("Please specify a reason for revision.");
      return;
    }
    try {
      await reviseProposal.mutateAsync({
        id: proposal.id,
        payload: {
          reason_for_revision: revisionReason.trim(),
          new_spec: {
            ...proposal.current_spec,
            timeline_days: proposal.current_spec.timeline_days + 3,
          },
          revised_by: user?.name || "Cluster Coordinator",
        },
      });
      setReviseModalOpen(false);
      setRevisionReason("");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to revise proposal.";
      setActionError(msg);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div className="space-y-1">
          <Link
            to="/workroom/requests"
            className="inline-flex items-center gap-1.5 text-[var(--kw-primary)] kw-body-sm hover:underline w-fit"
          >
            <ArrowLeft className="size-4" />
            <span>Proposals</span>
          </Link>
          <div className="flex flex-wrap items-baseline gap-4 mt-0.5">
            <h1 className="kw-headline-xl text-[var(--kw-primary)]">
              {proposal.title}
            </h1>
            <span className="text-xs text-[var(--kw-on-surface-variant)]">
              {spec.quantity} units · KS-P-0042 · Version {activeVersion}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`kw-badge ${
                proposal.status === "confirmed"
                  ? "kw-badge-success"
                  : proposal.status === "declined"
                  ? "kw-badge-danger"
                  : isLocked
                  ? "kw-badge-primary"
                  : "kw-badge-warning"
              }`}
            >
              {proposal.status.toUpperCase()} · Version {activeVersion}
            </span>
            {isHistorical && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                Historical View (Immutable)
              </span>
            )}
          </div>
        </div>

        {/* Right utility actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/workroom/requests/$id/makepossible"
            params={{ id: proposal.id }}
            className="kw-btn kw-btn-secondary h-10 text-xs inline-flex items-center gap-1.5"
          >
            <Eye className="size-4 text-[var(--kw-on-surface-variant)]" />
            <span>MakePossible Result</span>
          </Link>
          <button
            type="button"
            className="size-10 rounded-lg bg-[var(--kw-surface-container)] text-[var(--kw-primary)] font-semibold text-xs flex items-center justify-center"
          >
            हि
          </button>
        </div>
      </header>

      {/* Global Error Alert */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {isArtisan && (
        <div
          role="status"
          className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
        >
          <ShieldAlert className="size-4 shrink-0 text-amber-600" />
          <span>
            <strong>Artisan Read-Only Mode:</strong> Proposal approvals, revisions, and declines are handled by SHG Coordinators and Admins.
          </span>
        </div>
      )}

      {/* ── Workspace Split ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8/12): Physical White Sheet Proposal Document + FairPrice Cost Sheet */}
        <div className="lg:col-span-8 space-y-6">
          {/* Flow 9: Transparent FairPrice Cost Sheet */}
          <FairPriceCostSheet
            price={spec.total_price_inr}
            showTitle={true}
          />

          <CostPlusTable
            proposal={{ ...proposal, current_spec: spec }}
            buyerNote={buyerNote}
            onBuyerNoteChange={setBuyerNote}
          />
        </div>

        {/* Right Column (4/12): Where this stands, Sample Tracking & Version Audit Log */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Where this stands */}
          <section className="kw-card p-5 space-y-4">
            <h4 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
              WHERE THIS STANDS
            </h4>

            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div className="flex flex-col items-center">
                <span className="size-2.5 rounded-full bg-[var(--kw-primary)] ring-2 ring-[var(--kw-primary)]/20 mb-1" />
                <span className="font-semibold text-[var(--kw-primary)]">Draft</span>
              </div>
              <div className={`flex flex-col items-center ${isLocked ? "text-[var(--kw-primary)] font-semibold" : "opacity-50"}`}>
                <span className={`size-2.5 rounded-full mb-1 ${isLocked ? "bg-[var(--kw-primary)]" : "bg-[var(--kw-outline-variant)]"}`} />
                <span>Sent</span>
              </div>
              <div className={`flex flex-col items-center ${proposal.status === "confirmed" ? "text-[var(--kw-primary)] font-semibold" : "opacity-50"}`}>
                <span className={`size-2.5 rounded-full mb-1 ${proposal.status === "confirmed" ? "bg-[var(--kw-primary)]" : "bg-[var(--kw-outline-variant)]"}`} />
                <span>Approved</span>
              </div>
              <div className={`flex flex-col items-center ${proposal.confirmed_order_id ? "text-[var(--kw-primary)] font-semibold" : "opacity-50"}`}>
                <span className={`size-2.5 rounded-full mb-1 ${proposal.confirmed_order_id ? "bg-[var(--kw-primary)]" : "bg-[var(--kw-outline-variant)]"}`} />
                <span>Ordered</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--kw-outline-variant)] text-xs text-[var(--kw-on-surface-variant)] space-y-1">
              <p>Two-Sided Approval Guard:</p>
              <p className="text-[11px]">
                Both Coordinator and Buyer must approve Version {activeVersion} for production allocations to unlock.
              </p>
            </div>
          </section>

          {/* 2. Sample Request Card */}
          <section className="kw-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
                PHYSICAL SAMPLE REQUEST
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary)] text-[10px] font-semibold">
                In Production
              </span>
            </div>

            <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-3 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-[var(--kw-primary)]">
                <span>Pre-production sample (1 unit)</span>
                <span>₹1,200</span>
              </div>
              <p className="text-[var(--kw-on-surface-variant)]">
                Verifying pastel sage dye lot and buyer corner logo patch placement before batch warping.
              </p>
            </div>
          </section>

          {/* 3. Flow 6: Version History & Switcher */}
          <section className="kw-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs flex items-center gap-1.5">
                <History className="size-3.5" />
                <span>VERSION AUDIT LOG</span>
              </h4>
              <span className="text-[11px] text-[var(--kw-on-surface-variant)] font-mono">
                {proposal.versions.length} versions
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {proposal.versions.map((ver) => {
                const isSelected = ver.version === activeVersion;
                const isCur = ver.version === currentVerNum;

                return (
                  <div
                    key={ver.version}
                    onClick={() => setSelectedVersionNum(ver.version)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--kw-surface-container-low)] border-[var(--kw-primary)] shadow-xs"
                        : "bg-white border-[var(--kw-outline-variant)] hover:bg-[var(--kw-surface-container-lowest)]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span>Version {ver.version}</span>
                        {isCur && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--kw-on-surface-variant)]">
                        {new Date(ver.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--kw-on-surface-variant)] mt-1">
                      Quantity: {ver.spec.quantity} units · ₹{ver.spec.total_price_inr.toLocaleString("en-IN")}
                    </p>

                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${ver.coordinator_approval ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                        Coordinator: {ver.coordinator_approval ? "Approved ✓" : "Pending"}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${ver.buyer_approval ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                        Buyer: {ver.buyer_approval ? "Approved ✓" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── Fixed Bottom Decision Bar (80px) ───────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 px-8 bg-[var(--kw-surface-container-lowest)] border-t border-[var(--kw-outline-variant)] flex items-center justify-between z-30 shadow-lg">
        <div className="flex flex-col">
          <span className="kw-label-md text-[var(--kw-primary)] font-semibold">
            Quote Total: ₹{spec.total_price_inr.toLocaleString("en-IN")} (Version {activeVersion})
          </span>
          <span className="text-xs text-[var(--kw-on-surface-variant)]">
            {spec.quantity} units · ₹{spec.unit_price_inr.toLocaleString("en-IN")} per piece
          </span>
        </div>

        {/* Flow 6 Actions: Accept, Decline, Revise, Submit */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={isArtisan || isHistorical}
            onClick={() => setDeclineModalOpen(true)}
            className="kw-btn kw-btn-secondary h-11 text-xs text-red-600 hover:bg-red-50 border-red-200 disabled:opacity-50"
            title={isArtisan ? "Requires Coordinator/Admin role" : "Decline proposal"}
          >
            <XCircle className="size-4" />
            <span className="hidden sm:inline">Decline</span>
          </button>

          <button
            type="button"
            disabled={isArtisan || isHistorical}
            onClick={() => setReviseModalOpen(true)}
            className="kw-btn kw-btn-secondary h-11 text-xs disabled:opacity-50"
            title={isArtisan ? "Requires Coordinator/Admin role" : "Revise specs or timeline"}
          >
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">Revise</span>
          </button>

          <button
            type="button"
            disabled={isArtisan || isHistorical || approveProposal.isPending}
            onClick={() => void handleConfirmApprove()}
            className="kw-btn h-11 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            title={isArtisan ? "Requires Coordinator/Admin role" : "Approve this version"}
          >
            <Check className="size-4" />
            <span>Approve V{activeVersion}</span>
          </button>

          <button
            type="button"
            disabled={isHistorical || isLocked || isArtisan || submitProposal.isPending}
            onClick={() => setSubmitModalOpen(true)}
            className="kw-btn kw-btn-primary h-11 text-xs shadow-sm disabled:opacity-50"
          >
            <Send className="size-4" />
            <span>{isLocked ? "Sent to Buyer" : "Submit to Buyer"}</span>
          </button>
        </div>
      </footer>

      {/* ── Decline Modal ─────────────────────────────────────────────────── */}
      {declineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-4 border border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="size-5 text-red-600" />
                <h3 className="kw-headline-sm text-[var(--kw-primary)]">Decline Proposal</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[var(--kw-on-surface-variant)]">
                Declining this quote will record the reason in the proposal version history and notify the buyer team.
              </p>
              <div className="space-y-1">
                <label className="kw-label-sm uppercase tracking-wider text-[11px] text-[var(--kw-on-surface-variant)]">
                  Reason for Declining (Required)
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Cluster capacity fully booked for November; cannot meet 12 Nov delivery deadline."
                  className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="kw-btn kw-btn-secondary h-10 text-xs"
                onClick={() => setDeclineModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={declineProposal.isPending || !declineReason.trim()}
                className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50"
                onClick={() => void handleConfirmDecline()}
              >
                {declineProposal.isPending ? "Declining…" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revise Modal ──────────────────────────────────────────────────── */}
      {reviseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-4 border border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-5 text-[var(--kw-primary)]" />
                <h3 className="kw-headline-sm text-[var(--kw-primary)]">Revise Proposal Specification</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviseModalOpen(false)}
                className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[var(--kw-on-surface-variant)]">
                Creating a revision will increment the proposal to <strong>Version {currentVerNum + 1}</strong> and archive Version {currentVerNum} to the audit trail.
              </p>
              <div className="space-y-1">
                <label className="kw-label-sm uppercase tracking-wider text-[11px] text-[var(--kw-on-surface-variant)]">
                  Revision Reason (Required)
                </label>
                <textarea
                  rows={3}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Buyer requested extending batch timeline by +3 days and updating thread specification."
                  className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="kw-btn kw-btn-secondary h-10 text-xs"
                onClick={() => setReviseModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviseProposal.isPending || !revisionReason.trim()}
                className="kw-btn kw-btn-primary h-10 text-xs disabled:opacity-50"
                onClick={() => void handleConfirmRevise()}
              >
                {reviseProposal.isPending ? "Creating Revision…" : "Create Version " + (currentVerNum + 1)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Confirmation Modal ─────────────────────────────────────── */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-[var(--kw-primary)]" />
                <h3 className="kw-headline-sm text-[var(--kw-primary)]">Submit Proposal</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--kw-on-surface)]">
              <p>
                Submitting this proposal will lock <strong>Version {activeVersion}</strong> against silent modifications and transmit the quote directly to the buyer for formal approval.
              </p>
              <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-3 border border-[var(--kw-outline-variant)]">
                <div className="flex justify-between font-semibold text-[var(--kw-primary)]">
                  <span>Total Amount</span>
                  <span>₹{spec.total_price_inr.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-[var(--kw-on-surface-variant)] mt-1">
                  Delivery: Batch 1 by 12 Nov, Batch 2 by 19 Nov
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="kw-btn kw-btn-secondary h-10 text-xs"
                onClick={() => setSubmitModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitProposal.isPending}
                className="kw-btn kw-btn-primary h-10 text-xs"
                onClick={() => void handleConfirmSubmit()}
              >
                {submitProposal.isPending ? "Submitting…" : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
