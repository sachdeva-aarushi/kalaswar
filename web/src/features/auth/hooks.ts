/**
 * Feature hooks — Authentication & user profile
 *
 * src/features/auth/hooks.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getSessionUser, performSignOut, type SessionUser } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";

// ── Query keys ────────────────────────────────────────────────────────────────

export const authKeys = {
  session: ["auth", "session"] as const,
  profile: ["auth", "profile"] as const,
};

// ── Session user (client-side Supabase check) ─────────────────────────────────

export function useSessionUser() {
  return useQuery<SessionUser | null>({
    queryKey: authKeys.session,
    queryFn: getSessionUser,
    staleTime: 5 * 60_000,
  });
}

// ── Backend profile (roles & preferences from FastAPI /auth/me) ──────────────

export interface UserProfileResponse {
  user_id: string;
  email: string;
  roles: string[];
  display_name?: string | null;
  preferred_language?: string | null;
  phone?: string | null;
  onboarding_status?: string | null;
  artisan_id?: string | null;
  shg_id?: string | null;
  is_demo?: boolean;
}

export function useBackendProfile() {
  return useQuery<UserProfileResponse>({
    queryKey: authKeys.profile,
    queryFn: () => apiClient.get<UserProfileResponse>("/api/v1/auth/me"),
    staleTime: 60_000,
    retry: false,
  });
}

// ── Profile update mutation ───────────────────────────────────────────────────

export interface UpdateProfilePayload {
  display_name?: string;
  preferred_language?: string;
  phone?: string;
  bio?: string;
  craft_specialties?: string[];
  shipping_address?: string;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiClient.patch<UserProfileResponse>("/api/v1/auth/profile", payload),
    onSuccess: (data) => {
      qc.setQueryData(authKeys.profile, data);
      void qc.invalidateQueries({ queryKey: authKeys.profile });
    },
  });
}

// ── SHG Onboarding hooks ──────────────────────────────────────────────────────

export interface ShgCluster {
  id: string;
  name: string;
  state?: string;
  district?: string;
  leader_name?: string;
}

export function useShgClusters() {
  return useQuery<ShgCluster[]>({
    queryKey: ["onboarding", "shg-clusters"],
    queryFn: () => apiClient.get<ShgCluster[]>("/api/v1/onboarding/shg/clusters"),
    staleTime: 60_000,
  });
}

export interface ArtisanJoinRequestPayload {
  cluster_id: string;
  craft_id?: string;
  self_declared_experience_years?: number;
  daily_capacity?: number;
}

export function useSubmitArtisanJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ArtisanJoinRequestPayload) =>
      apiClient.post("/api/v1/onboarding/artisan/join-request", payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authKeys.profile });
    },
  });
}

// ── Sign out mutation ──────────────────────────────────────────────────────────

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => performSignOut(qc, navigate),
  });
}
