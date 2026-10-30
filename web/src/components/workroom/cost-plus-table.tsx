/**
 * Kalaswar Workroom — Proposal Physical Sheet & Cost-Plus Spec Document
 *
 * Scoped under .kw-app.
 * Renders the white physical sheet proposal document with diff highlighting:
 * - Version diff indicators ("Show changes" / "Clean view")
 * - Specifications grid
 * - Two-batch delivery schedule
 * - Cost breakdown with line items and delta badges
 * - Commercial payment terms
 * - Note to buyer
 */

import { useState } from "react";
import { CheckCircle2, History, PlusCircle, Info, Edit3 } from "lucide-react";
import type { ProposalResponse } from "@/features/proposals/hooks";

interface CostPlusTableProps {
  proposal: ProposalResponse;
  buyerNote: string;
  onBuyerNoteChange: (val: string) => void;
}

export function CostPlusTable({
  proposal,
  buyerNote,
  onBuyerNoteChange,
}: CostPlusTableProps) {
  const [showChanges, setShowChanges] = useState(true);

  const spec = proposal.current_spec;
  const isV2 = proposal.current_version > 1;

  return (
    <div className="space-y-5">
      {/* ── Sub-Bar Controls ──────────────────────────────────────────────── */}
      <div className="max-w-[720px] mx-auto flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary)] text-xs font-medium">
          <span className="font-bold">✦</span>
          <span>Created from MakePossible feasibility evaluation</span>
        </div>

        {/* Diff mode toggle */}
        <div className="inline-flex h-9 p-1 rounded-lg bg-[var(--kw-surface-container)] border border-[var(--kw-outline-variant)] text-xs">
          <button
            type="button"
            onClick={() => setShowChanges(true)}
            className={`px-3 rounded-md font-semibold transition-all ${
              showChanges
                ? "bg-[var(--kw-surface-container-lowest)] text-[var(--kw-primary)] shadow-sm"
                : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-primary)]"
            }`}
          >
            Show changes
          </button>
          <button
            type="button"
            onClick={() => setShowChanges(false)}
            className={`px-3 rounded-md font-semibold transition-all ${
              !showChanges
                ? "bg-[var(--kw-surface-container-lowest)] text-[var(--kw-primary)] shadow-sm"
                : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-primary)]"
            }`}
          >
            Clean view
          </button>
        </div>
      </div>

      {/* ── The White Physical Sheet ──────────────────────────────────────── */}
      <article className="max-w-[720px] mx-auto bg-white rounded-2xl border border-[var(--kw-outline-variant)] p-8 md:p-12 shadow-sm text-[var(--kw-on-surface)] space-y-8">
        {/* Document Masthead */}
        <div className="border-b border-[var(--kw-outline-variant)] pb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-[11px]">
              PROPOSAL · VERSION {proposal.current_version}
            </span>
            <span className="text-xs font-mono text-[var(--kw-on-surface-variant)]">
              REF: KS-P-0042-V{proposal.current_version}
            </span>
          </div>
          <h2 className="kw-headline-lg text-[var(--kw-primary)]">
            {proposal.title}
          </h2>
          <div className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Prepared by <span className="font-semibold text-[var(--kw-on-surface)]">Sunita Devi</span>, Bhagirathi Cluster · 30 Oct 2026
          </div>
        </div>

        {/* Section 1: ORDER SPECIFICATIONS */}
        <section className="space-y-4">
          <h3 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
            ORDER SPECIFICATIONS
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[10px] block">
                Quantity
              </span>
              <span className="font-semibold text-[var(--kw-primary)] text-sm">{spec.quantity} units</span>
            </div>
            <div>
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[10px] block">
                Size
              </span>
              <span className="font-semibold text-[var(--kw-primary)] text-sm">34 × 25 cm, fits 14-inch laptops</span>
            </div>
            <div>
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[10px] block">
                Colours
              </span>
              <span className="font-semibold text-[var(--kw-primary)] text-sm">Pastel sage, blush, sky (equal split)</span>
            </div>
            <div>
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[10px] block">
                Style
              </span>
              <span className="font-semibold text-[var(--kw-primary)] text-sm">{spec.craft}</span>
            </div>
          </div>

          {/* Changed Line with Left Accent */}
          {showChanges && isV2 && (
            <div className="relative pl-4 py-2.5 bg-[var(--kw-surface-container-low)] rounded-r-lg border-l-2 border-[var(--kw-primary-container)] flex items-center justify-between text-xs">
              <div>
                <span className="kw-label-sm text-[var(--kw-on-surface-variant)] text-[10px] block uppercase">
                  Logo Patch
                </span>
                <span className="font-medium text-[var(--kw-primary)]">Corner patch, supplied by buyer</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)] text-[11px] font-semibold">
                <PlusCircle className="size-3.5" /> Added
              </span>
            </div>
          )}
        </section>

        {/* Section 2: DELIVERY SCHEDULE */}
        <section className="border-t border-[var(--kw-outline-variant)] pt-6 space-y-3">
          <h3 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
            DELIVERY SCHEDULE
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5">
              <span>Batch 1 · 350 sleeves</span>
              <span className="font-semibold text-[var(--kw-primary)]">by 12 Nov 2026</span>
            </div>
            {showChanges && isV2 ? (
              <div className="relative pl-4 py-2 bg-[var(--kw-surface-container-low)] rounded-r-lg border-l-2 border-[var(--kw-primary-container)] flex items-center justify-between">
                <div>
                  <span>Batch 2 · 150 sleeves</span>
                  <span className="ml-3 font-semibold text-[var(--kw-primary)]">by 19 Nov 2026</span>
                  <del className="ml-2 text-[var(--kw-on-surface-variant)] line-through">20 Nov</del>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)] text-[11px] font-semibold">
                  <History className="size-3.5" /> Changed
                </span>
              </div>
            ) : (
              <div className="flex justify-between py-1.5">
                <span>Batch 2 · 150 sleeves</span>
                <span className="font-semibold text-[var(--kw-primary)]">by 19 Nov 2026</span>
              </div>
            )}
          </div>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            {spec.delivery_terms}
          </p>
        </section>

        {/* Section 3: COST BREAKDOWN */}
        <section className="border-t border-[var(--kw-outline-variant)] pt-6 space-y-3">
          <h3 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
            COST BREAKDOWN
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--kw-surface-container-low)]">
              <span>Raw materials (Sal-cotton canvas, lining, threads)</span>
              <span className="font-medium tabular-nums">₹1,38,000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--kw-surface-container-low)]">
              <span>Artisan making time (~1,500 hours)</span>
              <span className="font-medium tabular-nums">₹2,10,000</span>
            </div>
            {showChanges && isV2 && (
              <div className="relative pl-4 py-2 bg-[var(--kw-surface-container-low)] rounded-r-lg border-l-2 border-[var(--kw-primary-container)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Logo patch application (500 pieces)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary)] text-[10px] font-semibold">Added</span>
                </div>
                <span className="font-medium tabular-nums">₹18,000</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-[var(--kw-surface-container-low)]">
              <span>Packaging & first-mile logistics</span>
              <span className="font-medium tabular-nums">₹22,000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--kw-surface-container-low)]">
              <span>Second dispatch split surcharge</span>
              <span className="font-medium tabular-nums">₹1,600</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--kw-surface-container-low)]">
              <span>Federation & platform fee</span>
              <span className="font-medium tabular-nums">₹24,400</span>
            </div>
          </div>

          {/* Total Calculation Banner */}
          <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-4 flex items-baseline justify-between border border-[var(--kw-outline-variant)]">
            <span className="kw-headline-sm text-[var(--kw-primary)] font-bold">Total Quote</span>
            <div className="flex items-baseline gap-3">
              {showChanges && isV2 && (
                <>
                  <del className="text-xs text-[var(--kw-on-surface-variant)] line-through">was ₹3,96,000</del>
                  <span className="text-xs font-semibold text-[var(--kw-primary)] bg-[rgba(35,76,61,0.12)] px-2 py-0.5 rounded">+₹18,000</span>
                </>
              )}
              <span className="kw-headline-md text-[var(--kw-primary)] tabular-nums font-bold">
                ₹{spec.total_price_inr.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--kw-primary)] font-medium">
            <CheckCircle2 className="size-4" />
            <span>Within buyer budget limit (₹4,25,000). Taxes extra as applicable.</span>
          </div>
        </section>

        {/* Section 4: COMMERCIAL TERMS */}
        <section className="border-t border-[var(--kw-outline-variant)] pt-6 space-y-3">
          <h3 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
            COMMERCIAL TERMS
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)]">
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] text-[10px] block uppercase">Payment Terms</span>
              <span className="font-semibold text-[var(--kw-primary)] mt-1 block">50% upon approval, 50% on final delivery</span>
            </div>
            <div className="p-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)]">
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] text-[10px] block uppercase">Valid Until</span>
              <span className="font-semibold text-[var(--kw-primary)] mt-1 block">6 Nov 2026</span>
            </div>
          </div>
        </section>

        {/* Section 5: NOTE TO BUYER */}
        <section className="border-t border-[var(--kw-outline-variant)] pt-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
              NOTE TO BUYER
            </h3>
            <span className="text-xs font-mono text-[var(--kw-on-surface-variant)]">
              {buyerNote.length} / 400
            </span>
          </div>
          <textarea
            value={buyerNote}
            onChange={(e) => onBuyerNoteChange(e.target.value)}
            className="w-full p-3 rounded-xl border border-[var(--kw-outline-variant)] kw-body-sm text-[var(--kw-on-surface)] bg-[var(--kw-surface-container-low)] resize-none focus:outline-none focus:border-[var(--kw-primary-container)]"
            rows={3}
            maxLength={400}
          />
        </section>
      </article>
    </div>
  );
}
