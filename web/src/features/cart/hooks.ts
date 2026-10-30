/**
 * Feature hooks — Shopping Cart & Simulated Checkout (DEMO)
 *
 * src/features/cart/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const cartKeys = {
  all: ["cart"] as const,
  detail: () => ["cart", "current"] as const,
};

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  product_title: string;
  product_image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  customisation?: Record<string, unknown>;
}

export interface CartResponse {
  id: string;
  user_id?: string;
  session_id?: string;
  status: "active" | "checked_out";
  currency: string;
  items: CartItem[];
  subtotal_inr: number;
  total_items: number;
}

export interface AddCartItemPayload {
  product_id: string;
  quantity: number;
  customisation?: Record<string, unknown>;
}

export interface CheckoutPayload {
  customer_reference: string;
  shipping_address?: string;
  payment_method?: "upi_qr" | "dbt_bank" | "cod" | string;
}

export interface CheckoutResponse {
  order_id: string;
  order_status: string;
  amount_inr: number;
  payment_status: string;
  payment_reference: string;
  payment_method: string;
  is_demo: boolean;
  customer_reference: string;
  message: string;
}

export function useCart() {
  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn: () => apiClient.get<CartResponse>("/api/v1/cart"),
    staleTime: 10_000,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCartItemPayload) =>
      apiClient.post<CartResponse>("/api/v1/cart/items", payload),
    onSuccess: (updated) => {
      qc.setQueryData(cartKeys.detail(), updated);
      void qc.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiClient.patch<CartResponse>(`/api/v1/cart/items/${id}`, { quantity }),
    onSuccess: (updated) => {
      qc.setQueryData(cartKeys.detail(), updated);
      void qc.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<CartResponse>(`/api/v1/cart/items/${id}`),
    onSuccess: (updated) => {
      qc.setQueryData(cartKeys.detail(), updated);
      void qc.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) =>
      apiClient.post<CheckoutResponse>("/api/v1/cart/checkout", payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: cartKeys.all });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

