/**
 * Typed HTTP client for the Kalaswar FastAPI backend.
 *
 * Usage:
 *   import { apiClient } from "@/lib/api/client";
 *   const health = await apiClient.get("/api/v1/health");
 *
 * The base URL is read from VITE_API_BASE_URL (defaults to http://localhost:8000).
 * The Supabase session JWT is forwarded automatically as a Bearer token if
 * the client-side supabase instance has an active session.
 */

import { supabase } from "@/integrations/supabase/client";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_API_BASE_URL"]) ||
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly requestId?: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // not signed in — return no auth header
  }
  return {};
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  extraHeaders?: HeadersInit,
): Promise<T> {
  const authHeader = await getAuthHeader();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeader as Record<string, string>),
    ...(extraHeaders as Record<string, string>),
  };

  const init: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);

  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = (await res.json()) as { detail?: string; message?: string };
      detail = json.detail ?? json.message ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, detail, requestId);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, headers?: HeadersInit) =>
    request<T>("GET", path, undefined, headers),
  post: <T>(path: string, body?: unknown, headers?: HeadersInit) =>
    request<T>("POST", path, body, headers),
  put: <T>(path: string, body?: unknown, headers?: HeadersInit) =>
    request<T>("PUT", path, body, headers),
  patch: <T>(path: string, body?: unknown, headers?: HeadersInit) =>
    request<T>("PATCH", path, body, headers),
  delete: <T>(path: string, headers?: HeadersInit) =>
    request<T>("DELETE", path, undefined, headers),
};
