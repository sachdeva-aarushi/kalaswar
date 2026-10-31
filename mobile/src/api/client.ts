import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { getApiBaseUrl } from '@/constants/env';
import { supabase } from '@/lib/supabase';

export const apiClient = createClient<paths>({
  baseUrl: getApiBaseUrl(),
});

// Middleware to inject bearer token from active Supabase session
apiClient.use({
  async onRequest({ request }) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Continue without auth header if session retrieval fails
    }
    return request;
  },
});

export type ApiPaths = paths;

export async function apiFetch<T = any>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson.detail || errJson.message || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export default apiClient;

