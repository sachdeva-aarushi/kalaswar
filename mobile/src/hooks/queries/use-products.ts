import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

export interface ProductItem {
  id: string;
  title: string;
  category: string;
  price: number;
  artisan_share: number;
  artisan_name: string;
  cluster: string;
  status: 'draft' | 'published' | 'in_review';
  gi_tagged: boolean;
  image_url: string;
  dimensions?: string;
  quantity?: number;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<ProductItem[]> => {
      try {
        const data = await apiFetch<{ items: any[] }>('/api/v1/products?page_size=30');
        if (data && data.items) {
          return data.items.map((item: any) => ({
            id: item.id,
            title: item.title || item.name || 'Untitled Craft',
            category: item.category || 'Handicrafts',
            price: Number(item.price || 0),
            artisan_share: Math.round(Number(item.price || 0) * 0.68),
            artisan_name: item.artisan_name || 'Artisan Partner',
            cluster: 'DAY-NRLM Artisan Cluster',
            status: item.status === 'published' ? 'published' : 'in_review',
            gi_tagged: Boolean(item.gi_watermarked),
            image_url: item.image_url || '',
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch real products from API:', err);
      }
      return [];
    },
  });
}

export interface CreateProductPayload {
  artisan_id: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  image_url?: string;
  cloudinary_public_id?: string;
  materials?: string;
  dimensions?: string;
  production_lead_time_days?: number;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      apiFetch('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export interface ProductAiDraftPayload {
  text_description: string;
  materials?: string[];
  estimated_hours?: number;
  language?: string;
}

export interface ProductAiDraftResponse {
  title: string;
  description: string;
  category: string;
  materials: string[];
  estimated_hours: number;
  tags: string[];
  suggested_price: number;
}

export function useProductAiDraft() {
  return useMutation({
    mutationFn: (payload: ProductAiDraftPayload) =>
      apiFetch<ProductAiDraftResponse>('/api/v1/products/ai-draft', {
        method: 'POST',
        body: JSON.stringify({
          description: payload.text_description,
          materials: payload.materials,
          estimated_hours: payload.estimated_hours,
          language: payload.language || 'hi',
        }),
      }),
  });
}

export function useProductAiDraftVoice() {
  return useMutation({
    mutationFn: async ({ uri, language = 'hi' }: { uri: string; language?: string }) => {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'voice_recording.m4a',
        type: 'audio/m4a',
      } as any);
      formData.append('language', language);

      return apiFetch<ProductAiDraftResponse>('/api/v1/products/ai-draft-voice', {
        method: 'POST',
        body: formData,
      });
    },
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      return apiFetch<{
        url: string;
        secure_url?: string;
        public_id: string;
        format: string;
        bytes: number;
      }>('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      });
    },
  });
}
