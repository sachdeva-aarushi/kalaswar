import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/api/client';
import { getApiBaseUrl } from '@/constants/env';

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
  riskFlags?: Array<{
    id: string;
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  recentActivity?: Array<{
    timestamp: string;
    title: string;
    description: string;
  }>;
}

export interface ProductionAssignment {
  id: string;
  orderId: string;
  orderNumber: string;
  artisanId: string;
  artisanName: string;
  targetUnits: number;
  completedUnits: number;
  wagePerUnit: number;
  dueDate: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'delayed';
  notes?: string;
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

export const SEEDED_ASSIGNMENTS: ProductionAssignment[] = [
  {
    id: 'asg-001',
    orderId: 'ord-101',
    orderNumber: 'KW-ORD-9012',
    artisanId: 'art-001',
    artisanName: 'Anita Devi (Master Weaver)',
    targetUnits: 50,
    completedUnits: 18,
    wagePerUnit: 850,
    dueDate: '2026-11-15',
    status: 'in_progress',
    notes: 'Banarasi silk warp mounted on loom #4',
  },
  {
    id: 'asg-002',
    orderId: 'ord-102',
    orderNumber: 'KW-ORD-9013',
    artisanId: 'art-002',
    artisanName: 'Lakshmi Mondal (Embroidery)',
    targetUnits: 12,
    completedUnits: 4,
    wagePerUnit: 350,
    dueDate: '2026-11-20',
    status: 'in_progress',
    notes: 'Suf mirror embroidery with red silk yarn',
  },
  {
    id: 'asg-003',
    orderId: 'ord-103',
    orderNumber: 'KW-ORD-9014',
    artisanId: 'art-003',
    artisanName: 'Geeta Devi (Khadi Quilting)',
    targetUnits: 15,
    completedUnits: 15,
    wagePerUnit: 420,
    dueDate: '2026-11-01',
    status: 'completed',
    notes: '15 laptop sleeves ready for quality check & dispatch',
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
      details: '4 meters remaining at Kendra Shed A (Threshold: 10m)',
      isDepleted: false,
    },
    {
      name: 'Indigo natural dye',
      details: 'Completely depleted · Emergency reorder initiated',
      isDepleted: true,
    },
  ],
  pendingReviews: SEEDED_PENDING_REVIEWS,
  riskFlags: [
    {
      id: 'risk-1',
      title: 'Indigo natural dye depleted',
      message: 'Zero stock at Kendra Shed B. Kantha tote production delayed.',
      severity: 'critical',
    },
    {
      id: 'risk-2',
      title: 'Loom #4 production pacing',
      message: 'Silk zari stole assignment is 2 days behind schedule for FabIndia delivery.',
      severity: 'warning',
    },
  ],
  recentActivity: [
    {
      timestamp: '10 min ago',
      title: 'Geeta Devi completed batch #4',
      description: '15 laptop sleeves moved to ready for dispatch queue.',
    },
    {
      timestamp: '1 hour ago',
      title: 'Quality check passed',
      description: 'Order KW-ORD-9014 Sikki grass hampers cleared inspection.',
    },
  ],
};

let inMemoryReviews = [...SEEDED_PENDING_REVIEWS];
let inMemoryAssignments = [...SEEDED_ASSIGNMENTS];

/**
 * Coordinator Overview hook wired to /api/v1/dashboard/coordinator with fallback
 */
export function useCoordinatorOverview() {
  return useQuery({
    queryKey: ['coordinator-overview'],
    queryFn: async (): Promise<CoordinatorOverviewData> => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/dashboard/coordinator`);
        if (res.ok) {
          const dash = await res.json();
          return {
            clusterName: dash.cluster_name || SEEDED_COORDINATOR_OVERVIEW.clusterName,
            totalWaitingCount: inMemoryReviews.length,
            activeTodayArtisans: dash.counts?.active_artisans ?? 8,
            weeklyApprovedCount: dash.counts?.ready_for_dispatch ?? 8,
            lowStockItems: SEEDED_COORDINATOR_OVERVIEW.lowStockItems,
            pendingReviews: inMemoryReviews,
            riskFlags: dash.risk_flags?.map((rf: any) => ({
              id: rf.flag_id || rf.id,
              title: rf.title,
              message: rf.message,
              severity: rf.severity || 'warning',
            })) || SEEDED_COORDINATOR_OVERVIEW.riskFlags,
            recentActivity: dash.recent_activity || SEEDED_COORDINATOR_OVERVIEW.recentActivity,
          };
        }
      } catch (err) {
        console.warn('Backend dashboard query failed, using seeded overview:', err);
      }

      return {
        ...SEEDED_COORDINATOR_OVERVIEW,
        totalWaitingCount: inMemoryReviews.length,
        pendingReviews: inMemoryReviews,
      };
    },
  });
}

/**
 * Production Assignments hook wired to /api/v1/assignments
 */
export function useAssignments() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: async (): Promise<ProductionAssignment[]> => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/assignments`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map((a: any) => ({
              id: a.id || `asg-${Math.random().toString(36).substring(2, 6)}`,
              orderId: a.order_id || 'ord-101',
              orderNumber: a.order_number || 'KW-ORD-9012',
              artisanId: a.artisan_id || 'art-001',
              artisanName: a.artisan_name || 'Anita Devi',
              targetUnits: a.target_units || a.units || 10,
              completedUnits: a.completed_units || 0,
              wagePerUnit: a.wage_per_unit || 350,
              dueDate: a.due_date || '2026-11-20',
              status: a.status || 'in_progress',
              notes: a.notes,
            }));
          }
        }
      } catch (err) {
        console.warn('Assignments fetch fallback:', err);
      }
      return inMemoryAssignments;
    },
  });
}

/**
 * Create Assignment Mutation
 */
export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      orderId: string;
      orderNumber: string;
      artisanName: string;
      targetUnits: number;
      wagePerUnit: number;
      dueDate: string;
      notes?: string;
    }) => {
      const newAssignment: ProductionAssignment = {
        id: `asg-${Date.now()}`,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        artisanId: `art-${Math.random().toString(36).substring(2, 6)}`,
        artisanName: payload.artisanName,
        targetUnits: payload.targetUnits,
        completedUnits: 0,
        wagePerUnit: payload.wagePerUnit,
        dueDate: payload.dueDate,
        status: 'assigned',
        notes: payload.notes,
      };

      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/v1/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: payload.orderId,
            artisan_name: payload.artisanName,
            units: payload.targetUnits,
            wage_per_unit: payload.wagePerUnit,
            due_date: payload.dueDate,
            notes: payload.notes,
          }),
        });
      } catch {
        // Optimistic in-memory update
      }

      inMemoryAssignments = [newAssignment, ...inMemoryAssignments];
      return newAssignment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['coordinator-overview'] });
    },
  });
}

/**
 * Approve / Review Product Mutation
 */
export function useApproveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      action = 'approve',
      notes,
      approved,
    }: {
      productId: string;
      action?: 'approve' | 'request_changes' | 'decline';
      notes?: string;
      approved?: boolean;
    }) => {
      const resolvedAction = action || (approved === false ? 'decline' : 'approve');
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/v1/internal/whatsapp/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            action: resolvedAction,
            notes,
          }),
        });
      } catch {
        // Fallback
      }

      if (resolvedAction === 'approve') {
        inMemoryReviews = inMemoryReviews.filter((r) => r.id !== productId);
      }
      return { success: true, action: resolvedAction, productId, notes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-overview'] });
    },
  });
}
