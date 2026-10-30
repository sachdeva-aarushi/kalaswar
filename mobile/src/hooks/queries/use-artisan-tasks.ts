import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
  craftNameHi: string;
  stageName: string;
  stageNameHi: string;
  progressPercent: number;
  targetUnits: number;
  completedUnits: number;
  dueDate: string;
  dueDateHi: string;
  cluster: string;
  imageUrl: string;
  wagePerUnit: number;
  estimatedEarnings: number;
  materialsNote: string;
  steps: ArtisanTaskStep[];
}

export const SEEDED_ARTISAN_TASKS: ArtisanTask[] = [
  {
    id: 'task-cushion-01',
    orderNumber: 'KO-2026-0034',
    craftName: 'Embroider 12 cushion covers',
    craftNameHi: '12 कुशन कवर की कढ़ाई',
    stageName: 'Hand Kantha & Suf Mirror Work',
    stageNameHi: 'हाथ की कढ़ाई और शीशे का काम',
    progressPercent: 33,
    targetUnits: 12,
    completedUnits: 4,
    dueDate: 'Due 20 Nov',
    dueDateHi: '20 नवंबर तक',
    cluster: 'Bhagirathi Cluster (भागीरथी स्वयं सहायता समूह)',
    imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
    wagePerUnit: 350,
    estimatedEarnings: 4200,
    materialsNote: 'Unbleached natural cotton fabric, red silk thread, miniature mirrors',
    steps: [
      {
        stepNumber: 1,
        title: 'Fabric cutting & 40x40 cm marking',
        hindiTitle: 'कपड़ा काटना और 40x40 सेमी नाप लेना',
        isCompleted: true,
      },
      {
        stepNumber: 2,
        title: 'Geometric boundary running stitches',
        hindiTitle: 'ज्यामितीय बॉर्डर टांके लगाना',
        isCompleted: true,
      },
      {
        stepNumber: 3,
        title: 'Central floral mirror insertion',
        hindiTitle: 'बीच में शीशा और फूल की कढ़ाई',
        isCompleted: false,
      },
      {
        stepNumber: 4,
        title: 'Edge binding & iron pressing',
        hindiTitle: 'किनारी सिलाई और फिनिशिंग',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'task-silk-02',
    orderNumber: 'KW-ORD-9012',
    craftName: 'Pure Banarasi Katan Silk Stole',
    craftNameHi: 'शुद्ध बनारसी कातान सिल्क स्टोल',
    stageName: 'Jacquard Zari Selvage Insertion',
    stageNameHi: 'जैकार्ड ज़री किनारी बुनाई',
    progressPercent: 80,
    targetUnits: 10,
    completedUnits: 8,
    dueDate: 'Due 12 Nov',
    dueDateHi: '12 नवंबर तक',
    cluster: 'Varanasi Handloom Federation',
    imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&auto=format&fit=crop&q=70',
    wagePerUnit: 450,
    estimatedEarnings: 4500,
    materialsNote: 'Pure mulberry raw silk hanks, brass zari metallic weft',
    steps: [
      {
        stepNumber: 1,
        title: 'Warp thread tension setup on loom',
        hindiTitle: 'करघे पर ताना धागा लगाना',
        isCompleted: true,
      },
      {
        stepNumber: 2,
        title: 'Body jacquard weft shuttle pass',
        hindiTitle: 'बॉडी बुनाई शटल चलाना',
        isCompleted: true,
      },
      {
        stepNumber: 3,
        title: 'Zari floral border selvage finish',
        hindiTitle: 'ज़री बॉर्डर फिनिशिंग',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'task-sikki-03',
    orderNumber: 'KO-2026-0041',
    craftName: 'Sikki Grass Hampers (Set of 5)',
    craftNameHi: 'सिक्की घास का डिब्बा (5 सेट)',
    stageName: 'Grass Coiling & Lid Fitting',
    stageNameHi: 'घास की बुनाई और ढक्कन जोड़ना',
    progressPercent: 0,
    targetUnits: 5,
    completedUnits: 0,
    dueDate: 'Due 28 Nov',
    dueDateHi: '28 नवंबर तक',
    cluster: 'Mithila Craft Cluster',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=70',
    wagePerUnit: 240,
    estimatedEarnings: 1200,
    materialsNote: 'Dry golden sikki grass, natural lac dye pigments',
    steps: [
      {
        stepNumber: 1,
        title: 'Grass soaking & softening',
        hindiTitle: 'सिक्की घास भिगोना व मुलायम करना',
        isCompleted: false,
      },
      {
        stepNumber: 2,
        title: 'Coil base weaving',
        hindiTitle: 'गोल आधार की बुनाई',
        isCompleted: false,
      },
    ],
  },
];

export function useArtisanTasks() {
  return useQuery({
    queryKey: ['artisan-tasks'],
    queryFn: async (): Promise<ArtisanTask[]> => {
      try {
        const { data: assignments, error } = await supabase
          .from('order_assignments')
          .select('*, orders(*)')
          .limit(10);

        if (error) {
          if (error.message.includes('JWT') || error.message.includes('expired')) {
            const err = new Error('auth_expired');
            err.name = 'AuthExpiredError';
            throw err;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AuthExpiredError' || err?.message === 'auth_expired') {
          throw err;
        }
      }
      return SEEDED_ARTISAN_TASKS;
    },
  });
}

export function useTaskDetail(taskId: string) {
  return useQuery({
    queryKey: ['artisan-task', taskId],
    queryFn: async (): Promise<ArtisanTask> => {
      const matched = SEEDED_ARTISAN_TASKS.find((t) => t.id === taskId);
      return matched || SEEDED_ARTISAN_TASKS[0];
    },
  });
}

export function useLogTaskProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, units }: { taskId: string; units: number }) => {
      return { taskId, units };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['artisan-tasks'] });
    },
  });
}
