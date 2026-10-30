import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { getApiBaseUrl } from '@/constants/env';
import { supabase } from '@/lib/supabase';

export const apiClient = createClient<paths>({
  baseUrl: getApiBaseUrl(),
});

// Middleware to inject bearer token from active Supabase session
apiClient.use({
  async onRequest({ request }) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Continue without auth header if session retrieval fails
    }
    return request;
  },
});

export type ApiPaths = paths;
export default apiClient;

