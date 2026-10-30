/**
 * /workroom/orders/$id — Kalaswar Workroom Order Detail & Production Tracking
 *
 * Scoped under .kw-app.
 * Flows handled:
 * - Flow 2: Skills-aware artisan assignment suggestions
 * - Flow 5: Quality checks & strict dispatch gating
 * - RLS enforcement: Coordinators/Admins can assign, QC, and dispatch; Artisans are restricted.
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
  Truck,
  XCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  useOrderDetail,
  useUpdateOrderStatus,
  useAssignArtisan,
  useQualityChecks,
  useRecordQualityCheck,
  useShipments,
  useCreateShipment,
} from "@/features/orders/hooks";
import { useAuth } from "@/features/auth";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { MilestoneTimeline } from "@/components/workroom/timeline";
import {
  RecordProgressModal,
  LogDelayModal,
  AssignArtisanModal,
  PutOnHoldModal,
  RecordQualityCheckModal,
} from "@/components/workroom/order-modals";

export const Route = createFileRoute("/workroom/orders/$id")({
  head: () => ({
    meta: [{ title: "Order Details & QC — Kalaswar Workroom" }],
  }),
  component: WorkroomOrderDetailPage,
});

function WorkroomOrderDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const isArtisan = user?.role === "artisan";

  const { data: order, isLoading, isError, error, refetch } = useOrderDetail(id);
  const { data: qualityChecks, refetch: refetchQC } = useQualityChecks(id);
  const { data: shipments, refetch: refetchShipments } = useShipments(id);

  const updateStatus = useUpdateOrderStatus();
  const assignArtisan = useAssignArtisan();
  const recordQualityCheck = useRecordQualityCheck();
  const createShipment = useCreateShipment();

  // Modals state
  const [progressOpen, setProgressOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [qcOpen, setQcOpen] = useState(false);

  // Recovery radio state
  const [recoveryAction, setRecoveryAction] = useState<string>("more_artisans");
  const [notifiedBuyer, setNotifiedBuyer] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Flow 5: Check if there is at least one PASS quality check
  const passingQc = qualityChecks?.find((qc) => qc.result === "pass");
  const hasPassingQc = Boolean(passingQc);
  const latestQc = qualityChecks && qualityChecks.length > 0 ? qualityChecks[qualityChecks.length - 1] : null;
  const hasShipment = Boolean(shipments && shipments.length > 0);

  const handleBookDispatch = async () => {
    setActionError(null);
    if (!hasPassingQc) {
      setActionError("Dispatch Gated: Order cannot be shipped until a Quality Check with status 'PASS' is recorded.");
      return;
    }
    try {
      await createShipment.mutateAsync({
        order_id: order.id,
        carrier: "Delhivery Express",
        tracking_ref: `DEL-${Date.now().toString().slice(-6)}`,
        estimated_delivery_at: new Date(Date.now() + 4 * 86400000).toISOString(),
      });
      await updateStatus.mutateAsync({
        id: order.id,
        status: "ready_for_dispatch",
        note: "QA Passed. Delhivery Express courier booking confirmed.",
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to book shipment.";
      setActionError(msg);
    }
  };

  const handleSaveQC = async (data: { result: "pass" | "fail" | "conditional"; notes: string }) => {
    setActionError(null);
    try {
      await recordQualityCheck.mutateAsync({
        order_id: order.id,
        result: data.result,
        notes: data.notes,
        checked_by: user?.name || "Cluster Coordinator",
      });
      if (data.result === "pass") {
        await updateStatus.mutateAsync({
          id: order.id,
          status: "in_production",
          note: `Quality Check Passed: ${data.notes}`,
        });
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to record quality check.";
      setActionError(msg);
    }
  };

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

      {/* Global Error Banner */}
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

      {/* ── Order Quick Facts Strip ───────────────────────────────────────── */}
      <section
        aria-label="Order quick facts"
        className="w-full rounded-2xl px-6 py-4 bg-[var(--kw-surface-container-low)] border border-[var(--kw-outline-variant)] flex flex-wrap items-center justify-between gap-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-8">
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
              Quality Status
            </span>
            <span
              className={`kw-badge mt-0.5 ${
                hasPassingQc
                  ? "kw-badge-success"
                  : latestQc?.result === "fail"
                  ? "kw-badge-danger"
                  : "kw-badge-warning"
              }`}
            >
              {hasPassingQc ? "QC Passed ✓" : latestQc ? `QC ${latestQc.result}` : "Pending QC"}
            </span>
          </div>

          <div>
            <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
              Dispatch Gating
            </span>
            <span
              className={`kw-badge mt-0.5 ${
                hasShipment
                  ? "kw-badge-primary"
                  : hasPassingQc
                  ? "kw-badge-success"
                  : "kw-badge-neutral"
              }`}
            >
              {hasShipment ? "Dispatched" : hasPassingQc ? "Ready to Dispatch" : "Gated (Locked)"}
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

        {/* Right column (5/12): Context, Artisan Roster, QC & Dispatch Gating */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section A: Flow 2 - Skills-Aware Artisan Roster */}
          <div className="kw-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider font-bold text-xs flex items-center gap-1">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Assigned Artisans</span>
              </span>
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                disabled={isArtisan}
                className={`kw-label-sm inline-flex items-center gap-1 ${
                  isArtisan ? "opacity-50 cursor-not-allowed" : "text-[var(--kw-primary)] hover:underline"
                }`}
                title={isArtisan ? "Coordinators or Admins only" : "Assign more artisans"}
              >
                <span>Skills Suggestions</span>
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
          </div>

          {/* Section B: Flow 5 - Quality Checks & Dispatch Gating Card */}
          <div className="kw-card p-5 space-y-4 border-2 border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--kw-primary)]" />
                <span className="kw-label-sm text-[var(--kw-primary)] uppercase tracking-wider font-bold text-xs">
                  Quality Checks & Dispatch Gating
                </span>
              </div>
              <button
                type="button"
                disabled={isArtisan}
                onClick={() => setQcOpen(true)}
                className={`h-7 px-2.5 rounded text-xs font-semibold inline-flex items-center gap-1 ${
                  isArtisan
                    ? "opacity-50 cursor-not-allowed bg-[var(--kw-surface-container)]"
                    : "bg-[var(--kw-primary)] hover:bg-[var(--kw-primary-container)] text-white"
                }`}
                title={isArtisan ? "Requires Coordinator or Admin role" : "Record quality check inspection"}
              >
                <span>Record QC</span>
              </button>
            </div>

            {/* Status of inspection */}
            <div className="rounded-xl p-3 bg-[var(--kw-surface-container-low)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--kw-on-surface-variant)]">Inspection Verdict:</span>
                <span
                  className={`font-semibold ${
                    hasPassingQc
                      ? "text-emerald-700"
                      : latestQc?.result === "fail"
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                >
                  {hasPassingQc ? "Verified & Passed ✓" : latestQc ? `Latest: ${latestQc.result.toUpperCase()}` : "Pending Verification"}
                </span>
              </div>

              {latestQc?.notes && (
                <p className="text-[11px] text-[var(--kw-on-surface)] bg-white p-2 rounded border border-[var(--kw-outline-variant)]">
                  <strong>Notes:</strong> {latestQc.notes} ({latestQc.checked_by || "QA Inspector"})
                </p>
              )}

              {/* Strict Gating Banner */}
              {!hasPassingQc ? (
                <div className="flex items-start gap-2 p-2 rounded bg-amber-50 text-amber-900 text-[11px] border border-amber-200">
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Dispatch Gated:</strong> Dispatch & Delhivery waybill generation are locked until a passing QC inspection is logged.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded bg-emerald-50 text-emerald-900 text-[11px] border border-emerald-200">
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 mt-0.5" />
                  <span>
                    <strong>Dispatch Authorized:</strong> Quality verification passed. First-mile courier dispatch can now be booked.
                  </span>
                </div>
              )}
            </div>

            {/* Courier Booking Action */}
            <div className="pt-2 border-t border-[var(--kw-outline-variant)] space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--kw-on-surface-variant)]">
                <span>Courier Partner:</span>
                <span className="font-semibold text-[var(--kw-on-surface)]">Delhivery Express</span>
              </div>

              {hasShipment ? (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Truck className="size-4" />
                    <span>Shipment Booked</span>
                  </div>
                  <span className="font-mono text-[11px]">{shipments![0].tracking_ref}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!hasPassingQc || isArtisan || createShipment.isPending}
                  onClick={() => void handleBookDispatch()}
                  className={`w-full h-10 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                    hasPassingQc && !isArtisan
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] opacity-60 cursor-not-allowed"
                  }`}
                  title={
                    !hasPassingQc
                      ? "Dispatch is locked until passing QC is recorded"
                      : isArtisan
                      ? "Restricted to Coordinator or Admin role"
                      : "Book courier dispatch"
                  }
                >
                  <Truck className="size-4" />
                  <span>
                    {createShipment.isPending
                      ? "Booking Courier…"
                      : hasPassingQc
                      ? "Book Delhivery Dispatch"
                      : "Dispatch Gated (QC Pass Required)"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Section C: Delay & Recovery Options */}
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
            <span>
              {hasPassingQc ? "Quality Check Passed. Ready for Dispatch." : "Awaiting Quality Check sign-off."}
            </span>
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
            onClick={() => setQcOpen(true)}
            disabled={isArtisan}
            className={`kw-btn h-11 text-xs ${
              isArtisan ? "kw-btn-secondary opacity-50 cursor-not-allowed" : "kw-btn-secondary"
            }`}
          >
            Inspect (QC)
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
        orderId={order.id}
        craft="Kantha"
        isArtisan={isArtisan}
        onSubmit={({ artisanId, pieces }) => {
          assignArtisan.mutate({
            order_id: order.id,
            artisan_id: artisanId,
            assigned_by: user?.name || "Cluster Coordinator",
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

      <RecordQualityCheckModal
        isOpen={qcOpen}
        onClose={() => setQcOpen(false)}
        isArtisan={isArtisan}
        onSubmit={(data) => void handleSaveQC(data)}
      />
    </div>
  );
}
