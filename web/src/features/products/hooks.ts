/**
 * Feature hooks — Products
 *
 * src/features/products/hooks.ts
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
  artisan_id?: string;
  title: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  price_inr?: number;
  image_url?: string;
  cloudinary_public_id?: string;
  availability?: boolean;
  status: "draft" | "pending_validation" | "approved" | "rejected" | "published" | "archived" | string;
  rejection_reason?: string;
  gi_watermarked?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiProductListResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export interface ProductCreatePayload {
  artisan_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
  cloudinary_public_id?: string;
  dimensions?: string;
  materials?: string;
  production_lead_time_days?: number;
}

export interface MaterialCostLine {
  name: string;
  quantity: number;
  unit: string;
  unit_cost_inr: number;
  wastage_percent?: number;
}

export interface LabourStageCostLine {
  stage_name: string;
  hours: number;
  hourly_rate_inr?: number;
}

export interface FairPriceEstimateRequest {
  product_title?: string;
  materials?: MaterialCostLine[];
  labour_stages?: LabourStageCostLine[];
  packaging_inr?: number;
  overhead_percent?: number;
  commission_percent?: number;
  target_margin_percent?: number;
  markup_percent?: number;
}

export interface CostBreakdownItem {
  name: string;
  amount: number;
  notes?: string;
  stale?: boolean;
}

export interface FairPriceEstimateResponse {
  is_valid: boolean;
  is_incomplete: boolean;
  pricing_mode: string;
  currency: string;
  materials_cost: number;
  wastage_cost: number;
  direct_materials_total: number;
  labour_cost: number;
  packaging_cost: number;
  direct_production_cost: number;
  overhead_cost: number;
  total_production_cost: number;
  profit_amount: number;
  profit_percentage: number;
  commission_amount: number;
  commission_percentage: number;
  floor_price: number;
  suggested_retail_price: number;
  artisan_earnings: number;
  artisan_share_percent: number;
  material_breakdown: CostBreakdownItem[];
  labour_breakdown: CostBreakdownItem[];
  stale_material_flags: string[];
  missing_inputs: string[];
  warnings: string[];
  quote_validity_days: number;
  quote_valid_until: string;
  calculated_at: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useProductList(params?: { page?: number; status?: string; search?: string; category?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.status) queryParams.set("status", params.status);
  if (params?.search) queryParams.set("search", params.search);
  if (params?.category) queryParams.set("category", params.category);
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

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductCreatePayload) =>
      apiClient.post<ApiProduct>(`/api/v1/products`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/v1/products/${id}/publish`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
      void qc.invalidateQueries({ queryKey: ["products", "validation-queue"] });
    },
  });
}

export function useFairPriceEstimate() {
  return useMutation({
    mutationFn: (payload: FairPriceEstimateRequest) =>
      apiClient.post<FairPriceEstimateResponse>(`/api/v1/pricing/fairprice/estimate`, payload),
  });
}

export function useValidationQueue() {
  return useQuery({
    queryKey: ["products", "validation-queue"],
    queryFn: () => apiClient.get<ApiProduct[]>("/api/v1/products/validation-queue"),
    staleTime: 15_000,
  });
}

export function useValidateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "approve" | "reject"; reason?: string }) =>
      apiClient.post<ApiProduct>(`/api/v1/products/${id}/validate`, { action, reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
      void qc.invalidateQueries({ queryKey: ["products", "validation-queue"] });
    },
  });
}
