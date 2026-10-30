/**
 * /workroom/admin — Platform Administrator Workspace
 *
 * Scoped under .kw-app.
 * Flow 8: Platform Admin:
 * - Users & Roles administration (role switcher calling PATCH /auth/users/{id}/role)
 * - Live cryptographic & audit log feed (GET /audit/logs)
 * - Demo-Mode Governance toggle (POST /auth/settings/demo-mode)
 * - Strict RLS: Restricted solely to admin role; coordinators & artisans see KwNoAccessState (403 Forbidden).
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requireRole } from "@/lib/guards";
import { useAuth } from "@/features/auth";
import {
  useAdminUsers,
  useUpdateUserRole,
  useAuditLogs,
  useDemoMode,
  useToggleDemoMode,
  type AdminUser,
} from "@/features/admin/hooks";
import { KwLoadingState, KwErrorState, KwNoAccessState, KwTableSkeleton } from "@/components/kw-primitives";
import {
  ShieldCheck,
  Users,
  History,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/workroom/admin")({
  head: () => ({
    meta: [{ title: "Platform Administration — Kalaswar" }],
  }),
  beforeLoad: async () => {
    await requireRole("admin");
  },
  errorComponent: () => (
    <KwNoAccessState
      title="Admin Access Restricted (403 Forbidden)"
      detail="This workspace is restricted to Platform Administrators. You do not have permission with your current role."
    />
  ),
  component: WorkroomAdminPage,
});

function WorkroomAdminPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data: users, isLoading: isUsersLoading, refetch: refetchUsers } = useAdminUsers();
  const { data: auditData, isLoading: isAuditLoading, refetch: refetchAudit } = useAuditLogs(25);
  const { data: demoMode, isLoading: isDemoLoading } = useDemoMode();

  const updateUserRole = useUpdateUserRole();
  const toggleDemoMode = useToggleDemoMode();

  const [activeTab, setActiveTab] = useState<"users" | "audit" | "demo">("users");
  const [roleChangeSuccess, setRoleChangeSuccess] = useState<string | null>(null);

  // Strict RLS client-side guard
  if (!isAuthLoading && user && user.role !== "admin") {
    return (
      <KwNoAccessState
        title="Admin Access Restricted (403 Forbidden)"
        detail="This workspace is restricted to Platform Administrators. You do not have permission with your current role."
      />
    );
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleChangeSuccess(null);
    try {
      await updateUserRole.mutateAsync({ userId, role: newRole });
      setRoleChangeSuccess(`User role updated to ${newRole}`);
      setTimeout(() => setRoleChangeSuccess(null), 3000);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleToggleDemo = async () => {
    const currentState = demoMode?.enabled ?? true;
    await toggleDemoMode.mutateAsync(!currentState);
  };

  const auditLogs = auditData?.data ?? [];

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Platform Administration</h1>
            <span className="kw-badge kw-badge-primary">Root Governance</span>
          </div>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">
            Role assignments, audit trail monitoring, and hackathon demo-mode toggles.
          </p>
        </div>

        {/* Demo Mode Quick Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleToggleDemo()}
            disabled={toggleDemoMode.isPending}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 border transition-colors ${
              demoMode?.enabled ?? true
                ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                : "bg-neutral-100 border-neutral-300 text-neutral-800 hover:bg-neutral-200"
            }`}
          >
            {demoMode?.enabled ?? true ? (
              <ToggleRight className="size-4 text-amber-700" />
            ) : (
              <ToggleLeft className="size-4 text-neutral-500" />
            )}
            <span>Demo Mode: {demoMode?.enabled ?? true ? "ENABLED" : "DISABLED"}</span>
          </button>
        </div>
      </div>

      {roleChangeSuccess && (
        <div
          role="status"
          className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{roleChangeSuccess}</span>
        </div>
      )}

      {/* ── Tabs: Users & Roles vs Audit Log vs Demo Mode ─────────────────── */}
      <div className="flex items-center gap-6 border-b border-[var(--kw-outline-variant)] pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <Users className="size-4" />
          <span>Users & Roles</span>
          {users && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {users.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "audit"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <History className="size-4" />
          <span>System Audit Log</span>
          {auditLogs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {auditLogs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("demo")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "demo"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <Sparkles className="size-4" />
          <span>Demo Mode Controls</span>
        </button>
      </div>

      {/* ── Tab Content: Users & Roles ─────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {isUsersLoading ? (
            <KwTableSkeleton rows={5} cols={5} />
          ) : !users?.length ? (
            <KwEmptyState title="No users found" description="No registered platform users." />
          ) : (
            <div className="kw-card p-0 overflow-x-auto">
              <table className="kw-table">
                <thead>
                  <tr>
                    <th>User / Name</th>
                    <th>Email Address</th>
                    <th>Cluster / SHG</th>
                    <th>Role Assignment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                      <td>
                        <span className="kw-body-md font-semibold text-[var(--kw-primary)] block">
                          {u.display_name || "Platform Member"}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--kw-on-surface-variant)]">
                          {u.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="kw-body-sm font-mono text-xs text-[var(--kw-on-surface)]">{u.email}</td>
                      <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">{u.cluster || "Federation Core"}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                          disabled={updateUserRole.isPending}
                          aria-label={`Role assignment for ${u.display_name || u.email}`}
                          className="h-8 px-2 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] font-medium focus:outline-none focus:border-[var(--kw-primary-container)]"
                        >
                          <option value="admin">admin (Platform Admin)</option>
                          <option value="coordinator">coordinator (SHG Coordinator)</option>
                          <option value="artisan">artisan (Artisan Member)</option>
                          <option value="buyer">buyer (B2B Corporate)</option>
                          <option value="customer">customer (D2C Customer)</option>
                        </select>
                      </td>
                      <td>
                        <span className="kw-badge kw-badge-success">{u.status || "active"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Audit Logs ────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {isAuditLoading ? (
            <KwTableSkeleton rows={6} cols={5} />
          ) : !auditLogs.length ? (
            <KwEmptyState title="No audit entries" description="No audit log entries recorded." />
          ) : (
            <div className="kw-card p-0 overflow-x-auto">
              <table className="kw-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                      <td className="font-mono text-[11px] text-[var(--kw-on-surface-variant)] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className="font-semibold text-xs text-[var(--kw-primary)]">
                          {log.action}
                        </span>
                      </td>
                      <td className="text-xs text-[var(--kw-on-surface)]">{log.actor}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded bg-[var(--kw-surface-container)] text-[10px] font-mono uppercase">
                          {log.entity_type || log.entity}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-muted-foreground">
                        {log.entity_id ? log.entity_id.slice(0, 12) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Demo Mode Controls ────────────────────────────────── */}
      {activeTab === "demo" && (
        <div className="kw-card p-6 space-y-5 max-w-2xl border border-[var(--kw-outline-variant)]">
          <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)] pb-4">
            <div>
              <h3 className="font-bold text-sm text-[var(--kw-primary)]">Master Demo Mode Switch</h3>
              <p className="text-xs text-[var(--kw-on-surface-variant)] mt-0.5">
                Controls whether third-party services (WhatsApp, UPI, Delhivery, L2 Escrow) run in simulated mode.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleDemo()}
              disabled={toggleDemoMode.isPending}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all ${
                demoMode?.enabled ?? true
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  : "bg-neutral-200 text-neutral-800"
              }`}
            >
              {demoMode?.enabled ?? true ? "Demo Mode ON" : "Demo Mode OFF"}
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
              <div>
                <span className="font-semibold block text-[var(--kw-on-surface)]">Simulated Working Capital DBT</span>
                <span className="text-[var(--kw-on-surface-variant)]">Instant auto-advancement for PO micro-factoring (80% escrow)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
              <div>
                <span className="font-semibold block text-[var(--kw-on-surface)]">Simulated Delhivery Logistics</span>
                <span className="text-[var(--kw-on-surface-variant)]">Mock waybill generation with tracking DEL-XXXXXX</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
              <div>
                <span className="font-semibold block text-[var(--kw-on-surface)]">Simulated WhatsApp Webhook Pipeline</span>
                <span className="text-[var(--kw-on-surface-variant)]">Voice note transcription and draft listing parsing</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
