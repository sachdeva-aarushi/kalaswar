/**
 * /workroom/requests/$id/proposal — Kalaswar Workroom Proposal Editor & Review
 *
 * Stitch Screen ID: b903b572ed3f4cd88593db6aff6bc272
 * Scoped under .kw-app.
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
} from "lucide-react";
import {
  useProposalDetail,
  useSubmitProposal,
} from "@/features/proposals/hooks";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { CostPlusTable } from "@/components/workroom/cost-plus-table";

export const Route = createFileRoute("/workroom/requests/$id/proposal")({
  head: () => ({
    meta: [{ title: "Proposal — Kalaswar Workroom" }],
  }),
  component: WorkroomProposalDetailPage,
});

function WorkroomProposalDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: proposal, isLoading, isError, error, refetch } = useProposalDetail(id);
  const submitProposal = useSubmitProposal();

  const [buyerNote, setBuyerNote] = useState(
    "We've added your logo patch and split into 2 batches (Batch 1 by 12 Nov, Batch 2 by 19 Nov), as you asked.",
  );
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const spec = proposal.current_spec;
  const isLocked = proposal.status === "submitted" || proposal.status === "confirmed";

  const handleConfirmSubmit = async () => {
    await submitProposal.mutateAsync(proposal.id);
    setIsSubmitted(true);
    setSubmitModalOpen(false);
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
              {spec.quantity} units · KS-P-0042 · Version {proposal.current_version}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`kw-badge ${
                proposal.status === "confirmed"
                  ? "kw-badge-success"
                  : isLocked || isSubmitted
                  ? "kw-badge-primary"
                  : "kw-badge-warning"
              }`}
            >
              {isSubmitted ? "Submitted · Version Locked" : `${proposal.status.toUpperCase()} · Version ${proposal.current_version}`}
            </span>
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

      {/* ── Workspace Split ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8/12): Physical White Sheet Proposal Document */}
        <div className="lg:col-span-8">
          <CostPlusTable
            proposal={proposal}
            buyerNote={buyerNote}
            onBuyerNoteChange={setBuyerNote}
          />
        </div>

        {/* Right Column (4/12): Where this stands & Marginalia */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Where this stands (4-step progress) */}
          <section className="kw-card p-5 space-y-4">
            <h4 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
              WHERE THIS STANDS
            </h4>

            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div className="flex flex-col items-center">
                <span className="size-2.5 rounded-full bg-[var(--kw-primary)] ring-2 ring-[var(--kw-primary)]/20 mb-1" />
                <span className="font-semibold text-[var(--kw-primary)]">Draft</span>
              </div>
              <div className={`flex flex-col items-center ${isLocked || isSubmitted ? "text-[var(--kw-primary)] font-semibold" : "opacity-50"}`}>
                <span className={`size-2.5 rounded-full mb-1 ${isLocked || isSubmitted ? "bg-[var(--kw-primary)]" : "bg-[var(--kw-outline-variant)]"}`} />
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
                Both Coordinator and Buyer must approve Version {proposal.current_version} for work to begin.
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

          {/* 3. Version History & Diffs */}
          <section className="kw-card p-5 space-y-3">
            <h4 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
              VERSION AUDIT LOG
            </h4>

            <div className="space-y-2.5 text-xs">
              {proposal.versions.map((ver) => (
                <div
                  key={ver.version}
                  className={`p-3 rounded-xl border ${
                    ver.version === proposal.current_version
                      ? "bg-[var(--kw-surface-container-low)] border-[var(--kw-primary)]"
                      : "bg-white border-[var(--kw-outline-variant)] opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Version {ver.version} {ver.version === proposal.current_version && "(Current)"}</span>
                    <span className="font-mono text-[11px] text-[var(--kw-on-surface-variant)]">
                      {new Date(ver.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[var(--kw-on-surface-variant)] mt-1">
                    {ver.version === 2 ? "+ Corner logo patch added, Batch 2 moved to 19 Nov" : "Initial proposal draft"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Fixed Bottom Decision Bar (80px) ───────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 px-8 bg-[var(--kw-surface-container-lowest)] border-t border-[var(--kw-outline-variant)] flex items-center justify-between z-30 shadow-lg">
        <div className="flex flex-col">
          <span className="kw-label-md text-[var(--kw-primary)] font-semibold">
            Quote Total: ₹{spec.total_price_inr.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-[var(--kw-on-surface-variant)]">
            {spec.quantity} units · ₹{spec.unit_price_inr.toLocaleString("en-IN")} per piece
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="kw-btn kw-btn-secondary h-11 text-xs"
            onClick={() => void navigate({ to: "/workroom/requests" })}
          >
            Back to Requests
          </button>
          <button
            type="button"
            disabled={isLocked || isSubmitted || submitProposal.isPending}
            onClick={() => setSubmitModalOpen(true)}
            className="kw-btn kw-btn-primary h-11 text-xs shadow-sm"
          >
            <Send className="size-4" />
            <span>{isSubmitted ? "Submitted to Buyer" : "Submit Proposal to Buyer"}</span>
          </button>
        </div>
      </footer>

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
                Submitting this proposal will lock <strong>Version {proposal.current_version}</strong> against silent modifications and transmit the quote directly to the buyer for formal approval.
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
