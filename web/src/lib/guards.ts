/**
 * Role guards for TanStack Router.
 *
 * Usage in a route's `beforeLoad`:
 *   import { requireRole } from "@/lib/guards";
 *   beforeLoad: async () => requireRole("coordinator")
 *
 * When the user is unauthenticated or lacks the required role they are
 * redirected to /auth (with a ?redirect= param so they return after sign-in).
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
    // Signed in but wrong role — redirect to root
    throw redirect({ to: "/" });
  }
}

/** Guard that allows access only in demo mode (no real role required). */
export async function allowPublic(): Promise<void> {
  // No-op: public routes always pass.
}
