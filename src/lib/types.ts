export type OrderStatus =
  | "pending"
  | "in_production"
  | "ready_for_dispatch"
  | "delivered"
  | "delayed";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "in_production",
  "ready_for_dispatch",
  "delivered",
  "delayed",
];

export interface Shg {
  id: string;
  name: string;
  region: string;
  preferred_language: string;
  upi_id: string | null;
  created_at: string;
}

export interface Artisan {
  id: string;
  shg_id: string;
  name: string;
  craft: string;
  bio: string;
  preferred_language: string;
  photo_url: string | null;
  photo_public_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  artisan_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string | null;
  image_public_id: string | null;
  availability: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  product_id: string;
  customer_reference: string;
  quantity: number;
  status: OrderStatus;
  expected_dispatch_at: string | null;
  created_at: string;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  artisan_id: string;
  assigned_at: string;
  assigned_by: string;
  /* joined by the data layer when reading order assignment history */
  artisan?: Artisan | null;
}

export interface Tip {
  id: string;
  artisan_id: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

export type PaymentDirection = "customer_payment" | "artisan_payout";

export interface Payment {
  id: string;
  order_id: string | null;
  shg_id: string | null;
  artisan_id: string | null;
  direction: PaymentDirection;
  amount: number;
  method: string;
  status: string;
  upi_reference: string | null;
  note: string | null;
  created_at: string;
}

export interface PaymentWithDetails extends Payment {
  order_reference?: string | null;
  artisan_name?: string | null;
  shg_name?: string | null;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  note: string | null;
  created_at: string;
}

export interface OrderEventWithRef extends OrderEvent {
  order_reference?: string | null;
}

/* Joined shapes used by the UI */

export interface ProductWithArtisan extends Product {
  artisan?: Artisan | null;
  shg?: Shg | null;
}

export interface OrderWithDetails extends Order {
  product?: Product | null;
  artisan?: Artisan | null; // current (latest) assignment
  assignments?: OrderAssignment[];
}
