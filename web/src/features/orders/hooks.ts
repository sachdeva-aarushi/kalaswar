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
  shipments: (orderId?: string) => ["shipments", orderId] as const,
};

export interface OrderAssignment {
  id: string;
  order_id: string;
  artisan_id: string;
  artisan_name?: string;
  assigned_at: string;
  assigned_by: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  note?: string;
  created_at: string;
}

export interface ApiOrder {
  id: string;
  product_id?: string;
  product_title?: string;
  product_image_url?: string;
  customer_reference?: string;
  artisan_id?: string;
  shg_cluster_id?: string;
  customer_id?: string;
  status: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  total_amount_inr?: number;
  expected_dispatch_at?: string;
  created_at?: string;
  updated_at?: string;
  assignments?: OrderAssignment[];
  events?: OrderEvent[];
}

export interface ApiOrderListResponse {
  items: ApiOrder[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export function useOrderList(params?: { page?: number; status?: string; customer_reference?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.status) queryParams.set("status", params.status);
  if (params?.customer_reference) queryParams.set("customer_reference", params.customer_reference);
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
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      apiClient.patch(`/api/v1/orders/${id}/status`, { status, note }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: orderKeys.all });
      void qc.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}

export function useAssignArtisan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ order_id, artisan_id, assigned_by }: { order_id: string; artisan_id: string; assigned_by?: string }) =>
      apiClient.post(`/api/v1/assignments`, { order_id, artisan_id, assigned_by }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: orderKeys.detail(variables.order_id) });
      void qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export interface ShipmentResponse {
  id: string;
  order_id: string;
  carrier: string;
  tracking_ref: string;
  status: string;
  dispatched_at: string;
  events: Array<{
    id: string;
    shipment_id: string;
    event_type: string;
    location?: string;
    note?: string;
    occurred_at: string;
  }>;
}

export function useShipments(orderId?: string) {
  return useQuery({
    queryKey: orderKeys.shipments(orderId),
    queryFn: () => apiClient.get<ShipmentResponse[]>(`/api/v1/shipments${orderId ? `?order_id=${orderId}` : ""}`),
    enabled: Boolean(orderId),
    staleTime: 30_000,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { order_id: string; carrier: string; tracking_ref: string; estimated_delivery_at?: string }) =>
      apiClient.post<ShipmentResponse>(`/api/v1/shipments`, payload),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: orderKeys.shipments(variables.order_id) });
      void qc.invalidateQueries({ queryKey: orderKeys.detail(variables.order_id) });
    },
  });
}

export function useAppendShipmentEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shipment_id, event_type, location, note }: { shipment_id: string; event_type: string; location?: string; note?: string }) =>
      apiClient.post(`/api/v1/shipments/${shipment_id}/events`, { event_type, location, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}


export interface ArtisanSuggestion {
  artisan_id: string;
  artisan_name: string;
  craft_skills: string[];
  cluster: string;
  match_score: number;
  recommended: boolean;
  active_orders: number;
  reasons: string[];
}

export function useAssignmentSuggestions(orderId?: string, craft?: string) {
  const queryParams = new URLSearchParams();
  if (orderId) queryParams.set("order_id", orderId);
  if (craft) queryParams.set("craft", craft);
  const qs = queryParams.toString();

  return useQuery({
    queryKey: ["assignments", "suggestions", orderId, craft],
    queryFn: () => apiClient.get<ArtisanSuggestion[]>(`/api/v1/assignments/suggestions${qs ? `?${qs}` : ""}`),
    enabled: Boolean(orderId || craft),
    staleTime: 30_000,
  });
}

export interface QualityCheck {
  id: string;
  order_id: string;
  artisan_id?: string;
  result: "pass" | "fail" | "conditional";
  notes?: string;
  checked_by?: string;
  checked_at: string;
}

export function useQualityChecks(orderId?: string) {
  return useQuery({
    queryKey: ["quality-checks", orderId],
    queryFn: () => apiClient.get<QualityCheck[]>(`/api/v1/quality-checks${orderId ? `?order_id=${orderId}` : ""}`),
    enabled: Boolean(orderId),
    staleTime: 30_000,
  });
}

export function useRecordQualityCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { order_id: string; result: "pass" | "fail" | "conditional"; notes: string; checked_by?: string }) =>
      apiClient.post<QualityCheck>(`/api/v1/quality-checks`, payload),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ["quality-checks", variables.order_id] });
      void qc.invalidateQueries({ queryKey: orderKeys.detail(variables.order_id) });
    },
  });
}
