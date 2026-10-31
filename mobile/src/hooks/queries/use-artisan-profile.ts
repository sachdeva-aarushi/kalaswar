import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

export interface ArtisanProfileData {
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

export function useArtisanProfile() {
  return useQuery<ArtisanProfileData>({
    queryKey: ['artisan', 'profile'],
    queryFn: () => apiFetch<ArtisanProfileData>('/api/v1/auth/me'),
    staleTime: 60_000,
  });
}

export interface UpdateArtisanProfilePayload {
  display_name?: string;
  preferred_language?: string;
  phone?: string;
  bio?: string;
  craft_specialties?: string[];
  shipping_address?: string;
}

export function useUpdateArtisanProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateArtisanProfilePayload) =>
      apiFetch<ArtisanProfileData>('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['artisan', 'profile'], data);
      void qc.invalidateQueries({ queryKey: ['artisan', 'profile'] });
    },
  });
}

export interface ShgClusterItem {
  id: string;
  name: string;
  state?: string;
  district?: string;
  leader_name?: string;
}

export function useShgClusters() {
  return useQuery<ShgClusterItem[]>({
    queryKey: ['onboarding', 'clusters'],
    queryFn: () => apiFetch<ShgClusterItem[]>('/api/v1/onboarding/shg/clusters'),
    staleTime: 60_000,
  });
}

export interface JoinShgPayload {
  cluster_id: string;
  craft_id?: string;
  self_declared_experience_years?: number;
  daily_capacity?: number;
}

export function useJoinShg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JoinShgPayload) =>
      apiFetch('/api/v1/onboarding/artisan/join-request', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['artisan', 'profile'] });
    },
  });
}

