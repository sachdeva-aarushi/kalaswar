/**
 * Role guards for TanStack Router.
 *
 * Usage in a route's `beforeLoad`:
 *   import { requireRole } from "@/lib/guards";
 *   beforeLoad: async () => requireRole("coordinator")
 *
 * SSR & Client-Side Resilience:
 * - On SSR (server): No-op return to allow client to receive shell and hydrate
 *   session from localStorage.
 * - On Client (browser):
 *   - If unauthenticated: redirects to /auth (with ?redirect= param)
 *   - If unauthorized (wrong role): throws 403 Forbidden to render clear "No Access" UI
 */

import { redirect } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth-client";

export type KwRole =
  | "admin"
  | "coordinator"
  | "artisan"
  | "customer"
  | "buyer";

/** Allowed roles per route group */
export const ROUTE_ROLES: Record<string, KwRole[]> = {
  "/workroom": ["admin", "coordinator", "artisan"],
  "/shop": [],       // public
  "/gift": [],       // public
  "/passport": [],   // public
};

/**
 * Throw a redirect to /auth if the user is not signed in or does not have
 * one of the required roles. Pass an empty `roles` array to require auth but
 * skip role check.
 */
export async function requireAuth(
  redirectTo?: string,
): Promise<void> {
  // On SSR, let the page hydrate so client can read localStorage
  if (typeof window === "undefined") return;

  const user = await getSessionUser();
  if (!user) {
    throw redirect({
      to: "/auth",
      search: {
        redirect: redirectTo ?? undefined,
      },
    });
  }
}

export async function requireRole(
  ...roles: KwRole[]
): Promise<void> {
  // On SSR, let the page hydrate so client can read localStorage
  if (typeof window === "undefined") return;

  const user = await getSessionUser();
  if (!user) {
    throw redirect({
      to: "/auth",
      search: {
        redirect:
          typeof window !== "undefined" && window.location.pathname && window.location.pathname !== "/auth"
            ? window.location.pathname
            : undefined,
      },
    });
  }
  if (roles.length > 0 && !roles.includes(user.role as KwRole)) {
    if (user.role === "admin") return;
    // Signed in but wrong role — show clear "no access" state (403 Forbidden)
    const err = new Error("403 Forbidden: You do not have permission to access this area.");
    Object.assign(err, { status: 403 });
    throw err;
  }
}

/** Guard that allows access only in demo mode (no real role required). */
export async function allowPublic(): Promise<void> {
  // No-op: public routes always pass.
}
