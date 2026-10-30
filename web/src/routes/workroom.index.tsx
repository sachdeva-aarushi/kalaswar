/**
 * /workroom (index) — Coordinator dashboard overview
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useHealth } from "@/features/health/hooks";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { Activity, Package, ShoppingBag, Users } from "lucide-react";

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
  const { data: health, isLoading, isError } = useHealth();

  return (
    <div className="space-y-[var(--kw-space-xl)]">
      <div>
        <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">Workroom Overview</h1>
        <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)]">
          Welcome back. Here's a summary of your collective's activity.
        </p>
      </div>

      {/* Backend status card */}
      <div className="kw-card">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-[var(--kw-primary-container)]" aria-hidden="true" />
          <span className="kw-label-md text-[var(--kw-on-surface)]">Backend Status</span>
        </div>
        {isLoading ? (
          <KwLoadingState label="Checking backend…" className="min-h-[80px]" />
        ) : isError ? (
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
    </div>
  );
}
