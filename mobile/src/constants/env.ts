interface ExtraConfig {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

let extra: ExtraConfig = {};
try {
  // Dynamic require ensures safety in unit test environments without native modules
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Constants = require('expo-constants');
  extra = (Constants?.default?.expoConfig?.extra ?? Constants?.expoConfig?.extra ?? {}) as ExtraConfig;
} catch {
  extra = {};
}

export const ENV = {
  API_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    extra.apiUrl ||
    'http://localhost:8000',
  SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    'https://hptiiyicxqgdtucxswal.supabase.co',
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    'sb_publishable_u_51_fQEMUj1UTns_ENCrA_ws-KlyWA',
};

export function getApiBaseUrl(): string {
  return ENV.API_URL;
}

export function getSupabaseConfig() {
  return {
    url: ENV.SUPABASE_URL,
    anonKey: ENV.SUPABASE_ANON_KEY,
  };
}
