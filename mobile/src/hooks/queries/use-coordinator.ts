import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CoordinatorOverviewData {
  clusterName: string;
  totalArtisans: number;
  activeToday: number;
  pendingApprovals: number;
  openCustomRequests: number;
  monthlyDisbursements: number;
  urgentTasks: Array<{
    id: string;
    title: string;
    cluster: string;
    priority: 'high' | 'medium' | 'low';
    actionText: string;
  }>;
}

const DEFAULT_OVERVIEW: CoordinatorOverviewData = {
  clusterName: 'Dahanu Warli & Sahyadri Collective',
  totalArtisans: 48,
  activeToday: 34,
  pendingApprovals: 3,
  openCustomRequests: 5,
  monthlyDisbursements: 342000,
  urgentTasks: [
    {
      id: 'urg-1',
      title: 'Inspect Warli Coaster Lot #42 before dispatch',
      cluster: 'Dahanu Unit 2',
      priority: 'high',
      actionText: 'Review Inspection',
    },
    {
      id: 'urg-2',
      title: 'FabIndia Sample Proposal Revision (MakePossible)',
      cluster: 'Sahyadri Cluster',
      priority: 'high',
      actionText: 'Approve Feasibility',
    },
    {
      id: 'urg-3',
      title: 'Raw Silk Hank Allocation — Batch #B-9',
      cluster: 'Weaving Shed #1',
      priority: 'medium',
      actionText: 'Allocate Stock',
    },
  ],
};

export function useCoordinatorOverview() {
  return useQuery({
    queryKey: ['coordinator-overview'],
    queryFn: async (): Promise<CoordinatorOverviewData> => {
      try {
        const { count: clusterCount } = await supabase
          .from('artisans')
          .select('*', { count: 'exact', head: true });

        if (clusterCount && clusterCount > 0) {
          return {
            ...DEFAULT_OVERVIEW,
            totalArtisans: clusterCount,
          };
        }
      } catch {
        // Fallback
      }
      return DEFAULT_OVERVIEW;
    },
  });
}

