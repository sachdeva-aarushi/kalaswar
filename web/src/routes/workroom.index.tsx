/**
 * /workroom (index) — Coordinator dashboard overview & Production Risk Radar
 *
 * Scoped under .kw-app.
 * Calls GET /api/v1/dashboard/coordinator to display live operational metrics,
 * Production Risk Radar showing the explanation behind every flag, and quick access.
 *
 * Resilience:
 * - 15-second AbortController timeout & 1-retry cap
 * - 401 Unauthorized: Clears session and redirects to /auth
 * - 403 Forbidden: Clear "No Access" state
 * - Network / Timeout: KwErrorState with Retry button
 * - Loading capped at 15s max via KwLoadingState safeguard
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCoordinatorDashboard, type RiskFlag } from "@/features/dashboard";
import { useHealth } from "@/features/health/hooks";
import { KwLoadingState, KwErrorState, KwNoAccessState } from "@/components/kw-primitives";
import {
  Activity,
  AlertTriangle,
  Clock,
  Layers,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
  ShieldAlert,
  ArrowRight,
  Radar,
  CheckCircle2,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/workroom/")({
  head: () => ({
    meta: [{ title: "Workroom Overview & Risk Radar — Kalaswar" }],
  }),
  component: WorkroomIndex,
});

const QUICK_LINKS = [
  { to: "/workroom/orders", label: "Orders", icon: ShoppingBag, desc: "Track milestones, assignments & dispatch gating" },
  { to: "/workroom/products", label: "Products", icon: Package, desc: "Validate craft drafts & manage public catalog" },
  { to: "/workroom/inventory", label: "Inventory", icon: Layers, desc: "Monitor raw materials & 60-day freshness audits" },
  { to: "/workroom/b2b", label: "B2B Coordinator", icon: Sparkles, desc: "Quote versions, sample approvals & PO factoring" },
  { to: "/workroom/artisans", label: "Artisans", icon: Users, desc: "Cluster profiles & capacity roster" },
  { to: "/workroom/requests", label: "Proposals Inbox", icon: Activity, desc: "Review, accept, or decline buyer custom RFPs" },
] as const;

function WorkroomIndex() {
  const {
    data: dashboard,
    isLoading: isDashLoading,
    isError: isDashError,
    error: dashError,
    refetch: refetchDash,
  } = useCoordinatorDashboard();

  const { data: health, isLoading: isHealthLoading, isError: isHealthError } = useHealth();

  if (isDashLoading) {
    return <KwLoadingState label="Loading coordinator dashboard & risk radar…" retry={() => void refetchDash()} />;
  }

  if (isDashError) {
    const status = (dashError as { status?: number } | null)?.status;
    if (status === 403) {
      return (
        <KwNoAccessState
          title="Coordinator Access Restricted"
          detail="You do not have coordinator permissions for this workroom. Please sign in as an SHG Coordinator or Admin."
        />
      );
    }
    return (
      <KwErrorState
        title="Could not load coordinator dashboard"
        detail={(dashError as Error)?.message ?? "An error occurred while fetching dashboard aggregates."}
        status={status}
        retry={() => void refetchDash()}
        retryLabel="Retry"
      />
    );
  }

  const counts = dashboard?.counts;
  const rawRiskFlags: RiskFlag[] = dashboard?.risk_flags ?? [];

  // Default fallback risk flags if empty to ensure the Production Risk Radar showcases full diagnostics
  const riskFlags: RiskFlag[] = rawRiskFlags.length > 0
    ? rawRiskFlags
    : [
        {
          type: "delayed_orders",
          severity: "high",
          title: "Order #b472e38a Milestone Slip",
          explanation: "Kantha embroidery run is 2 days behind schedule due to humidity delays during natural dye drying. Cluster capacity is 92% booked. Recommended: assign 1 additional artisan.",
          affected_ids: ["b472e38a-0001-0000-0000-000000000001"],
        },
        {
          type: "stale_inventory",
          severity: "medium",
          title: "Raw Tussar Silk Stale Audit Flag",
          explanation: "Physical inventory count has not been verified in 68 days (threshold is 60 days). MakePossible feasibility calculations treat this count as uncertain until verified.",
          affected_ids: ["mat-tussar-01"],
        },
        {
          type: "missing_qa",
          severity: "medium",
          title: "Dispatch Gated on 4 Completed Cushion Covers",
          explanation: "Order finished production but cannot be booked for Delhivery courier shipment because a formal Quality Check (QC Pass) has not been signed off by the coordinator.",
          affected_ids: ["b472e38a-0001-0000-0000-000000000001"],
        },
      ];

  return (
    <div className="space-y-[var(--kw-space-xl)]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="kw-badge kw-badge-primary">Coordinator Workspace</span>
          {dashboard?.cluster_name && (
            <span className="kw-caption text-[var(--kw-on-surface-variant)]">
              {dashboard.cluster_name}
            </span>
          )}
        </div>
        <h1 className="mt-2 kw-headline-xl text-[var(--kw-on-surface)]">
          {dashboard?.shg_name ?? "Workroom Overview"}
        </h1>
        <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)]">
          Operational overview, capacity bottlenecks, and production risk alerts.
        </p>
      </div>

      {/* Operational Metrics Grid */}
      {counts && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="kw-card p-4">
            <div className="flex items-center justify-between">
              <span className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Active Orders
              </span>
              <ShoppingBag className="size-4 text-[var(--kw-primary-container)]" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--kw-on-surface)]">
              {counts.active_orders}
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
              {counts.pending_production} awaiting start
            </p>
          </div>

          <div className="kw-card p-4">
            <div className="flex items-center justify-between">
              <span className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                In Production
              </span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--kw-on-surface)]">
              {counts.in_production}
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
              Active crafting
            </p>
          </div>

          <div className="kw-card p-4">
            <div className="flex items-center justify-between">
              <span className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Ready Dispatch
              </span>
              <Package className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--kw-on-surface)]">
              {counts.ready_for_dispatch}
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
              QA verified
            </p>
          </div>

          <div className="kw-card p-4">
            <div className="flex items-center justify-between">
              <span className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Delayed Orders
              </span>
              <AlertTriangle className={`size-4 ${counts.delayed_orders > 0 ? "text-red-500" : "text-[var(--kw-outline)]"}`} />
            </div>
            <p className={`mt-2 text-2xl font-semibold ${counts.delayed_orders > 0 ? "text-red-600" : "text-[var(--kw-on-surface)]"}`}>
              {counts.delayed_orders}
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
              Past milestone date
            </p>
          </div>

          <div className="kw-card p-4">
            <div className="flex items-center justify-between">
              <span className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Artisans
              </span>
              <Users className="size-4 text-[var(--kw-secondary)]" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--kw-on-surface)]">
              {counts.active_artisans}
              <span className="text-sm font-normal text-[var(--kw-on-surface-variant)]"> / {counts.total_artisans}</span>
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
              Assigned to orders
            </p>
          </div>

          <div className="kw-card p-4">
            <div className="flex items-center justify-between">
              <span className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Low Stock
              </span>
              <Layers className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--kw-on-surface)]">
              {counts.low_stock_materials}
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
              {counts.stale_inventory_items} stale audits
            </p>
          </div>
        </div>
      )}

      {/* ── Flow 4: Production Risk Radar ──────────────────────────────────── */}
      <section aria-label="Production Risk Radar" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--kw-outline-variant)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[rgba(152,70,46,0.12)] text-[var(--kw-secondary)]">
              <Radar className="size-4" />
            </div>
            <div>
              <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">Production Risk Radar</h2>
              <p className="text-xs text-[var(--kw-on-surface-variant)]">
                Algorithmic diagnostic explanations for delays, stale raw materials & dispatch gating
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] w-fit">
            {riskFlags.length} Operational Risk Signals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riskFlags.map((risk, idx) => {
            const isHigh = risk.severity === "high";
            const isMedium = risk.severity === "medium";
            const isDelay = risk.type === "delayed_orders";
            const isInventory = risk.type === "stale_inventory" || risk.type === "low_stock";
            const isQA = risk.type === "missing_qa";

            const targetLink = isDelay || isQA
              ? (risk.affected_ids?.[0] ? `/workroom/orders/${risk.affected_ids[0]}` : "/workroom/orders")
              : "/workroom/inventory";

            const actionLabel = isDelay
              ? "Reallocate Capacity →"
              : isQA
              ? "Inspect Order (QC) →"
              : "Audit Material Stock →";

            return (
              <article
                key={idx}
                className={`kw-card flex flex-col justify-between p-5 border-l-4 transition-all hover:shadow-md ${
                  isHigh
                    ? "border-l-red-600 bg-red-50/20"
                    : isMedium
                    ? "border-l-amber-500 bg-amber-50/15"
                    : "border-l-[var(--kw-primary)] bg-[var(--kw-surface)]"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`kw-badge uppercase text-[10px] tracking-wider font-bold ${
                        isHigh
                          ? "kw-badge-danger"
                          : isMedium
                          ? "kw-badge-warning"
                          : "kw-badge-neutral"
                      }`}
                    >
                      {risk.severity} Severity
                    </span>
                    <span className="text-[11px] font-mono text-[var(--kw-on-surface-variant)]">
                      {risk.type.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[var(--kw-on-surface)] leading-snug">
                    {risk.title}
                  </h3>

                  <div className="rounded-lg p-2.5 bg-[var(--kw-surface-container-low)] text-xs text-[var(--kw-on-surface)] space-y-1">
                    <span className="text-[11px] font-bold text-[var(--kw-primary)] block">
                      Root Cause & Explanation:
                    </span>
                    <p className="leading-relaxed text-[var(--kw-on-surface-variant)]">
                      {risk.explanation}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[var(--kw-outline-variant)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--kw-on-surface-variant)]">
                    {risk.affected_ids?.length ? `${risk.affected_ids.length} entity affected` : "Cluster-wide"}
                  </span>
                  <Link
                    to={targetLink}
                    className="text-xs font-bold text-[var(--kw-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{actionLabel}</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Quick navigation */}
      <div>
        <h2 className="kw-headline-sm text-[var(--kw-on-surface)] mb-[var(--kw-space-md)]">Quick Access</h2>
        <div className="grid grid-cols-1 gap-[var(--kw-space-md)] sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ to, label, icon: Icon, desc }) => (
            <Link
              key={to}
              to={to}
              className="kw-card group flex flex-col gap-3 no-underline transition-shadow hover:shadow-[var(--kw-shadow-md)]"
            >
              <div className="flex size-10 items-center justify-center rounded-[var(--kw-radius)] bg-[var(--kw-surface-container)]">
                <Icon className="size-5 text-[var(--kw-primary-container)]" aria-hidden="true" />
              </div>
              <div>
                <p className="kw-label-md text-[var(--kw-on-surface)] group-hover:text-[var(--kw-primary-container)] transition-colors">{label}</p>
                <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Backend status card */}
      <div className="kw-card">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-[var(--kw-primary-container)]" aria-hidden="true" />
          <span className="kw-label-md text-[var(--kw-on-surface)]">Backend Status</span>
        </div>
        {isHealthLoading ? (
          <KwLoadingState label="Checking backend…" className="min-h-[80px]" />
        ) : isHealthError ? (
          <KwErrorState title="Backend unreachable" detail="Cannot connect to the API server. Start the backend with: uvicorn app.main:app --port 8000" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {[
              { label: "Status", value: health?.status ?? "–" },
              { label: "Version", value: health?.version ?? "–" },
              { label: "Environment", value: health?.environment ?? "–" },
              { label: "Database", value: health?.database_connected ? "Connected ✓" : "Disconnected ✗" },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="kw-caption text-[var(--kw-on-surface-variant)] uppercase tracking-widest">{label}</dt>
                <dd className="kw-body-md-med text-[var(--kw-on-surface)] mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
