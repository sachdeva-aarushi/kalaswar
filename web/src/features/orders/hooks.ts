/**
 * Feature hooks — Orders
 *
 * src/features/orders/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const orderKeys = {
  all: ["orders"] as const,
  list: (params?: Record<string, unknown>) => ["orders", "list", params] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

export interface ApiOrder {
  id: string;
  product_id?: string;
  artisan_id?: string;
  shg_cluster_id?: string;
  customer_id?: string;
  status: string;
  quantity: number;
  total_amount_inr?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiOrderListResponse {
  items: ApiOrder[];
  total: number;
  page: number;
  page_size: number;
}

export function useOrderList(params?: { page?: number; status?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.status) queryParams.set("status", params.status);
  const qs = queryParams.toString();

  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () =>
      apiClient.get<ApiOrderListResponse>(
        `/api/v1/orders${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 30_000,
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient.get<ApiOrder>(`/api/v1/orders/${id}`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/v1/orders/${id}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
