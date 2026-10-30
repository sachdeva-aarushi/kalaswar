import { useQuery } from '@tanstack/react-query';

export interface PayoutRecord {
  id: string;
  date: string;
  orderNumber: string;
  craftItem: string;
  amount: number;
  status: 'transferred' | 'escrow_hold' | 'processing';
  bankReference: string;
}

export interface ArtisanEarningsData {
  totalEarnedYtd: number;
  pendingInEscrow: number;
  lastPayoutDate: string;
  bankAccountMasked: string;
  payouts: PayoutRecord[];
}

const DEMO_EARNINGS: ArtisanEarningsData = {
  totalEarnedYtd: 142800,
  pendingInEscrow: 8500,
  lastPayoutDate: '2026-10-25',
  bankAccountMasked: 'State Bank of India (••• 4091)',
  payouts: [
    {
      id: 'pay-01',
      date: '2026-10-25',
      orderNumber: 'KW-ORD-8821',
      craftItem: 'Banarasi Silk Border (10 units)',
      amount: 4500,
      status: 'transferred',
      bankReference: 'DBT-SBIN-99210041',
    },
    {
      id: 'pay-02',
      date: '2026-10-18',
      orderNumber: 'KW-ORD-8790',
      craftItem: 'Warli Hand-Painted Panels (6 units)',
      amount: 3200,
      status: 'transferred',
      bankReference: 'DBT-SBIN-99182302',
    },
    {
      id: 'pay-03',
      date: '2026-10-12',
      orderNumber: 'KW-ORD-8742',
      craftItem: 'Zari Weaving Advance (70% PO Factoring)',
      amount: 6000,
      status: 'transferred',
      bankReference: 'DBT-SBIN-99120194',
    },
  ],
};

export function useEarnings() {
  return useQuery({
    queryKey: ['artisan-earnings'],
    queryFn: async (): Promise<ArtisanEarningsData> => {
      return DEMO_EARNINGS;
    },
  });
}

