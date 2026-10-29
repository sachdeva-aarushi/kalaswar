/**
 * Kalaswar – Supabase database type definitions
 *
 * Auto-generated from supabase/migrations/0000–0013.
 * Run `supabase gen types typescript --local` to regenerate from a live db.
 *
 * Roles: admin | coordinator | artisan | customer | buyer | financier
 */

export type AppRole =
  | 'admin'
  | 'coordinator'
  | 'artisan'
  | 'customer'
  | 'buyer'
  | 'financier';

// ─── shg_clusters ────────────────────────────────────────────────────────────
export interface ShgCluster {
  id: string;
  cluster_name: string;
  state_srlm_id: string | null;
  state: string;
  district: string | null;
  block: string | null;
  /** PRIVILEGED — visible only to admin and financier roles */
  bank_dbt_account: string | null;
  bank_ifsc: string | null;
  cluster_manager: string | null;
  created_at: string;
  updated_at: string;
}

// ─── shgs (extended) ─────────────────────────────────────────────────────────
export interface Shg {
  id: string;
  name: string;
  region: string;
  preferred_language: string;
  monthly_capacity: number | null;
  cluster_id: string | null;
  created_at: string;
}

// ─── artisans ────────────────────────────────────────────────────────────────
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

// ─── profiles ────────────────────────────────────────────────────────────────
export interface Profile {
  id: string; // = auth.users.id
  display_name: string | null;
  preferred_language: string;
  onboarding_status: string;
  created_at: string;
  updated_at: string | null;
}

// ─── user_roles ──────────────────────────────────────────────────────────────
export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

// ─── group_memberships ───────────────────────────────────────────────────────
export interface GroupMembership {
  id: string;
  user_id: string | null;
  shg_id: string;
  artisan_id: string | null;
  member_role: string;
  created_at: string;
}

// ─── products ────────────────────────────────────────────────────────────────
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

// ─── listing_drafts ──────────────────────────────────────────────────────────
export type ListingDraftSource = 'whatsapp' | 'web' | 'coordinator' | 'api';
export type ListingDraftStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived';

