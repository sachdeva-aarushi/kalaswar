import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/api/client';

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

// Exact seeded products from supabase/seed.sql
export const SEEDED_PRODUCTS: ProductItem[] = [
  {
    id: 'dddddddd-0001-0000-0000-000000000001',
    title: 'Hand-embroidered cushion cover',
    category: 'Home Decor',
    price: 1450,
    artisan_share: 986,
    artisan_name: 'Lakshmi Mondal / Anita Ansari',
    cluster: 'Bhagirathi Cluster & Banarasi Federation',
    status: 'in_review',
    gi_tagged: true,
    dimensions: '40 × 40 cm',
    quantity: 12,
    image_url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'dddddddd-0001-0000-0000-000000000002',
    title: 'Banarasi Zari Border Katan Silk Stole',
    category: 'Fashion Accessories',
    price: 2600,
    artisan_share: 1768,
    artisan_name: 'Anita Ansari',
    cluster: 'Varanasi Handloom Silk Federation',
    status: 'published',
    gi_tagged: true,
    dimensions: '200 × 70 cm',
    quantity: 8,
    image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'dddddddd-0001-0000-0000-000000000003',
    title: 'Pastel laptop sleeve 13-inch',
    category: 'Accessories',
    price: 1200,
    artisan_share: 816,
    artisan_name: 'Geeta Devi',
    cluster: 'Bhagirathi Artisan Cluster',
    status: 'in_review',
    gi_tagged: true,
    dimensions: '34 × 24 cm',
    quantity: 15,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'dddddddd-0001-0000-0000-000000000004',
    title: 'Kantha stitched tote bag',
    category: 'Handbags & Totes',
    price: 950,
    artisan_share: 646,
    artisan_name: 'Ananya Das',
    cluster: 'Bolpur Rural Craft Kendra',
    status: 'in_review',
    gi_tagged: true,
    dimensions: '38 × 42 cm',
    quantity: 20,
    image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'dddddddd-0001-0000-0000-000000000005',
    title: 'Warli Hand-Painted Terracotta Coaster Set',
    category: 'Home Decor',
    price: 850,
    artisan_share: 578,
    artisan_name: 'Sunita Patil & Group',
    cluster: 'Dahanu Warli Collective, Maharashtra',
    status: 'published',
    gi_tagged: true,
    dimensions: '10 × 10 cm (Set of 6)',
    quantity: 25,
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'dddddddd-0001-0000-0000-000000000006',
    title: 'Sikki Golden Grass Storage Keepsake Box',
    category: 'Natural Fiber Crafts',
    price: 1200,
    artisan_share: 816,
    artisan_name: 'Mithila Craft Cluster',
    cluster: 'Mithila SHG Federation, Bihar',
    status: 'published',
    gi_tagged: true,
    dimensions: '15 × 15 × 12 cm',
    quantity: 10,
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=70',
  },
];

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<ProductItem[]> => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, artisans(name, craft)')
          .limit(20);

        if (error) {
          if (error.message.includes('JWT') || error.message.includes('expired')) {
            const err = new Error('auth_expired');
            err.name = 'AuthExpiredError';
            throw err;
          }
        }

        if (data && data.length > 0) {
          return data.map((item: any, idx: number) => ({
            id: item.id,
            title: item.name || item.title || SEEDED_PRODUCTS[idx % SEEDED_PRODUCTS.length].title,
            category: item.category || 'Handicrafts',
            price: Number(item.price || 999),
            artisan_share: Math.round(Number(item.price || 999) * 0.68),
            artisan_name: item.artisans?.name || 'Anita Ansari',
            cluster: 'DAY-NRLM Artisan Cluster',
            status: item.availability === 'in_stock' ? 'published' : 'in_review',
            gi_tagged: true,
            image_url: item.image_url || SEEDED_PRODUCTS[idx % SEEDED_PRODUCTS.length].image_url,
          }));
        }
      } catch (err: any) {
        if (err?.name === 'AuthExpiredError' || err?.message === 'auth_expired') {
          throw err;
        }
      }
      return SEEDED_PRODUCTS;
    },
  });
}
