/**
 * /workroom/admin — Platform Administrator Workspace
 *
 * Dedicated admin dashboard:
 * - SHG cluster management & federation health
 * - Blockchain DPP ledger audit
 * - Role administration
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { requireRole } from "@/lib/guards";
import { useAuth } from "@/features/auth";
import { KwNoAccessState } from "@/components/kw-primitives";
import { ShieldCheck, Database, Users, History } from "lucide-react";

export const Route = createFileRoute("/workroom/admin")({
  head: () => ({
    meta: [{ title: "Admin Workspace — Kalaswar Workroom" }],
  }),
  beforeLoad: async () => {
    await requireRole("admin");
  },
  errorComponent: () => (
    <KwNoAccessState
      title="Admin Access Restricted"
      detail="This workspace is restricted to Platform Administrators. You do not have permission with your current role (403 Forbidden)."
    />
  ),
  component: WorkroomAdminPage,
});

const ADMIN_LINKS = [
  { to: "/workroom/artisans", label: "Federation & Artisans", icon: Users, desc: "SHG collectives and cluster members" },
  { to: "/workroom/orders", label: "Production Ledgers", icon: Database, desc: "End-to-end audit of all SHG orders" },
  { to: "/workroom/products", label: "GI Craft Verification", icon: ShieldCheck, desc: "Provenance & DPP Merkle batches" },
  { to: "/workroom/settings", label: "System Audit Logs", icon: History, desc: "Action audit trails & security events" },
] as const;

function WorkroomAdminPage() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user && user.role !== "admin") {
    return (
      <KwNoAccessState
        title="Admin Access Restricted"
        detail="This workspace is restricted to Platform Administrators. You do not have permission with your current role (403 Forbidden)."
      />
    );
  }

  return (
    <div className="space-y-[var(--kw-space-xl)]">
      <div>
        <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">Platform Administration</h1>
        <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)]">
          System oversight, SHG federation governance, and cryptographically verified provenance logs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--kw-space-md)] sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_LINKS.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="kw-card group flex flex-col gap-3 no-underline transition-shadow hover:shadow-[var(--kw-shadow-md)]"
          >
            <div className="flex size-10 items-center justify-center rounded-[var(--kw-radius)] bg-[var(--kw-surface-container)]">
              <Icon className="size-5 text-[var(--kw-primary-container)]" aria-hidden="true" />
            </div>
            <div>
              <p className="kw-label-md text-[var(--kw-on-surface)] group-hover:text-[var(--kw-primary-container)] transition-colors">
                {label}
              </p>
              <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
