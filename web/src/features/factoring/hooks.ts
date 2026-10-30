/**
 * Feature hooks — PO Micro-Factoring & Working Capital Escrow (Labelled DEMO)
 *
 * src/features/factoring/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const factoringKeys = {
  all: ["factoring"] as const,
  list: ["factoring", "list"] as const,
  detail: (id: string) => ["factoring", "detail", id] as const,
};

export interface POFactoringRecord {
  id: string;
  po_reference?: string;
  po_number?: string;
  buyer_id?: string;
  buyer_name?: string;
  shg_id?: string;
  shg_name?: string;
  po_amount_inr?: number;
  total_order_value_inr?: number;
  advance_amount_inr?: number;
  advance_percent?: number;
  escrow_amount_inr?: number;
  escrow_balance_inr?: number;
  status: "po_created" | "tokenized" | "advance_disbursed" | "delivered" | "escrow_released" | string;
  token_id?: string;
  blockchain_tx_hash?: string;
  is_simulated?: boolean;
  simulation_notice?: string;
  created_at?: string;
  updated_at?: string;
  ledger_entries?: Array<{
    id?: string;
    step: string;
    action?: string;
    description?: string;
    note?: string;
    amount_inr?: number;
    timestamp: string;
    tx_hash?: string;
    tx_reference?: string;
  }>;
}

export function useFactoringList() {
  return useQuery({
    queryKey: factoringKeys.list,
    queryFn: () => apiClient.get<POFactoringRecord[]>("/api/v1/factoring/po"),
    staleTime: 30_000,
  });
}

export function useFactoringDetail(id: string) {
  return useQuery({
    queryKey: factoringKeys.detail(id),
    queryFn: () => apiClient.get<POFactoringRecord>(`/api/v1/factoring/po/${id}`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useAdvanceFactoringStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, step }: { id: string; step: "tokenize" | "disburse-advance" | "deliver" | "release-escrow" }) =>
      apiClient.post<POFactoringRecord>(`/api/v1/factoring/po/${id}/${step}`),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: factoringKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: factoringKeys.all });
    },
  });
}

