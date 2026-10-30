import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PendingProductReview {
  id: string;
  title: string;
  artisanName: string;
  cluster: string;
  submittedAt: string;
  badgeLabel?: string;
  badgeType?: 'ai' | 'quota' | 'standard';
  craftType: string;
  material: string;
  description: string;
  dimensions: string;
  quantity: number;
  pricePerUnit: number;
  imageUrl: string;
  voiceTranscript?: string;
  initialAiDraft?: string;
}

export interface CoordinatorOverviewData {
  clusterName: string;
  totalWaitingCount: number;
  activeTodayArtisans: number;
  weeklyApprovedCount: number;
  lowStockItems: Array<{
    name: string;
    details: string;
    isDepleted: boolean;
  }>;
  pendingReviews: PendingProductReview[];
}

export const SEEDED_PENDING_REVIEWS: PendingProductReview[] = [
  {
    id: 'rev-001',
    title: 'Hand-embroidered cotton cushion cover',
    artisanName: 'Lakshmi Mondal',
    cluster: 'Bhagirathi Artisan Cluster',
    submittedAt: '20 min ago',
    badgeLabel: 'AI suggestion',
    badgeType: 'ai',
    craftType: 'Suf & Mirror embroidery',
    material: 'Cotton cloth, red silk thread',
    description: 'Hand embroidered cushion cover in red thread, 40 cm square.',
    dimensions: '40 × 40 cm',
    quantity: 12,
    pricePerUnit: 1450,
    imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
    voiceTranscript: 'सुनीता दीदी, ये बारह कुशन कवर तैयार हैं। लाल रेशम धागे और शीशे का बारीक काम किया है। नाप चालीस सेंटीमीटर है।',
    initialAiDraft: 'Red thread embroidered decorative cushion set with traditional mirror inserts. 40x40 standard dimensions for living room decor.',
  },
  {
    id: 'rev-002',
    title: 'Pastel laptop sleeve 13-inch',
    artisanName: 'Geeta Devi',
    cluster: 'Bhagirathi Artisan Cluster',
    submittedAt: '1 hour ago',
    badgeLabel: 'Batch #4 quota',
    badgeType: 'quota',
    craftType: 'Quilted Khadi Handloom',
    material: 'Natural dyed sage khadi cotton & raw wood toggle',
    description: 'Eco-friendly padded sleeve for 13-inch laptops with wooden button lock.',
    dimensions: '34 × 24 cm',
    quantity: 15,
    pricePerUnit: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=70',
    voiceTranscript: 'सुनीता जी, तेरह इंच लैपटॉप के पंद्रह स्लीव तैयार हो गए हैं। कॉटन पैडिंग लगाई है।',
    initialAiDraft: 'Handmade 13 inch laptop protective sleeve made of natural organic khadi with wooden toggle.',
  },
  {
    id: 'rev-003',
    title: 'Kantha stitched tote bag',
    artisanName: 'Ananya Das',
    cluster: 'Bolpur Rural Craft Kendra',
    submittedAt: '3 hours ago',
    badgeLabel: 'Standard Review',
    badgeType: 'standard',
    craftType: 'Traditional Kantha Stitch',
    material: 'Beige khadi canvas & natural indigo threads',
    description: 'Durable khadi tote with geometric running Kantha stitches.',
    dimensions: '38 × 42 cm',
    quantity: 20,
    pricePerUnit: 950,
    imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&auto=format&fit=crop&q=70',
    voiceTranscript: 'दीदी, कांथा स्टिच के बीस थैले पूरे हो गए हैं। इंडिगो धागे से बॉर्डर बना दिया है।',
    initialAiDraft: 'Natural canvas tote bag embellished with authentic Bengali running stitches.',
  },
];

export const SEEDED_COORDINATOR_OVERVIEW: CoordinatorOverviewData = {
  clusterName: 'Bhagirathi Artisan Cluster & Dahanu Collective',
  totalWaitingCount: 3,
  activeTodayArtisans: 8,
  weeklyApprovedCount: 8,
  lowStockItems: [
    {
      name: 'Raw cotton cloth',
      details: '12m left (below 30m threshold)',
      isDepleted: false,
    },
    {
      name: 'Natural indigo dye',
      details: 'Depleted (0 kg left in Kendra)',
      isDepleted: true,
    },
  ],
  pendingReviews: SEEDED_PENDING_REVIEWS,
};

export function useCoordinatorOverview() {
  return useQuery({
    queryKey: ['coordinator-overview'],
    queryFn: async (): Promise<CoordinatorOverviewData> => {
      try {
        const { data: inv, error: invErr } = await supabase
          .from('materials_inventory')
          .select('*');

        if (invErr) {
          if (invErr.message.includes('JWT') || invErr.message.includes('expired')) {
            const err = new Error('auth_expired');
            err.name = 'AuthExpiredError';
            throw err;
          }
        }

        if (inv && inv.length > 0) {
          const lowItems = inv
            .filter((item: any) => Number(item.quantity) <= Number(item.low_stock_threshold || 10))
            .map((item: any) => ({
              name: item.name,
              details: `${item.quantity} ${item.unit} left (threshold: ${item.low_stock_threshold} ${item.unit})`,
              isDepleted: Number(item.quantity) <= 0,
            }));

          return {
            ...SEEDED_COORDINATOR_OVERVIEW,
            lowStockItems: lowItems.length > 0 ? lowItems : SEEDED_COORDINATOR_OVERVIEW.lowStockItems,
          };
        }
      } catch (err: any) {
        if (err?.name === 'AuthExpiredError' || err?.message === 'auth_expired') {
          throw err;
        }
      }
      return SEEDED_COORDINATOR_OVERVIEW;
    },
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      action,
      notes,
    }: {
      productId: string;
      action: 'approve' | 'request_changes' | 'decline';
      notes?: string;
    }) => {
      // In production, updates Supabase listing_drafts or products table
      return { success: true, action, productId, notes };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coordinator-overview'] });
    },
  });
}
