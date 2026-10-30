/**
 * Feature hooks — Coordinator Dashboard & Operational Risk Analytics
 *
 * src/features/dashboard/hooks.ts
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type CoordinatorDashboardResponse = components["schemas"]["CoordinatorDashboardResponse"];
export type DashboardCounts = components["schemas"]["DashboardCounts"];
export type RiskFlag = components["schemas"]["RiskFlag"];
export type RecentActivityItem = components["schemas"]["RecentActivityItem"];

export const dashboardKeys = {
  all: ["dashboard"] as const,
  coordinator: (shgId?: string) => ["dashboard", "coordinator", shgId ?? "default"] as const,
};

export function useCoordinatorDashboard(shgId?: string) {
  const qs = shgId ? `?shg_id=${encodeURIComponent(shgId)}` : "";

  return useQuery<CoordinatorDashboardResponse>({
    queryKey: dashboardKeys.coordinator(shgId),
    queryFn: () => apiClient.get<CoordinatorDashboardResponse>(`/api/v1/dashboard/coordinator${qs}`),
    staleTime: 30_000,
  });
}
