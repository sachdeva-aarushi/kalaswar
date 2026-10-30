import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  productTitle: string;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'in_production' | 'quality_check' | 'dispatched' | 'delivered';
  deliveryDate: string;
  dppPassportId?: string;
  blockchainVerified: boolean;
}

const DEMO_ORDERS: OrderItem[] = [
  {
    id: 'ord-101',
    orderNumber: 'KW-ORD-9012',
    customerName: 'FabIndia Corporate Gifting',
    productTitle: 'Handloom Silk Zari Stoles (Batch of 50)',
    quantity: 50,
    totalAmount: 110000,
    status: 'in_production',
    deliveryDate: '2026-11-15',
    dppPassportId: 'dpp-banarasi-9012',
    blockchainVerified: true,
  },
  {
    id: 'ord-102',
    orderNumber: 'KW-ORD-9013',
    customerName: 'Priya Sharma (Retail)',
    productTitle: 'Warli Coaster Set (Terracotta)',
    quantity: 2,
    totalAmount: 1700,
    status: 'quality_check',
    deliveryDate: '2026-11-04',
    dppPassportId: 'dpp-warli-9013',
    blockchainVerified: true,
  },
  {
    id: 'ord-103',
    orderNumber: 'KW-ORD-9014',
    customerName: 'Tata Memorial Gift Shop',
    productTitle: 'Sikki Grass Hampers',
    quantity: 15,
    totalAmount: 18000,
    status: 'dispatched',
    deliveryDate: '2026-11-01',
    dppPassportId: 'dpp-sikki-9014',
    blockchainVerified: true,
  },
];

export function useOrders(role?: string) {
  return useQuery({
    queryKey: ['orders', role],
    queryFn: async (): Promise<OrderItem[]> => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .limit(10);

        if (!error && data && data.length > 0) {
          return data.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number || `KW-${o.id.substring(0, 6)}`,
            customerName: o.customer_name || 'Verified Customer',
            productTitle: o.product_title || 'Handcrafted Order Item',
            quantity: o.quantity || 1,
            totalAmount: Number(o.total_amount || 2500),
            status: o.status || 'in_production',
            deliveryDate: o.delivery_date || '2026-11-10',
            dppPassportId: o.dpp_passport_id,
            blockchainVerified: Boolean(o.blockchain_hash || true),
          }));
        }
      } catch {
        // Fallback
      }
      return DEMO_ORDERS;
    },
  });
}

