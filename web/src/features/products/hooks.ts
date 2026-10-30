/**
 * Feature hooks — Products
 *
 * src/features/products/hooks.ts
 *
 * Uses the existing Supabase TanStack Query from lib/data.ts for backward
 * compatibility with the frozen pages, AND provides new FastAPI-backed hooks
 * for the workroom and shop route groups.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// ── Query keys ────────────────────────────────────────────────────────────────

export const productKeys = {
  all: ["products"] as const,
  list: (params?: Record<string, unknown>) =>
    ["products", "list", params] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  price_inr?: number;
  artisan_id?: string;
  shg_cluster_id?: string;
  status: "draft" | "published" | "archived";
  cloudinary_public_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiProductListResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  page_size: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useProductList(params?: { page?: number; status?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.status) queryParams.set("status", params.status);
  const qs = queryParams.toString();

  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () =>
      apiClient.get<ApiProductListResponse>(
        `/api/v1/products${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 30_000,
  });
}

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiClient.get<ApiProduct>(`/api/v1/products/${id}`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/v1/products/${id}/publish`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
