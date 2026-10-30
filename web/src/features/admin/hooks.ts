/**
 * Feature hooks — Platform Administration
 *
 * src/features/admin/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const adminKeys = {
  all: ["admin"] as const,
  users: ["admin", "users"] as const,
  auditLogs: ["admin", "audit-logs"] as const,
  demoMode: ["admin", "demo-mode"] as const,
};

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "coordinator" | "artisan" | "buyer" | "customer" | string;
  cluster?: string;
  status: "active" | "suspended" | string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  payload?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface DemoModeState {
  enabled: boolean;
  instant_dbt?: boolean;
  simulated_courier?: boolean;
  mock_whatsapp?: boolean;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => apiClient.get<AdminUser[]>("/api/v1/auth/users"),
    staleTime: 30_000,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch<{ status: string; user: AdminUser }>(`/api/v1/auth/users/${userId}/role`, { role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.users });
      void qc.invalidateQueries({ queryKey: adminKeys.auditLogs });
    },
  });
}

export function useAuditLogs(limit: number = 50) {
  return useQuery({
    queryKey: [...adminKeys.auditLogs, limit],
    queryFn: () => apiClient.get<{ total: number; data: AuditLogEntry[] }>(`/api/v1/audit/logs?limit=${limit}`),
    staleTime: 15_000,
  });
}

export function useDemoMode() {
  return useQuery({
    queryKey: adminKeys.demoMode,
    queryFn: () => apiClient.get<DemoModeState>("/api/v1/auth/settings/demo-mode"),
    staleTime: 60_000,
  });
}

export function useToggleDemoMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiClient.post<{ status: string; demo_mode: DemoModeState }>("/api/v1/auth/settings/demo-mode", { enabled }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.demoMode });
      void qc.invalidateQueries({ queryKey: adminKeys.auditLogs });
    },
  });
}

