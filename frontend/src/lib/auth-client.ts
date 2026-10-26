import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

/**
 * Returns the signed-in user (revalidated with the Auth server) plus their
 * platform role. Null when signed out. Client-side only.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return null;
  let role: string | null = null;
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);
    role = roles?.[0]?.role ?? null;
  } catch {
    role = null;
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
