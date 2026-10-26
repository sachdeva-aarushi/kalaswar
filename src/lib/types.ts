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
  /** Pieces per month the collective recorded; null = unknown. */
  monthly_capacity: number | null;
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

/* ---------- Workroom records (skills, inventory, guides) ---------- */

export interface ArtisanSkill {
  id: string;
  artisan_id: string;
  skill: string;
  level: string;
  notes: string | null;
  created_at: string;
}

export interface MaterialRecord {
  id: string;
  shg_id: string;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface CraftGuide {
  id: string;
  title: string;
  craft: string;
  category: string | null;
  language: string;
  steps: { title: string; detail: string }[];
  source: string;
  created_at: string;
}

/* ---------- Gift Concierge ---------- */

export type CustomRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "declined"
  | "proposed"
  | "confirmed"
  | "cancelled";

export interface CustomRequest {
  id: string;
  request_code: string;
  customer_reference: string;
  shg_id: string | null;
  title: string;
  brief: string;
  structured: Record<string, unknown>;
  status: CustomRequestStatus;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalSpec {
  name?: string | undefined;
  description?: string | undefined;
  materials?: string | undefined;
  personalisation?: string | undefined;
  quantity?: number | undefined;
  price_per_unit_inr?: number | undefined;
  currency?: string | undefined;
  total_inr?: number | undefined;
  production_days?: number | undefined;
  dispatch_terms?: string | undefined;
  cancellation_terms?: string | undefined;
  changes_from_request?: string | undefined;
  decline_reason?: string | undefined;
}

export interface Proposal {
  id: string;
  request_id: string;
  version: number;
  spec: ProposalSpec;
  status: string;
  created_by: string;
  created_at: string;
}

export interface ProposalApproval {
  id: string;
  proposal_id: string;
  approver_role: "customer" | "coordinator";
  approved_at: string;
}

export interface QualityCheck {
  id: string;
  order_id: string;
  artisan_id: string | null;
  result: string;
  notes: string | null;
  checked_by: string | null;
  checked_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  status: string;
  carrier: string | null;
  tracking_ref: string | null;
  provider: string | null;
  created_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  note: string | null;
  occurred_at: string;
}

export interface Expense {
  id: string;
  shg_id: string;
  artisan_id: string | null;
  order_id: string | null;
  category: string;
  amount: number;
  note: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface MediaAsset {
  id: string;
  product_id: string | null;
  public_id: string;
  secure_url: string;
  purpose: string;
  uploaded_by: string | null;
  created_at: string;
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

/* ---------- Living Craft Stories (Pillar 2) ---------- */

export type CraftStoryStatus = "draft" | "in_review" | "published" | "retired";

export type ConsentType =
  | "maker_name"
  | "maker_photo"
  | "voice_transcript"
  | "workshop_photo"
  | "cultural_notes"
  | "marketing_reuse";

export const CONSENT_TYPES: ConsentType[] = [
  "maker_name",
  "maker_photo",
  "voice_transcript",
  "workshop_photo",
  "cultural_notes",
  "marketing_reuse",
];

export interface CraftStory {
  id: string;
  product_id: string | null;
  shg_id: string | null;
  artisan_id: string | null;
  title: string;
  body: string;
  language: string;
  status: CraftStoryStatus;
  source_notes: string | null;
  /** The maker's raw notes, kept alongside any AI-organised draft. */
  original_notes: string | null;
  ai_assisted: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryConsent {
  id: string;
  story_id: string;
  consent_type: ConsentType;
  granted: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface CraftStoryWithConsents extends CraftStory {
  consents?: StoryConsent[];
}

export interface CraftStoryWithRefs extends CraftStory {
  consents?: StoryConsent[];
  artisan_name?: string | null;
  product_name?: string | null;
  product_image?: string | null;
}
