/**
 * Feature hooks — Digital Product Passport (DPP)
 *
 * src/features/dpp/hooks.ts
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const dppKeys = {
  passport: (productId: string) => ["dpp", "passport", productId] as const,
};

export interface DppPassport {
  product_id: string;
  artisan_name?: string;
  artisan_photo_url?: string;
  cluster_name?: string;
  cluster_state?: string;
  gps_lat?: number;
  gps_lng?: number;
  craft_technique?: string;
  wage_share_pct?: number;
  merkle_root?: string;
  polygon_tx_hash?: string;
  on_chain_verified: boolean;
  qr_url?: string;
  created_at?: string;
}

export function useDppPassport(productId: string) {
  return useQuery({
    queryKey: dppKeys.passport(productId),
    queryFn: () => apiClient.get<DppPassport>(`/api/v1/dpp/passport/${productId}`),
    enabled: Boolean(productId),
    staleTime: 5 * 60_000,
  });
}
