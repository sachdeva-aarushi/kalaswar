/**
 * Feature hooks — Digital Product Passport (DPP)
 *
 * Provides typed TanStack Query hooks for public passport resolution,
 * cryptographic on-chain verification, and related product details.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const dppKeys = {
  passport: (token: string) => ["dpp", "passport", token] as const,
  verify: (token: string) => ["dpp", "verify", token] as const,
  product: (productId: string) => ["dpp", "product", productId] as const,
};

export interface DppPassport {
  token: string;
  product_id: string;
  product_title: string;
  craft_category: string;
  maker_display_name: string;
  cluster_name: string;
  gps_region: string;
  wage_split_pct: number;
  merkle_root: string;
  polygon_tx_hash: string | null;
  chain?: string;
  committed_at: string | null;
  is_verified_on_chain: boolean;
  explorer_url: string | null;
  privacy_policy_notice?: string | null;
  // Backward compatibility alias properties
  artisan_name?: string;
  craft_technique?: string;
  wage_share_pct?: number;
  on_chain_verified?: boolean;
}

export interface DppVerification {
  verified: boolean;
  leaf_verified: boolean;
  on_chain_verified: boolean;
  token: string;
  product_id: string;
  leaf_hash: string;
  merkle_root: string;
  polygon_tx_hash: string | null;
  chain: string;
  committed_at: string | null;
  proof_elements_count: number;
  message: string;
}

export interface DppProductDetails {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  image_url?: string;
  cloudinary_public_id?: string;
  availability?: boolean;
  status?: string;
  gi_watermarked?: boolean;
  created_at?: string;
}

export function useDppPassport(token: string) {
  return useQuery({
    queryKey: dppKeys.passport(token),
    queryFn: async () => {
      const res = await apiClient.get<DppPassport>(`/public/passports/${token}`);
      // Fill backwards-compatible aliases
      return {
        ...res,
        artisan_name: res.maker_display_name,
        craft_technique: res.craft_category,
        wage_share_pct: res.wage_split_pct,
        on_chain_verified: res.is_verified_on_chain,
      };
    },
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useDppVerification(token: string) {
  return useQuery({
    queryKey: dppKeys.verify(token),
    queryFn: () => apiClient.get<DppVerification>(`/public/passports/${token}/verify`),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useDppProduct(productId?: string) {
  return useQuery({
    queryKey: dppKeys.product(productId || ""),
    queryFn: () => apiClient.get<DppProductDetails>(`/api/v1/products/${productId}`),
    enabled: Boolean(productId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
