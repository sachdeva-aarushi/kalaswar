import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("supabase.auth.token") || key.includes("auth-token") || key.startsWith("sb-"))) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const u = parsed?.user ?? parsed?.session?.user ?? parsed?.currentSession?.user;
          if (u?.id) {
            const role = (u.user_metadata?.role as string | undefined) ?? null;
            const name = (u.user_metadata?.full_name as string | undefined) ?? null;
            return { id: u.id, email: u.email ?? "", name, role };
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Returns the signed-in user plus their platform role.
 * Reads local session storage immediately, with fallback to getUser().
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let user: any = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    user = sessionData?.session?.user;
  } catch {
    user = null;
  }

  if (!user) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user;
    } catch {
      user = null;
    }
  }

  if (!user) {
    const stored = getStoredUser();
    if (stored) return stored;
    return null;
  }

  let role: string | null = null;
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roles && roles.length > 0) {
      const roleNames = roles.map((r) => r.role);
      if (roleNames.includes("admin")) role = "admin";
      else if (roleNames.includes("coordinator")) role = "coordinator";
      else if (roleNames.includes("artisan")) role = "artisan";
      else if (roleNames.includes("buyer")) role = "buyer";
      else role = roleNames[0];
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (profile as any)?.role ?? (user.user_metadata?.['role'] as string | undefined) ?? null;
    }
  } catch {
    role = (user.user_metadata?.['role'] as string | undefined) ?? null;
  }

  // If role still not found, check email alias for demo users
  if (!role && user.email) {
    if (user.email.includes("coordinator")) role = "coordinator";
    else if (user.email.includes("artisan")) role = "artisan";
    else if (user.email.includes("admin")) role = "admin";
    else if (user.email.includes("buyer")) role = "buyer";
  }

  const name = (user.user_metadata?.['full_name'] as string | undefined) ?? null;
  return { id: user.id, email: user.email ?? "", name, role };
}

/** Ordered sign-out: stop queries, clear cache, end session, leave cleanly. */
export async function performSignOut(
  queryClient: QueryClient,
  navigate: (opts: { to: string; replace?: boolean }) => Promise<unknown>,
): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
  await navigate({ to: "/auth", replace: true });
}
