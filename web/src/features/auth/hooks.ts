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

// ── Backend profile (roles from FastAPI /auth/me) ──────────────────────────────

export interface UserProfileResponse {
  user_id: string;
  email: string;
  roles: string[];
  is_demo?: boolean;
}

export function useBackendProfile() {
  return useQuery<UserProfileResponse>({
    queryKey: authKeys.profile,
    queryFn: () => apiClient.get<UserProfileResponse>("/api/v1/auth/me"),
    staleTime: 5 * 60_000,
    retry: false,
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
