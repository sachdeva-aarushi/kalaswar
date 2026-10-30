/**
 * Feature hooks — Health & system status
 *
 * src/features/health/hooks.ts
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  database_connected: boolean;
  uptime_seconds?: number;
}

export const healthKeys = {
  all: ["health"] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: () => apiClient.get<HealthResponse>("/api/v1/health"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
