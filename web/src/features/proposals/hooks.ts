/**
 * Feature hooks — Proposals
 *
 * src/features/proposals/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const proposalKeys = {
  all: ["proposals"] as const,
  list: (requestId?: string) => ["proposals", "list", requestId] as const,
  detail: (id: string) => ["proposals", "detail", id] as const,
};

export interface ApprovalRecord {
  approver_role: "coordinator" | "buyer" | string;
  approver_name: string;
  approver_user_id?: string;
  approved_at: string;
  notes?: string;
}

export interface ProposalSpec {
  title: string;
  craft: string;
  quantity: number;
  unit_price_inr: number;
  total_price_inr: number;
  timeline_days: number;
  materials_summary: string;
  delivery_terms: string;
  cancellation_terms: string;
  customisation_details?: string;
  costing_breakdown?: Record<string, unknown>;
}

export interface ProposalVersionDetail {
  version: number;
  spec: ProposalSpec;
  status: "draft" | "submitted" | "revised" | "superseded" | "confirmed" | string;
  created_by: string;
  created_at: string;
  coordinator_approval?: ApprovalRecord | null;
  buyer_approval?: ApprovalRecord | null;
  is_immutable: boolean;
}

export interface SampleResponse {
  id: string;
  proposal_id: string;
  spec_version: number;
  fee_inr: number;
  status: string;
  tracking_number?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalResponse {
  id: string;
  title: string;
  current_version: number;
  status: "draft" | "submitted" | "revised" | "superseded" | "confirmed" | string;
  current_spec: ProposalSpec;
  versions: ProposalVersionDetail[];
  both_parties_approved: boolean;
  confirmed_order_id?: string | null;
  samples: SampleResponse[];
  created_at: string;
  updated_at: string;
}

export interface ProposalCreateRequest {
  title: string;
  spec: ProposalSpec;
  buyer_id?: string;
  shg_id?: string;
  request_id?: string;
  created_by?: string;
}

export interface ProposalReviseRequest {
  reason_for_revision: string;
  new_spec: ProposalSpec;
  revised_by?: string;
}

export interface ProposalApproveRequest {
  version: number;
  approver_role: "coordinator" | "buyer";
  approver_name: string;
  notes?: string;
}

export function useProposalList(requestId?: string) {
  return useQuery({
    queryKey: proposalKeys.list(requestId),
    queryFn: () =>
      apiClient.get<ProposalResponse[]>(
        `/api/v1/proposals${requestId ? `?request_id=${requestId}` : ""}`,
      ),
    staleTime: 30_000,
  });
}

export function useProposalDetail(id: string) {
  return useQuery({
    queryKey: proposalKeys.detail(id),
    queryFn: () => apiClient.get<ProposalResponse>(`/api/v1/proposals/${id}`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProposalCreateRequest) =>
      apiClient.post<ProposalResponse>(`/api/v1/proposals`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}

export function useSubmitProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ProposalResponse>(`/api/v1/proposals/${id}/submit`),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: proposalKeys.all });
      void qc.invalidateQueries({ queryKey: proposalKeys.detail(id) });
    },
  });
}

export function useReviseProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProposalReviseRequest }) =>
      apiClient.post<ProposalResponse>(`/api/v1/proposals/${id}/revise`, payload),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: proposalKeys.all });
      void qc.invalidateQueries({ queryKey: proposalKeys.detail(id) });
    },
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProposalApproveRequest }) =>
      apiClient.post<ProposalResponse>(`/api/v1/proposals/${id}/approve`, payload),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: proposalKeys.all });
      void qc.invalidateQueries({ queryKey: proposalKeys.detail(id) });
    },
  });
}



export interface ProposalDeclineRequest {
  version: number;
  reason: string;
  declined_by?: string;
}

export function useDeclineProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProposalDeclineRequest }) =>
      apiClient.post<ProposalResponse>(`/api/v1/proposals/${id}/decline`, payload),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: proposalKeys.all });
      void qc.invalidateQueries({ queryKey: proposalKeys.detail(id) });
    },
  });
}

export function useUpdateSampleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, sampleId, new_status, feedback, tracking_number }: {
      proposalId: string;
      sampleId: string;
      new_status: string;
      feedback?: string;
      tracking_number?: string;
    }) =>
      apiClient.patch<SampleResponse>(`/api/v1/proposals/${proposalId}/samples/${sampleId}`, {
        new_status,
        feedback,
        tracking_number,
      }),
    onSuccess: (_, { proposalId }) => {
      void qc.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
      void qc.invalidateQueries({ queryKey: proposalKeys.all });
    },
  });
}
