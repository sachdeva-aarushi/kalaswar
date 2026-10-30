/**
 * Feature hooks — Inventory
 *
 * src/features/inventory/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const inventoryKeys = {
  all: ["inventory"] as const,
  materials: (params?: Record<string, unknown>) => ["inventory", "materials", params] as const,
  summary: ["inventory", "summary"] as const,
};

export interface MaterialInventory {
  id: string;
  shg_id: string;
  shg_name?: string;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold?: number;
  updated_at: string;
  updated_by?: string;
  is_low_stock: boolean;
  is_stale: boolean;
  age_in_days: number;
}

export interface InventorySummary {
  total_materials: number;
  low_stock_count: number;
  stale_materials_count: number;
  total_finished_products: number;
  active_shgs_count: number;
}

export interface MaterialCreatePayload {
  shg_id: string;
  name: string;
  unit?: string;
  quantity: number;
  low_stock_threshold?: number;
}

export interface MaterialUpdatePayload {
  name?: string;
  unit?: string;
  quantity?: number;
  low_stock_threshold?: number;
  updated_by?: string;
}

export function useMaterialsList(params?: {
  shg_id?: string;
  low_stock?: boolean;
  stale_only?: boolean;
  freshness_threshold_days?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.shg_id) queryParams.set("shg_id", params.shg_id);
  if (params?.low_stock !== undefined) queryParams.set("low_stock", String(params.low_stock));
  if (params?.stale_only !== undefined) queryParams.set("stale_only", String(params.stale_only));
  if (params?.freshness_threshold_days) queryParams.set("freshness_threshold_days", String(params.freshness_threshold_days));
  const qs = queryParams.toString();

  return useQuery({
    queryKey: inventoryKeys.materials(params),
    queryFn: () => apiClient.get<MaterialInventory[]>(`/api/v1/inventory/materials${qs ? `?${qs}` : ""}`),
    staleTime: 30_000,
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: inventoryKeys.summary,
    queryFn: () => apiClient.get<InventorySummary>(`/api/v1/inventory/summary`),
    staleTime: 30_000,
  });
}

export function useAddMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialCreatePayload) =>
      apiClient.post<MaterialInventory>(`/api/v1/inventory/materials`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MaterialUpdatePayload }) =>
      apiClient.patch<MaterialInventory>(`/api/v1/inventory/materials/${id}`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/inventory/materials/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
