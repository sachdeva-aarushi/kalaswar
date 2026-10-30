/**
 * /workroom (index) — Coordinator dashboard overview
 *
 * Calls GET /api/v1/dashboard/coordinator to display live operational metrics,
 * automated risk flags, and recent collective activity.
 *
 * Resilience:
 * - 15-second AbortController timeout & 1-retry cap
 * - 401 Unauthorized: Clears session and redirects to /auth
 * - 403 Forbidden: Clear "No Access" state
 * - Network / Timeout: KwErrorState with Retry button
 * - Loading capped at 15s max via KwLoadingState safeguard
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCoordinatorDashboard } from "@/features/dashboard";
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
} from "lucide-react";

export const Route = createFileRoute("/workroom/")({
  head: () => ({
    meta: [{ title: "Overview — Kalaswar Workroom" }],
  }),
  component: WorkroomIndex,
});

const QUICK_LINKS = [
  { to: "/workroom/orders", label: "Orders", icon: ShoppingBag, desc: "Track and manage production orders" },
  { to: "/workroom/products", label: "Products", icon: Package, desc: "Review and publish product listings" },
  { to: "/workroom/artisans", label: "Artisans", icon: Users, desc: "Artisan profiles and assignments" },
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
    return <KwLoadingState label="Loading coordinator dashboard…" retry={() => void refetchDash()} />;
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
  const riskFlags = dashboard?.risk_flags ?? [];

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
              Past dispatch date
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

      {/* Automated Risk Flags */}
      {riskFlags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--kw-secondary)]" />
            <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">Operational Risk Alerts</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {riskFlags.map((risk, idx) => (
              <div
                key={idx}
                className="kw-card border-l-4 p-4"
                style={{
                  borderLeftColor:
                    risk.severity === "high"
                      ? "var(--kw-secondary, #b85f45)"
                      : risk.severity === "medium"
                      ? "#f59e0b"
                      : "#6b7280",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--kw-on-surface)]">{risk.title}</p>
                  <span
                    className={`kw-badge ${
                      risk.severity === "high"
                        ? "kw-badge-danger"
                        : risk.severity === "medium"
                        ? "kw-badge-warning"
                        : "kw-badge-neutral"
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--kw-on-surface-variant)]">{risk.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick navigation */}
      <div>
        <h2 className="kw-headline-sm text-[var(--kw-on-surface)] mb-[var(--kw-space-md)]">Quick Access</h2>
        <div className="grid grid-cols-1 gap-[var(--kw-space-md)] sm:grid-cols-3">
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
