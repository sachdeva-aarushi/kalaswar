import { useQuery } from '@tanstack/react-query';

export interface ArtisanTask {
  id: string;
  orderNumber: string;
  craftName: string;
  stageName: string;
  progressPercent: number;
  targetUnits: number;
  completedUnits: number;
  dueDate: string;
  instructionsAudioUrl?: string;
  wagePerUnit: number;
  estimatedEarnings: number;
}

const DEMO_TASKS: ArtisanTask[] = [
  {
    id: 'task-001',
    orderNumber: 'KW-ORD-9012',
    craftName: 'Pure Silk Zari Border Weaving',
    stageName: 'Jacquard Border Insertion (24 / 50 meters)',
    progressPercent: 48,
    targetUnits: 50,
    completedUnits: 24,
    dueDate: '2026-11-12',
    wagePerUnit: 450,
    estimatedEarnings: 22500,
  },
  {
    id: 'task-002',
    orderNumber: 'KW-ORD-8840',
    craftName: 'Raw Silk Tassel Finishing',
    stageName: 'Hand Knotting & Quality Edge Binding',
    progressPercent: 80,
    targetUnits: 20,
    completedUnits: 16,
    dueDate: '2026-11-03',
    wagePerUnit: 120,
    estimatedEarnings: 2400,
  },
];

export function useArtisanTasks() {
  return useQuery({
    queryKey: ['artisan-tasks'],
    queryFn: async (): Promise<ArtisanTask[]> => {
      // In production, queries Supabase craft_tasks / order_assignments
      return DEMO_TASKS;
    },
  });
}

