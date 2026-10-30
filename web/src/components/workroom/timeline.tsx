/**
 * Kalaswar Workroom — Milestone Spine & Timeline
 *
 * Scoped under .kw-app.
 * Renders the stitched running spine with five sequential milestones:
 * 1. Materials (Completed)
 * 2. Making (In Progress, with pieces counter & progress bar)
 * 3. Quality Check (Upcoming)
 * 4. Dispatch (Upcoming)
 * 5. Delivered (Final)
 */

import { Check, CheckCircle2, Circle, Clock, Info, Loader2, Image as ImageIcon } from "lucide-react";
import type { ApiOrder } from "@/features/orders/hooks";

interface TimelineProps {
  order: ApiOrder;
  onOpenProgressModal?: () => void;
  onOpenDelayModal?: () => void;
  onOpenAssignModal?: () => void;
}

export function MilestoneTimeline({
  order,
  onOpenProgressModal,
  onOpenDelayModal,
}: TimelineProps) {
  const isDelayed = order.status === "delayed";
  const totalPieces = order.quantity || 40;
  // Compute progress from status
  const finishedPieces = order.status === "delivered" || order.status === "completed" 
    ? totalPieces 
    : order.status === "ready_for_dispatch" 
    ? totalPieces 
    : 22; // In progress default
  const percent = Math.min(100, Math.round((finishedPieces / totalPieces) * 100));

  return (
    <div className="relative pl-10 flex flex-col gap-8">
      {/* Stitched Running Spine */}
      <div className="absolute left-3 top-2 bottom-6 w-[2px] pointer-events-none -translate-x-1/2">
        {/* Completed segment */}
        <div className="w-full h-24 bg-[var(--kw-primary-container)]" />
        {/* In-progress segment */}
        <div className="w-full h-24 bg-[var(--kw-primary-container)]" />
        {/* Dashed upcoming segment */}
        <div className="w-full h-[calc(100%-12rem)] bg-[repeating-linear-gradient(to_bottom,var(--kw-outline-variant)_0px,var(--kw-outline-variant)_6px,transparent_6px,transparent_10px)]" />
      </div>

      {/* ── MILESTONE 1: MATERIALS (Done) ─────────────────────────────────── */}
      <div className="relative flex flex-col gap-2">
        <div
          aria-label="Materials, completed milestone"
          className="absolute -left-10 top-1 w-4 h-4 rounded-full bg-[var(--kw-primary-container)] flex items-center justify-center -translate-x-1/2 shadow-sm"
        >
          <Check className="size-3 text-white stroke-[3]" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="kw-headline-sm text-[var(--kw-primary)]">Materials</h2>
          <div className="flex items-center gap-1.5 text-[var(--kw-primary-container)] kw-label-sm">
            <CheckCircle2 className="size-4" />
            <span>Done</span>
          </div>
        </div>
        <p className="kw-body-md text-[var(--kw-on-surface-variant)]">
          Recorded by Sunita Devi · 24 Oct, 4:10 pm
        </p>
        <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">Planned 24 Oct</span>

        {/* Evidence Photos */}
        <div className="flex items-center gap-3 mt-2">
          <div className="relative rounded-xl overflow-hidden bg-[var(--kw-surface-container)] w-14 h-[70px] shadow-sm">
            <img
              src="https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_01.jpg"
              alt="Raw cotton fabric rolls for batch"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative rounded-xl overflow-hidden bg-[var(--kw-surface-container)] w-14 h-[70px] shadow-sm">
            <img
              src="https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/stole_01.jpg"
              alt="Botanical dyed threads"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            className="ml-2 inline-flex items-center gap-1 text-[var(--kw-primary)] kw-label-sm hover:underline"
          >
            <ImageIcon className="size-4" />
            <span>View photos</span>
          </button>
        </div>
      </div>

      {/* ── MILESTONE 2: MAKING (In Progress) ─────────────────────────────── */}
      <div className="relative flex flex-col gap-3 pt-2">
        <div
          aria-label="Making, current milestone"
          className="absolute -left-10 top-1.5 w-6 h-6 rounded-full bg-[var(--kw-background)] flex items-center justify-center -translate-x-1/2 p-[3px]"
        >
          <div className="w-full h-full rounded-full bg-[var(--kw-primary-container)] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--kw-background)] animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="kw-headline-sm text-[var(--kw-primary)]">Making</h2>
          <div className="flex items-center gap-1.5 text-[var(--kw-primary)] kw-label-md">
            <Loader2 className="size-4 animate-spin text-[var(--kw-primary-container)]" />
            <span>In progress · {finishedPieces} of {totalPieces} pieces</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-4 mt-1">
          <div className="w-64 h-2 rounded-full bg-[var(--kw-surface-container)] overflow-hidden">
            <div
              className="h-full bg-[var(--kw-primary-container)] rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="kw-body-sm text-[var(--kw-on-surface-variant)] font-medium">
            {finishedPieces} of {totalPieces} pieces recorded ({percent}%)
          </span>
        </div>

        {/* Status Callout if Delayed */}
        {isDelayed && (
          <div className="flex items-center justify-between rounded-lg bg-[rgba(152,70,46,0.08)] border border-[rgba(152,70,46,0.2)] p-3 text-[var(--kw-secondary)] mt-1">
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" />
              <span className="kw-body-sm font-medium">Making is 2 days behind schedule.</span>
            </div>
            {onOpenDelayModal && (
              <button
                type="button"
                onClick={onOpenDelayModal}
                className="kw-label-sm hover:underline text-[var(--kw-secondary)]"
              >
                Log reason →
              </button>
            )}
          </div>
        )}

        {/* Quick action: Record Progress */}
        {onOpenProgressModal && (
          <div className="mt-1">
            <button
              type="button"
              onClick={onOpenProgressModal}
              className="kw-btn kw-btn-secondary h-9 text-xs"
            >
              + Record piece completion
            </button>
          </div>
        )}
      </div>

      {/* ── MILESTONE 3: QUALITY CHECK (Upcoming) ─────────────────────────── */}
      <div className="relative flex flex-col gap-1.5 pt-2 opacity-75">
        <div
          aria-label="Quality check, upcoming milestone"
          className="absolute -left-10 top-1.5 w-4 h-4 rounded-full bg-[var(--kw-surface-container-high)] flex items-center justify-center -translate-x-1/2"
        >
          <div className="w-2 rounded-full bg-[var(--kw-background)] h-2" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="kw-headline-sm text-[var(--kw-on-surface-variant)]">Quality check</h2>
          <div className="flex items-center gap-1 text-[var(--kw-on-surface-variant)] kw-label-sm">
            <Circle className="size-3.5" />
            <span>Not started</span>
          </div>
        </div>
        <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">Planned 30 Oct</span>
        <div className="flex items-center gap-1.5 text-[var(--kw-on-surface-variant)] kw-body-sm mt-0.5">
          <Info className="size-3.5 shrink-0" />
          <span>Starts when Making reaches 100%. Handled on the Quality check workstation.</span>
        </div>
      </div>

      {/* ── MILESTONE 4: DISPATCH (Upcoming) ─────────────────────────────── */}
      <div className="relative flex flex-col gap-1.5 pt-2 opacity-75">
        <div
          aria-label="Dispatch, upcoming milestone"
          className="absolute -left-10 top-1.5 w-4 h-4 rounded-full bg-[var(--kw-surface-container-high)] flex items-center justify-center -translate-x-1/2"
        >
          <div className="w-2 rounded-full bg-[var(--kw-background)] h-2" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="kw-headline-sm text-[var(--kw-on-surface-variant)]">Dispatch</h2>
          <div className="flex items-center gap-1 text-[var(--kw-on-surface-variant)] kw-label-sm">
            <Circle className="size-3.5" />
            <span>Not started</span>
          </div>
        </div>
        <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">
          Planned 30 Oct · Booked with Delhivery, pickup 31 Oct
        </span>
      </div>

      {/* ── MILESTONE 5: DELIVERED (Final) ─────────────────────────────────── */}
      <div className="relative flex flex-col gap-1.5 pt-2 opacity-75">
        <div
          aria-label="Delivered, final milestone"
          className="absolute -left-10 top-1.5 w-4 h-4 rounded-full bg-[var(--kw-surface-container-high)] flex items-center justify-center -translate-x-1/2"
        >
          <div className="w-2 rounded-full bg-[var(--kw-background)] h-2" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="kw-headline-sm text-[var(--kw-on-surface-variant)]">Delivered</h2>
          <div className="flex items-center gap-1 text-[var(--kw-on-surface-variant)] kw-label-sm">
            <Circle className="size-3.5" />
            <span>Not started</span>
          </div>
        </div>
        <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">
          Due {order.expected_dispatch_at ? new Date(order.expected_dispatch_at).toLocaleDateString("en-IN") : "1 Nov 2026"}
        </span>
        <div className="flex items-center gap-1.5 text-[var(--kw-on-surface-variant)] kw-body-sm mt-0.5">
          <Info className="size-3.5 shrink-0" />
          <span>Marked delivered once recipient pod is verified.</span>
        </div>
      </div>
    </div>
  );
}
