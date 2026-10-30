/**
 * /workroom/orders/$id — Kalaswar Workroom Order Detail & Production Tracking
 *
 * Stitch Screen ID: 8e785191e71341b482682a4b401eb864
 * Scoped under .kw-app.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  useOrderDetail,
  useUpdateOrderStatus,
  useAssignArtisan,
} from "@/features/orders/hooks";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { MilestoneTimeline } from "@/components/workroom/timeline";
import {
  RecordProgressModal,
  LogDelayModal,
  AssignArtisanModal,
  PutOnHoldModal,
} from "@/components/workroom/order-modals";

export const Route = createFileRoute("/workroom/orders/$id")({
  head: () => ({
    meta: [{ title: "Order Details — Kalaswar Workroom" }],
  }),
  component: WorkroomOrderDetailPage,
});

function WorkroomOrderDetailPage() {
  const { id } = Route.useParams();
  const { data: order, isLoading, isError, error, refetch } = useOrderDetail(id);
  const updateStatus = useUpdateOrderStatus();
  const assignArtisan = useAssignArtisan();

  // Modals state
  const [progressOpen, setProgressOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);

  // Recovery radio state
  const [recoveryAction, setRecoveryAction] = useState<string>("more_artisans");
  const [notifiedBuyer, setNotifiedBuyer] = useState(false);

  if (isLoading) {
    return <KwLoadingState label="Loading order details…" retry={() => void refetch()} />;
  }

  if (isError || !order) {
    return (
      <KwErrorState
        title="Could not load order"
        detail={(error as Error)?.message || `Order '${id}' not found.`}
        retry={() => void refetch()}
      />
    );
  }

  const isDelayed = order.status === "delayed";
  const totalAmount = order.total_amount ?? order.total_amount_inr ?? 2900;
  const assignments = order.assignments && order.assignments.length > 0
    ? order.assignments
    : [
        {
          id: "demo-a-1",
          order_id: order.id,
          artisan_id: "cccccccc-0001-0000-0000-000000000001",
          artisan_name: "Radha Devi",
          assigned_at: order.created_at || "2026-10-26T10:00:00Z",
          assigned_by: "Coordinator Priya",
        },
      ];

  const leadArtisan = assignments[0]?.artisan_name || "Radha Devi";

  return (
    <div className="space-y-6 pb-28">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            to="/workroom/orders"
            className="inline-flex items-center gap-1.5 text-[var(--kw-primary)] kw-body-sm hover:underline w-fit"
          >
            <ArrowLeft className="size-4" />
            <span>Orders</span>
          </Link>

          <div className="flex flex-wrap items-center gap-4 mt-0.5">
            <h1 className="kw-headline-xl text-[var(--kw-primary)]">
              {order.product_title || "Handcrafted Kantha Silk Cushion Cover"}
            </h1>
            {isDelayed ? (
              <div className="inline-flex items-center gap-1.5 text-[var(--kw-secondary)] kw-label-md font-semibold">
                <Clock className="size-4" />
                <span>At risk · Making is 2 days behind</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[var(--kw-primary-container)] kw-label-md font-semibold">
                <CheckCircle2 className="size-4" />
                <span>In production · On track</span>
              </div>
            )}
          </div>

          <p className="text-[var(--kw-on-surface-variant)] kw-body-sm">
            Order #{order.id.slice(0, 8)} · Client: {order.customer_reference || "FabIndia Corporate"} · 
            <span className="ml-1 text-[var(--kw-primary)] font-medium">B2B Studio Allocation</span>
          </p>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="h-10 px-3.5 rounded-lg bg-[var(--kw-surface-container)] text-[var(--kw-on-surface)] kw-label-md hover:bg-[var(--kw-surface-container-high)] transition-colors"
          >
            हि
          </button>
        </div>
      </div>

      {/* ── Order Quick Facts Strip ───────────────────────────────────────── */}
      <section
        aria-label="Order quick facts"
        className="w-full rounded-2xl px-6 py-4 bg-[var(--kw-surface-container-low)] border border-[var(--kw-outline-variant)] flex flex-wrap items-center justify-between gap-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-8">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--kw-surface-container)] shrink-0 border border-[var(--kw-outline-variant)]">
            <img
              src={
                order.product_image_url ||
                "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_01.jpg"
              }
              alt={order.product_title || "Product"}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
              Quantity
            </span>
            <span className="kw-headline-sm text-[var(--kw-primary)] font-semibold">
              {order.quantity} pieces
            </span>
          </div>

          <div>
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
              Lead Artisan
            </span>
            <span className="kw-headline-sm text-[var(--kw-primary)] font-semibold">
              {leadArtisan}
            </span>
          </div>

          <div>
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
              Due Date
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="kw-headline-sm text-[var(--kw-primary)] font-semibold">
                {order.expected_dispatch_at
                  ? new Date(order.expected_dispatch_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "1 Nov 2026"}
              </span>
              <span className="text-xs text-[var(--kw-on-surface-variant)] font-normal">
                (2 days left)
              </span>
            </div>
          </div>

          <div>
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
              Delivery
            </span>
            <span className="kw-headline-sm text-[var(--kw-primary)] font-semibold">
              First-mile pickup confirmed
            </span>
          </div>
        </div>

        <Link
          to="/workroom/requests"
          className="inline-flex items-center gap-1 text-[var(--kw-primary)] hover:underline kw-label-sm font-semibold"
        >
          <span>View related proposals</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </section>

      {/* ── Main Two-Column Zone ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column (7/12): Milestone Spine Thread */}
        <div className="lg:col-span-7 kw-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)] pb-3">
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider font-bold text-xs">
              Milestone Spine
            </span>
            <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">
              Real-time cluster tracking
            </span>
          </div>

          <MilestoneTimeline
            order={order}
            onOpenProgressModal={() => setProgressOpen(true)}
            onOpenDelayModal={() => setDelayOpen(true)}
            onOpenAssignModal={() => setAssignOpen(true)}
          />
        </div>

        {/* Right column (5/12): Context, Artisan Roster & Recovery Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section A: Who is making it */}
          <div className="kw-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider font-bold text-xs">
                Who is making it
              </span>
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="kw-label-sm text-[var(--kw-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>Assign more</span>
                <ArrowRight className="size-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {assignments.map((a, idx) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--kw-surface-container-low)]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-[var(--kw-primary-container)] text-white kw-label-sm flex items-center justify-center font-bold">
                      {a.artisan_name ? a.artisan_name.slice(0, 2).toUpperCase() : `A${idx + 1}`}
                    </div>
                    <div>
                      <span className="kw-label-md text-[var(--kw-primary)] block font-semibold">
                        {a.artisan_name || "Assigned Artisan"}
                      </span>
                      <span className="kw-body-sm text-[var(--kw-on-surface-variant)] text-xs">
                        Embroidery & Stitching
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="kw-body-sm font-semibold text-[var(--kw-primary)]">
                      12 of 16 pieces
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-[var(--kw-surface-container-high)] mt-1 overflow-hidden">
                      <div className="h-full bg-[var(--kw-primary-container)] rounded-full" style={{ width: "75%" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--kw-outline-variant)] flex items-center justify-between text-xs text-[var(--kw-on-surface-variant)]">
              <span>Kantha stitching load: 92% booked</span>
              <span className="font-semibold text-[var(--kw-primary)]">Recorded: 22 / 40 pieces</span>
            </div>
          </div>

          {/* Section B: The Delay & Recovery Options */}
          <div className="kw-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[var(--kw-secondary)]" />
              <span className="kw-label-sm text-[var(--kw-secondary)] uppercase tracking-wider font-bold text-xs">
                Production Timeline Status
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="kw-headline-sm text-[var(--kw-primary)] font-semibold">
                {isDelayed ? "Making is 2 days behind." : "Production is running on schedule."}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--kw-on-surface-variant)]">
                <span>Reason: {isDelayed ? "Dye lot drying delayed" : "No active delays recorded"}</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setDelayOpen(true)}
                  className="text-[var(--kw-primary)] hover:underline font-medium"
                >
                  Log a reason →
                </button>
              </div>
            </div>

            {/* Recovery options */}
            <div className="space-y-2 pt-2">
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
                Ways to recover
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--kw-surface-container-low)] cursor-pointer">
                  <input
                    type="radio"
                    name="recovery-choice"
                    value="more_artisans"
                    checked={recoveryAction === "more_artisans"}
                    onChange={(e) => setRecoveryAction(e.target.value)}
                    className="mt-0.5 accent-[var(--kw-primary)]"
                  />
                  <span>Assign more artisans · adds up to 3 days of capacity</span>
                </label>
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--kw-surface-container-low)] cursor-pointer">
                  <input
                    type="radio"
                    name="recovery-choice"
                    value="ask_buyer"
                    checked={recoveryAction === "ask_buyer"}
                    onChange={(e) => setRecoveryAction(e.target.value)}
                    className="mt-0.5 accent-[var(--kw-primary)]"
                  />
                  <span>Ask buyer for 2 more days · due 3 Nov</span>
                </label>
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--kw-surface-container-low)] cursor-pointer">
                  <input
                    type="radio"
                    name="recovery-choice"
                    value="keep_date"
                    checked={recoveryAction === "keep_date"}
                    onChange={(e) => setRecoveryAction(e.target.value)}
                    className="mt-0.5 accent-[var(--kw-primary)]"
                  />
                  <span>Keep date · finish on 31 Oct, dispatch same day</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={notifiedBuyer}
              onClick={() => {
                setNotifiedBuyer(true);
                updateStatus.mutate({
                  id: order.id,
                  status: isDelayed ? "delayed" : "in_production",
                  note: `Recovery selected: ${recoveryAction}`,
                });
              }}
              className="kw-btn kw-btn-secondary h-10 text-xs w-full justify-center"
            >
              {notifiedBuyer ? "Buyer notified via WhatsApp" : "Notify buyer of recovery plan"}
            </button>
          </div>

          {/* Section C: Order Facts */}
          <div className="kw-card p-5 space-y-3">
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider font-bold text-xs block">
              Order Commercial Facts
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-baseline justify-between">
                <span className="kw-headline-sm text-[var(--kw-primary)] font-bold">
                  Value: ₹{totalAmount.toLocaleString("en-IN")}
                </span>
                <span className="text-[var(--kw-on-surface-variant)]">Cost-plus estimate</span>
              </div>
              <div className="text-[var(--kw-on-surface)]">
                Payment: 50% received (advance) · 50% on verified delivery
              </div>
              <div className="text-[var(--kw-on-surface-variant)]">
                Logistics: Delhivery Express · tracking REF-DL-4471
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Decision Bar (80px) ───────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 px-8 bg-[var(--kw-surface-container-lowest)] border-t border-[var(--kw-outline-variant)] flex items-center justify-between z-30 shadow-lg">
        <div className="flex flex-col">
          <span className="kw-label-md text-[var(--kw-primary)] font-semibold">
            Making · 22 of 40 pieces · due 1 Nov
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[var(--kw-on-surface-variant)]">
            <ShieldCheck className="size-4 text-[var(--kw-primary)]" />
            <span>Progress audit logs provenance and timestamp automatically.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHoldOpen(true)}
            className="kw-btn kw-btn-secondary h-11 text-xs"
          >
            Put on hold
          </button>
          <button
            type="button"
            onClick={() => setDelayOpen(true)}
            className="kw-btn kw-btn-secondary h-11 text-xs"
          >
            Log a delay
          </button>
          <button
            type="button"
            onClick={() => setProgressOpen(true)}
            className="kw-btn kw-btn-primary h-11 text-xs shadow-sm"
          >
            Record progress
          </button>
        </div>
      </footer>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <RecordProgressModal
        isOpen={progressOpen}
        onClose={() => setProgressOpen(false)}
        onSubmit={({ piecesFinished, artisanName, note }) => {
          updateStatus.mutate({
            id: order.id,
            status: "in_production",
            note: `Progress recorded: +${piecesFinished} pcs by ${artisanName}. Note: ${note}`,
          });
        }}
        currentCompleted={22}
        totalPieces={order.quantity || 40}
      />

      <LogDelayModal
        isOpen={delayOpen}
        onClose={() => setDelayOpen(false)}
        onSubmit={({ reason, days, notifyBuyer }) => {
          updateStatus.mutate({
            id: order.id,
            status: "delayed",
            note: `Delay of ${days} days logged: ${reason}${notifyBuyer ? " (Buyer notified)" : ""}`,
          });
        }}
      />

      <AssignArtisanModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSubmit={({ artisanId, pieces }) => {
          assignArtisan.mutate({
            order_id: order.id,
            artisan_id: artisanId,
            assigned_by: "Cluster Coordinator",
          });
        }}
      />

      <PutOnHoldModal
        isOpen={holdOpen}
        onClose={() => setHoldOpen(false)}
        onSubmit={(reason) => {
          updateStatus.mutate({
            id: order.id,
            status: "pending",
            note: `Order put on hold: ${reason}`,
          });
        }}
      />
    </div>
  );
}
