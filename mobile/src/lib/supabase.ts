import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/constants/env';
import { ExpoSecureStoreAdapter } from './secure-store';

const { url, anonKey } = getSupabaseConfig();

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

