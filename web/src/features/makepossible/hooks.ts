/**
 * Feature hooks — MakePossible Feasibility Engine
 *
 * src/features/makepossible/hooks.ts
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SkillRecord {
  skill: string;
  level?: string;
  notes?: string;
}

export interface MaterialRecord {
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold?: number;
  updated_at?: string;
}

export interface ComparablePriceStats {
  min: number;
  avg: number;
  max: number;
  count: number;
}

export interface CollectiveSnapshot {
  shg_id: string;
  shg_name: string;
  monthly_capacity?: number;
  skills: SkillRecord[];
  materials: MaterialRecord[];
  active_workload_units: number;
  comparable_prices?: ComparablePriceStats;
}

export interface CustomRequestSpec {
  quantity: number;
  craft_preference?: string;
  materials?: string;
  category?: string;
  budget_inr_per_unit?: number;
  budget_inr_total?: number;
  deadline_in_days?: number;
  customisation_notes?: string;
}

export interface MakePossibleEvaluationRequest {
  request: CustomRequestSpec;
  snapshot?: CollectiveSnapshot;
  shg_id?: string;
  inventory_freshness_threshold_days?: number;
}

export interface MakePossibleEvaluationResult {
  status: "feasible" | "uncertain" | "not_feasible" | string;
  evidence: string[];
  missing_info: string[];
  constraints: string[];
  suggested_changes: string[];
  summary: string;
  data_used: Record<string, unknown>;
  evaluated_at: string;
}

export function useEvaluateFeasibility() {
  return useMutation({
    mutationFn: (payload: MakePossibleEvaluationRequest) =>
      apiClient.post<MakePossibleEvaluationResult>("/api/v1/makepossible/evaluate", payload),
  });
}
