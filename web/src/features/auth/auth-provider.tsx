/**
 * AuthProvider — Supabase Authentication Context
 *
 * Implements session management, persistence, sign in, sign up, sign out,
 * session refresh, and role resolution from Supabase profiles & user_roles.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type SessionUser } from "@/lib/auth-client";

export type KwRole = "coordinator" | "artisan" | "buyer" | "customer";

export interface AuthContextType {
  user: SessionUser | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<{
    user: SessionUser | null;
    role: KwRole | null;
    error: Error | null;
  }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    language?: string;
    accountType?: "customer" | "buyer";
    orgName?: string;
  }) => Promise<{
    user: SessionUser | null;
    session: Session | null;
    awaitingConfirm: boolean;
    error: Error | null;
  }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Determines highest priority role based on defined hierarchy:
 * coordinator > artisan > buyer > customer
 */
export function determineHighestPriorityRole(
  roles: string[] = [],
  metadataRole?: string | null
): KwRole {
  if (roles.includes("coordinator")) return "coordinator";
  if (roles.includes("artisan")) return "artisan";
  if (roles.includes("buyer")) return "buyer";
  if (roles.includes("customer")) return "customer";

  if (metadataRole && ["coordinator", "artisan", "buyer", "customer"].includes(metadataRole)) {
    return metadataRole as KwRole;
  }

  return "customer";
}

/**
 * Resolves user role with precedence:
 * coordinator > artisan > buyer > customer
 */
export async function resolveUserRole(userId: string, metadataRole?: string | null): Promise<KwRole> {
  try {
    // 1. Check user_roles table
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roles && roles.length > 0) {
      const roleList = roles.map((r) => r.role as string);
      return determineHighestPriorityRole(roleList, metadataRole);
    }

    // 2. Check profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profile && (profile as Record<string, unknown>)["role"]) {
      return determineHighestPriorityRole(
        [(profile as Record<string, unknown>)["role"] as string],
        metadataRole
      );
    }
  } catch {
    // fallback to metadata
  }

  // 3. Fallback to user metadata
  return determineHighestPriorityRole([], metadataRole);
}

/**
 * Maps a role to its landing destination per specification:
 * - artisan -> /workroom/artisan
 * - coordinator -> /workroom
 * - buyer -> /shop
 * - customer -> /shop
 */
export function getRedirectForRole(role: string | null | undefined): string {
  switch (role) {
    case "artisan":
      return "/workroom/artisan";
    case "coordinator":
      return "/workroom";
    case "buyer":
      return "/shop";
    case "customer":
    default:
      return "/shop";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessionAndUser = async (currentSession: Session | null) => {
    if (!currentSession || !currentSession.user) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setSession(currentSession);
    const u: User = currentSession.user;
    const metaRole = (u.user_metadata?.["role"] || u.user_metadata?.["account_type"]) as string | undefined;
    const role = await resolveUserRole(u.id, metaRole);
    const name = (u.user_metadata?.["full_name"] as string | undefined) ?? null;

    setUser({
      id: u.id,
      email: u.email ?? "",
      name,
      role,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    // Initial session retrieval
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        void fetchSessionAndUser(initialSession);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (isMounted) {
        await fetchSessionAndUser(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextType["signIn"] = async ({ email, password }) => {
    setIsLoading(true);
    const targetEmail: string = email.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error || !data.user) {
      setIsLoading(false);
      return { user: null, role: null, error: error as Error };
    }

    const metaRole = (data.user.user_metadata?.["role"] || data.user.user_metadata?.["account_type"]) as string | undefined;
    const role = await resolveUserRole(data.user.id, metaRole);
    const name = (data.user.user_metadata?.["full_name"] as string | undefined) ?? null;

    const sessionUser: SessionUser = {
      id: data.user.id,
      email: data.user.email ?? email,
      name,
      role,
    };

    setSession(data.session);
    setUser(sessionUser);
    setIsLoading(false);

    return { user: sessionUser, role, error: null };
  };

  const signUp: AuthContextType["signUp"] = async ({
    email,
    password,
    fullName,
    language = "en",
    accountType = "customer",
    orgName,
  }) => {
    setIsLoading(true);
    try {
      const optionsObj: {
        emailRedirectTo?: string;
        data: {
          full_name: string;
          preferred_language: string;
          account_type: "customer" | "buyer";
          org_name?: string;
        };
      } = {
        data: {
          full_name: fullName,
          preferred_language: language,
          account_type: accountType,
          ...(orgName ? { org_name: orgName } : {}),
        },
      };

      if (typeof window !== "undefined") {
        optionsObj.emailRedirectTo = window.location.origin;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: optionsObj,
      });

      if (error) {
        setIsLoading(false);
        return { user: null, session: null, awaitingConfirm: false, error: error as Error };
      }

      if (!data.session) {
        setIsLoading(false);
        return { user: null, session: null, awaitingConfirm: true, error: null };
      }

      // Upsert profile and user_roles if session established
      const uid = data.user!.id;
      await supabase.from("profiles").upsert({
        id: uid,
        display_name: fullName,
        preferred_language: language,
        onboarding_status: "completed",
      });

      await supabase.from("user_roles").upsert({
        user_id: uid,
        role: accountType,
      });

      const sessionUser: SessionUser = {
        id: uid,
        email: data.user!.email ?? email,
        name: fullName,
        role: accountType,
      };

      setSession(data.session);
      setUser(sessionUser);
      setIsLoading(false);

      return { user: sessionUser, session: data.session, awaitingConfirm: false, error: null };
    } catch (err) {
      setIsLoading(false);
      return { user: null, session: null, awaitingConfirm: false, error: err as Error };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsLoading(false);
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      await fetchSessionAndUser(data.session);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
