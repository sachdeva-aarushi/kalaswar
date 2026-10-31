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
 *
 * Resilience & Guardrails:
 * - 15-second AbortController timeout on every API call
 * - 401 Unauthorized: Clears active session and redirects to /auth
 * - 403 Forbidden: Surfaces clear structured error details
 * - Network / timeout errors: Surfaces structured ApiError (status 0 or 408)
 */

import { supabase } from "@/integrations/supabase/client";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_API_BASE_URL"]) ||
  "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 15_000;

export interface RequestOptions {
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ApiError extends Error {
  public readonly isTimeout: boolean;
  public readonly isUnauthorized: boolean;
  public readonly isForbidden: boolean;
  public readonly isNetworkError: boolean;

  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly requestId?: string,
  ) {
    super(detail);
    this.name = "ApiError";
    this.isTimeout = status === 408;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isNetworkError = status === 0;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("supabase.auth.token") ||
          key.includes("auth-token") ||
          key.startsWith("sb-"))
      ) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const token =
            parsed?.access_token ??
            parsed?.session?.access_token ??
            parsed?.currentSession?.access_token;
          if (token && typeof token === "string") return token;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 1_500),
    );
    const { data } = await Promise.race([sessionPromise, timeoutPromise]);
    let token = data?.session?.access_token;
    if (!token) token = getStoredToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    const token = getStoredToken();
    if (token) return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function normalizeOptions(headersOrOptions?: HeadersInit | RequestOptions): RequestOptions {
  if (!headersOrOptions) return {};
  if (
    "headers" in headersOrOptions ||
    "signal" in headersOrOptions ||
    "timeoutMs" in headersOrOptions
  ) {
    return headersOrOptions as RequestOptions;
  }
  return { headers: headersOrOptions as HeadersInit };
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  headersOrOptions?: HeadersInit | RequestOptions,
): Promise<T> {
  const options = normalizeOptions(headersOrOptions);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`Request timed out after ${timeoutMs / 1000} seconds`));
  }, timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener("abort", () => {
        controller.abort(options.signal?.reason);
      });
    }
  }

  try {
    const authHeader = await getAuthHeader();
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(authHeader as Record<string, string>),
      ...((options.headers as Record<string, string>) || {}),
    };

    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };
    if (body !== undefined) {
      init.body = isFormData ? body : JSON.stringify(body);
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

      // Requirement: On 401, clear the session and redirect to login
      if (res.status === 401) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore signout errors
        }
        if (
          typeof window !== "undefined" &&
          window.location?.pathname &&
          window.location.pathname !== "/auth" &&
          process.env.NODE_ENV !== "test"
        ) {
          const redirectTarget = window.location.pathname + window.location.search;
          window.location.href = `/auth?redirect=${encodeURIComponent(redirectTarget)}`;
        }
      }

      throw new ApiError(res.status, detail, requestId);
    }

    // 204 No Content
    if (res.status === 204) return undefined as unknown as T;

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (timedOut || (err instanceof Error && err.name === "AbortError" && timedOut)) {
      throw new ApiError(408, `Request timed out after ${timeoutMs / 1000} seconds`);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors or user-initiated aborts
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(0, message);
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: HeadersInit | RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: HeadersInit | RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: HeadersInit | RequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: HeadersInit | RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: HeadersInit | RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};
