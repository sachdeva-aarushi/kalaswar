import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type AppRole = 'coordinator' | 'artisan' | 'shopper';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  phone?: string | null;
}

export interface DemoAccount {
  id: string;
  role: AppRole;
  name: string;
  email: string;
  title: string;
  cluster: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'coordinator-sunita',
    role: 'coordinator',
    name: 'Sunita Patil',
    email: 'coordinator.sunita@kalaswar.demo',
    title: 'SHG Cluster Coordinator',
    cluster: 'Dahanu Warli Collective',
  },
  {
    id: 'artisan-anita',
    role: 'artisan',
    name: 'Anita Devi',
    email: 'artisan.anita@kalaswar.demo',
    title: 'Master Banarasi Handloom Weaver',
    cluster: 'Varanasi Weaving Federation',
  },
  {
    id: 'shopper-priya',
    role: 'shopper',
    name: 'Priya Sharma',
    email: 'customer.priya@kalaswar.demo',
    title: 'Retail & Corporate Shopper',
    cluster: 'Kalaswar Direct Storefront',
  },
];

export const DEMO_PASSWORD = 'KalaswarDemo@2025';

const DEMO_EMAIL_ALIASES: Record<string, string> = {
  'admin@kalaswar.demo': 'admin.kalaswar@gmail.com',
  'coordinator.sunita@kalaswar.demo': 'coordinator.sunita@gmail.com',
  'artisan.anita@kalaswar.demo': 'artisan.anita@gmail.com',
  'customer.priya@kalaswar.demo': 'customer.priya@gmail.com',
  'buyer.fabindia@kalaswar.demo': 'buyer.fabindia@gmail.com',
  'financier.sbi@kalaswar.demo': 'financier.sbi@gmail.com',
};

/**
 * Normalizes DB role to one of the 3 active mobile role layouts
 */
export function normalizeAppRole(rawRole?: string | null): AppRole {
  if (!rawRole) return 'shopper';
  const lower = rawRole.toLowerCase();
  if (lower.includes('coord') || lower.includes('admin')) {
    return 'coordinator';
  }
  if (lower.includes('artisan') || lower.includes('weaver')) {
    return 'artisan';
  }
  return 'shopper';
}

/**
 * Resolves user role from user_roles, profiles, or metadata
 */
export async function resolveUserRoleFromDb(userId: string, metadataRole?: string | null): Promise<AppRole> {
  try {
    // 1. Check user_roles table
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roles && roles.length > 0) {
      const firstRole = roles[0]?.role as string | undefined;
      if (firstRole) return normalizeAppRole(firstRole);
    }

    // 2. Check profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile && (profile as Record<string, unknown>)['role']) {
      return normalizeAppRole((profile as Record<string, unknown>)['role'] as string);
    }
  } catch {
    // Ignore and fallback
  }

  return normalizeAppRole(metadataRole);
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  role: AppRole;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signInAsDemo: (demo: DemoAccount) => Promise<{ success: boolean; error?: string }>;
  switchRole: (newRole: AppRole) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole>('coordinator');
  const [isLoading, setIsLoading] = useState(true);

  const syncUserState = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setSession(currentSession);
    const u: User = currentSession.user;
    const metaRole = (u.user_metadata?.role || u.user_metadata?.account_type) as string | undefined;
    const resolvedRole = await resolveUserRoleFromDb(u.id, metaRole);
    const fullName = (u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0]) ?? 'Kalaswar User';

    setRole(resolvedRole);
    setUser({
      id: u.id,
      email: u.email ?? '',
      name: fullName,
      role: resolvedRole,
      phone: u.phone,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        void syncUserState(initialSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        await syncUserState(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserState]);

  const signIn = async (email: string, password = DEMO_PASSWORD): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const resolvedEmail = DEMO_EMAIL_ALIASES[email.trim().toLowerCase()] || email.trim();

    // 1. Try with the given/aliased email
    let { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    // 2. If alias failed, retry with raw input email
    if (error && resolvedEmail !== email.trim()) {
      const retryResult = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      // Local fallback mock login for demo users in case remote Supabase is unreachable/paused
      const matchedDemo = DEMO_ACCOUNTS.find(
        (d) => d.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (matchedDemo && password === DEMO_PASSWORD) {
        setRole(matchedDemo.role);
        setUser({
          id: `demo-${matchedDemo.role}`,
          email: matchedDemo.email,
          name: matchedDemo.name,
          role: matchedDemo.role,
        });
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: error.message };
    }

    if (data.session) {
      await syncUserState(data.session);
    }
    setIsLoading(false);
    return { success: true };
  };

  const signInAsDemo = async (demo: DemoAccount): Promise<{ success: boolean; error?: string }> => {
    return signIn(demo.email, DEMO_PASSWORD);
  };

  const switchRole = (newRole: AppRole) => {
    setRole(newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setSession(null);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        signIn,
        signInAsDemo,
        switchRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