export interface ListingDraft {
  id: string;
  artisan_id: string;
  shg_id: string | null;
  voice_session_id: string | null;
  source: ListingDraftSource;
  title: string | null;
  description: string | null;
  category: string | null;
  materials: string[] | null;
  price_suggestion: number | null;
  currency: string;
  images: CloudinaryAssetRef[];
  raw_transcript: string | null;
  ai_assisted: boolean;
  structured: Record<string, unknown>;
  status: ListingDraftStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  published_product_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── voice_sessions ──────────────────────────────────────────────────────────
export type VoiceSessionIntent =
  | 'list_product'
  | 'check_order'
  | 'payout_query'
  | 'help'
  | 'unknown';

export type VoiceSessionStatus = 'active' | 'completed' | 'abandoned' | 'error';

export interface VoiceTurn {
  role: 'user' | 'assistant';
  text: string;
  ts: string;
}

export interface VoiceSession {
  id: string;
  whatsapp_phone: string;
  artisan_id: string | null;
  shg_id: string | null;
  language: string;
  intent: VoiceSessionIntent;
  status: VoiceSessionStatus;
  step: string;
  context: Record<string, unknown>;
  transcript: VoiceTurn[];
  listing_draft_id: string | null;
  error_message: string | null;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
}

// ─── dpp_passports ───────────────────────────────────────────────────────────
export interface DppPassport {
  id: string;
  product_id: string;
  merkle_root: string;
  merkle_leaf_count: number;
  /** null until the Polygon backend worker confirms the transaction */
  polygon_tx_hash: string | null;
  polygon_block: number | null;
  chain: string;
  qr_code_url: string | null;
  committed_at: string | null;
  creator_user_id: string | null;
  created_at: string;
}

// ─── po_factoring ────────────────────────────────────────────────────────────
export type PoFactoringStatus =
  | 'pending'
  | 'approved'
  | 'disbursed'
  | 'repaid'
  | 'cancelled';

export interface PoFactoring {
  id: string;
  shg_id: string | null;
  cluster_id: string | null;
  buyer_id: string | null;
  order_id: string | null;
  po_reference: string;
  po_amount_inr: number;
  advance_percent: number;
  /** Computed column: po_amount_inr × advance_percent / 100 */
  advance_inr: number;
  advance_disbursed: boolean;
  disbursed_at: string | null;
  financier_user_id: string | null;
  notes: string | null;
  status: PoFactoringStatus;
  created_at: string;
  updated_at: string;
}

// ─── payout_ledger ───────────────────────────────────────────────────────────
export type PayoutType = 'wage' | 'advance' | 'tip' | 'refund' | 'adjustment' | 'demo';
export type PayoutChannel = 'upi' | 'bank_transfer' | 'dbt' | 'cash' | 'demo';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'demo';

export interface PayoutLedgerEntry {
  id: string;
  artisan_id: string | null;
  shg_id: string | null;
  cluster_id: string | null;
  order_id: string | null;
  payout_type: PayoutType;
  amount_inr: number;
  reference: string | null;
  channel: PayoutChannel;
  status: PayoutStatus;
  initiated_by: string | null;
  initiated_at: string;
  completed_at: string | null;
  note: string | null;
  /**
   * DEMONSTRATION MODE: when true this entry simulates a real payment.
   * Must always be visually differentiated in UI ("Demo" badge).
   */
  is_demo: boolean;
}

// ─── carts ───────────────────────────────────────────────────────────────────
export type CartStatus = 'active' | 'checked_out' | 'abandoned' | 'merged';

export interface Cart {
  id: string;
  user_id: string | null;   // authenticated user
  session_id: string | null; // anonymous session key
  status: CartStatus;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  /** Price snapshotted at add-time; must be revalidated at checkout */
  unit_price: number;
  currency: string;
  customisation: Record<string, unknown>;
  added_at: string;
  updated_at: string;
}

// ─── action_audit_logs ───────────────────────────────────────────────────────
export interface ActionAuditLog {
  id: string;
  actor: string;                // human-readable label
  actor_user_id: string | null; // auth.users.id — null for system/backend events
  action: string;
  entity: string | null;        // legacy: table or domain concept
  entity_type: string | null;   // normalised discriminator
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;    // backend-supplied; never client-submitted
  request_id: string | null;    // FastAPI X-Request-ID correlation
  created_at: string;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────
export interface CloudinaryAssetRef {
  public_id: string;
  secure_url: string;
  resource_type?: string;
  width?: number;
  height?: number;
}

// ─── Database convenience type (mirrors Supabase client generic) ─────────────
export interface Database {
  public: {
    Tables: {
      shg_clusters:       { Row: ShgCluster;       Insert: Omit<ShgCluster, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<ShgCluster, 'id' | 'created_at'>>; };
      listing_drafts:     { Row: ListingDraft;     Insert: Omit<ListingDraft, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<ListingDraft, 'id' | 'created_at'>>; };
      voice_sessions:     { Row: VoiceSession;     Insert: Omit<VoiceSession, 'id' | 'started_at' | 'last_activity_at'>; Update: Partial<Omit<VoiceSession, 'id' | 'started_at'>>; };
      dpp_passports:      { Row: DppPassport;      Insert: Omit<DppPassport, 'id' | 'created_at'>; Update: Partial<Omit<DppPassport, 'id' | 'created_at' | 'product_id'>>; };
      po_factoring:       { Row: PoFactoring;      Insert: Omit<PoFactoring, 'id' | 'advance_inr' | 'created_at' | 'updated_at'>; Update: Partial<Omit<PoFactoring, 'id' | 'advance_inr' | 'created_at'>>; };
      payout_ledger:      { Row: PayoutLedgerEntry; Insert: Omit<PayoutLedgerEntry, 'id' | 'initiated_at'>; Update: never; };
      carts:              { Row: Cart;             Insert: Omit<Cart, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Cart, 'id' | 'created_at'>>; };
      cart_items:         { Row: CartItem;         Insert: Omit<CartItem, 'id' | 'added_at' | 'updated_at'>; Update: Partial<Omit<CartItem, 'id' | 'added_at'>>; };
      action_audit_logs:  { Row: ActionAuditLog;   Insert: Omit<ActionAuditLog, 'id' | 'created_at'>; Update: never; };
    };
    Enums: {
      app_role: AppRole;
    };
  };
}
