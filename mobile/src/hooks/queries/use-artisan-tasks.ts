import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

export interface ArtisanTaskStep {
  stepNumber: number;
  title: string;
  hindiTitle: string;
  isCompleted: boolean;
  notes?: string;
}

export interface ArtisanTask {
  id: string;
  orderNumber: string;
  craftName: string;
  title?: string;
  craftNameHi: string;
  titleHi?: string;
  stageName: string;
  stageNameHi: string;
  progressPercent: number;
  targetUnits: number;
  totalUnits?: number;
  completedUnits: number;
  dueDate: string;
  dueDateHi: string;
  cluster: string;
  clusterName?: string;
  imageUrl: string;
  wagePerUnit: number;
  estimatedEarnings: number;
  materialsNote: string;
  materialsAssigned?: string;
  steps: ArtisanTaskStep[];
}

function _mapOrderToTask(order: any): ArtisanTask {
  const isComplete = order.status === 'delivered' || order.status === 'ready_for_dispatch';
  const isInProduction = order.status === 'in_production';
  const progressPercent = isComplete ? 100 : isInProduction ? 60 : 15;
  const targetUnits = Number(order.quantity || 1);
  const completedUnits = isComplete ? targetUnits : isInProduction ? Math.max(1, Math.floor(targetUnits / 2)) : 0;
  const unitPrice = Number(order.unit_price || 1200);
  const wagePerUnit = Math.round(unitPrice * 0.6);
  const estimatedEarnings = wagePerUnit * targetUnits;

  const stageName = isComplete
    ? 'Ready for Dispatch / Delivered'
    : isInProduction
    ? 'In Production · Crafting Stage'
    : 'Order Assigned · Awaiting Production';

  const stageNameHi = isComplete
    ? 'प्रेषण तैयार / वितरित'
    : isInProduction
    ? 'निर्माण जारी है'
    : 'कार्य सौंपा गया';

  const dueDate = order.expected_dispatch_at ? `Due ${order.expected_dispatch_at}` : 'Ongoing task';
  const dueDateHi = order.expected_dispatch_at ? `${order.expected_dispatch_at} तक` : 'प्रगति पर';

  return {
    id: String(order.id),
    orderNumber: order.customer_reference || `ORD-${order.id.substring(0, 8).toUpperCase()}`,
    craftName: order.product_title || 'Handcrafted Artisan Order',
    craftNameHi: order.product_title || 'हस्तशिल्प कार्य',
    title: order.product_title,
    titleHi: order.product_title,
    stageName,
    stageNameHi,
    progressPercent,
    targetUnits,
    totalUnits: targetUnits,
    completedUnits,
    dueDate,
    dueDateHi,
    cluster: 'DAY-NRLM Artisan Cluster (स्वयं सहायता समूह)',
    clusterName: 'DAY-NRLM Artisan Cluster',
    imageUrl: order.product_image_url || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
    wagePerUnit,
    estimatedEarnings,
    materialsNote: 'Natural raw craft materials, non-toxic dyes, certified handloom components',
    materialsAssigned: 'Natural organic materials supplied by SHG cluster',
    steps: [
      {
        stepNumber: 1,
        title: 'Material preparation & initial measurement',
        hindiTitle: 'सामग्री तैयार करना और नाप लेना',
        isCompleted: true,
      },
      {
        stepNumber: 2,
        title: 'Handcrafting, stitching & artisan detailing',
        hindiTitle: 'हाथ की कढ़ाई, बुनाई और बारीक़ काम',
        isCompleted: isInProduction || isComplete,
      },
      {
        stepNumber: 3,
        title: 'Quality inspection & SHG packaging',
        hindiTitle: 'गुणवत्ता जाँच और समूह द्वारा पैकिंग',
        isCompleted: isComplete,
      },
    ],
  };
}

export function useArtisanTasks(artisanId?: string) {
  return useQuery({
    queryKey: ['artisan-tasks', artisanId],
    queryFn: async (): Promise<ArtisanTask[]> => {
      const endpoint = artisanId ? `/api/v1/orders?artisan_id=${artisanId}&page_size=20` : '/api/v1/orders?page_size=20';
      const res = await apiFetch<{ items: any[]; total: number }>(endpoint);
      if (!res || !res.items) {
        return [];
      }
      return res.items.map(_mapOrderToTask);
    },
  });
}

export function useTaskDetail(taskId: string) {
  return useQuery({
    queryKey: ['artisan-task', taskId],
    queryFn: async (): Promise<ArtisanTask> => {
      const order = await apiFetch<any>(`/api/v1/orders/${taskId}`);
      return _mapOrderToTask(order);
    },
  });
}

export function useLogTaskProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      units,
      completedUnits,
      notes,
    }: {
      taskId: string;
      units?: number;
      completedUnits?: number;
      notes?: string;
    }) => {
      const doneUnits = units ?? completedUnits ?? 1;
      return apiFetch(`/api/v1/orders/${taskId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          event_type: 'production_milestone',
          note: `Progress logged: ${doneUnits} units completed. ${notes || ''}`.trim(),
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['artisan-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['artisan-task'] });
    },
  });
}
