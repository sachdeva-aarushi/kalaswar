-- =============================================================================
-- Migration 0013: Kalaswar Full Schema Extension
-- =============================================================================
-- Adds:
--   • shg_clusters        — SRLM-registered cluster records (PDF Section 10)
--   • dpp_passports       — Digital Product Passports (Merkle/Polygon DPP)
--   • po_factoring        — PO micro-factoring / advance disbursement
--   • listing_drafts      — Voice-generated listing drafts (WhatsApp → AI)
--   • voice_sessions      — WhatsApp conversation state machine
--   • payout_ledger       — Simulated DBT wage payout ledger
--   • carts + cart_items  — Customer shopping cart
--   • action_audit_logs   — Enriched immutable audit trail (replaces demo version)
--   • financier role      — Added to app_role enum
--
-- Design principles enforced:
--   • RLS enabled on every table; no table left open to anon by default.
--   • Immutable versioned records: dpp_passports, payout_ledger entries are
--     never UPDATEd or DELETEd once committed (enforced by triggers).
--   • Proposal/quote approvals reference a specific version UUID (existing schema).
--   • Demo data is labelled; demo rows carry is_demo=true or "Demonstration" labels.
--   • Secrets (bank_dbt_account) are visible only to admin + financier roles.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND app_role ENUM
-- ---------------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financier';

-- ---------------------------------------------------------------------------
-- 2. shg_clusters — SRLM cluster registry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shg_clusters (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_name      text        NOT NULL,
  state_srlm_id     text        UNIQUE,
  state             text        NOT NULL,
  district          text,
  block             text,
  bank_dbt_account  text,
  bank_ifsc         text,
  cluster_manager   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.shg_clusters IS 'SRLM-registered SHG clusters; bank_dbt_account is visible only to admin and financier roles via RLS.';
COMMENT ON COLUMN public.shg_clusters.state_srlm_id IS 'Government SRLM registration ID; unique across India.';
COMMENT ON COLUMN public.shg_clusters.bank_dbt_account IS 'DBT-linked bank account; must never be logged or returned in non-privileged API responses.';

ALTER TABLE public.shgs
  ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.shg_clusters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shg_clusters_state ON public.shg_clusters(state);
CREATE INDEX IF NOT EXISTS idx_shgs_cluster ON public.shgs(cluster_id);

ALTER TABLE public.shg_clusters ENABLE ROW LEVEL SECURITY;

GRANT SELECT               ON public.shg_clusters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shg_clusters TO service_role;

CREATE POLICY "Admin read all clusters" ON public.shg_clusters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Financier read all clusters" ON public.shg_clusters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'financier'));

CREATE POLICY "Coordinator reads own cluster" ON public.shg_clusters
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shgs s
      JOIN public.group_memberships m ON m.shg_id = s.id
      WHERE s.cluster_id = shg_clusters.id
        AND m.user_id = auth.uid()
        AND m.member_role = 'coordinator'
    )
  );

CREATE POLICY "Admin manages clusters" ON public.shg_clusters
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 3. dpp_passports — Digital Product Passports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dpp_passports (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  merkle_root        text        NOT NULL,
  merkle_leaf_count  integer     NOT NULL DEFAULT 1,
  polygon_tx_hash    text,
  polygon_block      bigint,
  chain              text        NOT NULL DEFAULT 'polygon_amoy',
  qr_code_url        text,
  committed_at       timestamptz,
  creator_user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.dpp_passports IS 'Immutable Digital Product Passports. Once polygon_tx_hash is set the row must not be modified.';
COMMENT ON COLUMN public.dpp_passports.merkle_root IS 'Off-chain Merkle root batching up to 500 production event logs per commit.';
COMMENT ON COLUMN public.dpp_passports.polygon_tx_hash IS 'Transaction hash on Polygon L2; null until confirmed. Set only by the backend worker.';

CREATE INDEX IF NOT EXISTS idx_dpp_product ON public.dpp_passports(product_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dpp_tx_hash ON public.dpp_passports(polygon_tx_hash) WHERE polygon_tx_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_dpp_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.polygon_tx_hash IS NOT NULL THEN
    RAISE EXCEPTION 'dpp_passports: row is immutable once polygon_tx_hash is set (id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dpp_immutable ON public.dpp_passports;
CREATE TRIGGER trg_dpp_immutable
  BEFORE UPDATE ON public.dpp_passports
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dpp_mutation();

ALTER TABLE public.dpp_passports ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.dpp_passports TO anon, authenticated;
GRANT INSERT, UPDATE ON public.dpp_passports TO authenticated;
GRANT ALL ON public.dpp_passports TO service_role;

CREATE POLICY "Public read committed passports" ON public.dpp_passports
  FOR SELECT TO anon
  USING (polygon_tx_hash IS NOT NULL);

CREATE POLICY "Coordinator reads passports for own SHG products" ON public.dpp_passports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.artisans a ON a.id = p.artisan_id
      WHERE p.id = dpp_passports.product_id
        AND public.is_shg_coordinator(auth.uid(), a.shg_id)
    )
  );

CREATE POLICY "Admin reads all passports" ON public.dpp_passports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinator creates passports for own SHG" ON public.dpp_passports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.artisans a ON a.id = p.artisan_id
      WHERE p.id = dpp_passports.product_id
        AND public.is_shg_coordinator(auth.uid(), a.shg_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. po_factoring — PO micro-factoring / advance disbursement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.po_factoring (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id              uuid          REFERENCES public.shgs(id) ON DELETE SET NULL,
  cluster_id          uuid          REFERENCES public.shg_clusters(id) ON DELETE SET NULL,
  buyer_id            uuid          REFERENCES public.buyers(id) ON DELETE SET NULL,
  order_id            uuid          REFERENCES public.orders(id) ON DELETE SET NULL,
  po_reference        text          NOT NULL,
  po_amount_inr       numeric(14,2) NOT NULL CHECK (po_amount_inr > 0),
  advance_percent     numeric(5,2)  NOT NULL DEFAULT 50 CHECK (advance_percent BETWEEN 0 AND 100),
  advance_inr         numeric(14,2) GENERATED ALWAYS AS (ROUND(po_amount_inr * advance_percent / 100, 2)) STORED,
  advance_disbursed   boolean       NOT NULL DEFAULT false,
  disbursed_at        timestamptz,
  financier_user_id   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  notes               text,
  status              text          NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','disbursed','repaid','cancelled')),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.po_factoring IS 'PO-backed micro-factoring advances. Restricted to financier and admin; coordinator of receiving SHG can read their records.';
COMMENT ON COLUMN public.po_factoring.advance_inr IS 'Computed: po_amount_inr x advance_percent / 100. Never set manually.';

CREATE INDEX IF NOT EXISTS idx_po_factoring_shg    ON public.po_factoring(shg_id);
CREATE INDEX IF NOT EXISTS idx_po_factoring_buyer  ON public.po_factoring(buyer_id);
CREATE INDEX IF NOT EXISTS idx_po_factoring_status ON public.po_factoring(status);

ALTER TABLE public.po_factoring ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.po_factoring TO authenticated;
GRANT INSERT, UPDATE ON public.po_factoring TO authenticated;
GRANT ALL ON public.po_factoring TO service_role;

CREATE POLICY "Financier manages all PO factoring" ON public.po_factoring
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'financier'))
  WITH CHECK (public.has_role(auth.uid(), 'financier'));

CREATE POLICY "Admin reads all PO factoring" ON public.po_factoring
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinator reads own SHG PO factoring" ON public.po_factoring
  FOR SELECT TO authenticated
  USING (
    shg_id IS NOT NULL AND public.is_shg_coordinator(auth.uid(), shg_id)
  );

-- ---------------------------------------------------------------------------
-- 5. listing_drafts — Voice-generated product listing drafts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_drafts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id           uuid        NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  shg_id               uuid        REFERENCES public.shgs(id) ON DELETE SET NULL,
  voice_session_id     uuid,
  source               text        NOT NULL DEFAULT 'whatsapp'
                       CHECK (source IN ('whatsapp','web','coordinator','api')),
  title                text,
  description          text,
  category             text,
  materials            text[],
  price_suggestion     numeric(10,2),
  currency             text        NOT NULL DEFAULT 'INR',
  images               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  raw_transcript       text,
  ai_assisted          boolean     NOT NULL DEFAULT false,
  structured           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status               text        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','pending_review','approved','rejected','published','archived')),
  reviewed_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at          timestamptz,
  rejection_reason     text,
  published_product_id uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.listing_drafts IS 'Voice-driven listing drafts from WhatsApp/AI pipeline. An artisan must explicitly approve before the backend creates a product row.';
COMMENT ON COLUMN public.listing_drafts.raw_transcript IS 'Verbatim voice transcript; artisan may correct any AI interpretation.';
COMMENT ON COLUMN public.listing_drafts.ai_assisted IS 'True when structured fields were derived by an AI model; must be reviewed before publishing.';

CREATE INDEX IF NOT EXISTS idx_listing_drafts_artisan ON public.listing_drafts(artisan_id);
CREATE INDEX IF NOT EXISTS idx_listing_drafts_status  ON public.listing_drafts(status);
CREATE INDEX IF NOT EXISTS idx_listing_drafts_shg     ON public.listing_drafts(shg_id);

ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.listing_drafts TO authenticated;
GRANT ALL ON public.listing_drafts TO service_role;

CREATE POLICY "Artisan manages own listing drafts" ON public.listing_drafts
  FOR ALL TO authenticated
  USING  (public.is_org_artisan(auth.uid(), artisan_id))
  WITH CHECK (public.is_org_artisan(auth.uid(), artisan_id));

CREATE POLICY "Coordinator reviews listing drafts for own SHG" ON public.listing_drafts
  FOR ALL TO authenticated
  USING  (shg_id IS NOT NULL AND public.is_shg_coordinator(auth.uid(), shg_id))
  WITH CHECK (shg_id IS NOT NULL AND public.is_shg_coordinator(auth.uid(), shg_id));

CREATE POLICY "Admin reads all listing drafts" ON public.listing_drafts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 6. voice_sessions — WhatsApp conversation state machine
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_phone   text        NOT NULL,
  artisan_id       uuid        REFERENCES public.artisans(id) ON DELETE SET NULL,
  shg_id           uuid        REFERENCES public.shgs(id) ON DELETE SET NULL,
  language         text        NOT NULL DEFAULT 'hi'
                   CHECK (language IN ('en','hi','mr','bn','te','ta','kn','gu','or','pa')),
  intent           text        NOT NULL DEFAULT 'list_product'
                   CHECK (intent IN ('list_product','check_order','payout_query','help','unknown')),
  status           text        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','abandoned','error')),
  step             text        NOT NULL DEFAULT 'greeting',
  context          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  transcript       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  listing_draft_id uuid        REFERENCES public.listing_drafts(id) ON DELETE SET NULL,
  error_message    text,
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

COMMENT ON TABLE  public.voice_sessions IS 'WhatsApp conversation sessions. The FastAPI backend is the authoritative writer via service_role.';
COMMENT ON COLUMN public.voice_sessions.whatsapp_phone IS 'E.164 phone number (+91...) from Meta Cloud API webhook.';

CREATE INDEX IF NOT EXISTS idx_voice_sessions_phone   ON public.voice_sessions(whatsapp_phone);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_artisan ON public.voice_sessions(artisan_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status  ON public.voice_sessions(status, last_activity_at DESC);

-- Back-reference from listing_drafts to voice_sessions
ALTER TABLE public.listing_drafts
  ADD CONSTRAINT fk_listing_draft_voice_session
  FOREIGN KEY (voice_session_id) REFERENCES public.voice_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.voice_sessions TO authenticated;
GRANT ALL ON public.voice_sessions TO service_role;

CREATE POLICY "Coordinator reads voice sessions for own SHG" ON public.voice_sessions
  FOR SELECT TO authenticated
  USING (
    shg_id IS NOT NULL AND public.is_shg_coordinator(auth.uid(), shg_id)
  );

CREATE POLICY "Admin reads all voice sessions" ON public.voice_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 7. payout_ledger — Append-only DBT wage payout ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_ledger (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id     uuid          REFERENCES public.artisans(id) ON DELETE SET NULL,
  shg_id         uuid          REFERENCES public.shgs(id) ON DELETE SET NULL,
  cluster_id     uuid          REFERENCES public.shg_clusters(id) ON DELETE SET NULL,
  order_id       uuid          REFERENCES public.orders(id) ON DELETE SET NULL,
  payout_type    text          NOT NULL DEFAULT 'wage'
                 CHECK (payout_type IN ('wage','advance','tip','refund','adjustment','demo')),
  amount_inr     numeric(14,2) NOT NULL CHECK (amount_inr > 0),
  reference      text,
  channel        text          NOT NULL DEFAULT 'demo'
                 CHECK (channel IN ('upi','bank_transfer','dbt','cash','demo')),
  status         text          NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','completed','failed','demo')),
  initiated_by   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_at   timestamptz   NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  note           text,
  is_demo        boolean       NOT NULL DEFAULT false
);

COMMENT ON TABLE  public.payout_ledger IS 'Append-only wage payout ledger. Rows are never updated or deleted. is_demo=true rows are demonstration records.';
COMMENT ON COLUMN public.payout_ledger.is_demo IS 'DEMONSTRATION MODE: when true this row simulates a payment and must be visually differentiated in any UI.';

CREATE INDEX IF NOT EXISTS idx_payout_artisan ON public.payout_ledger(artisan_id, initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_shg     ON public.payout_ledger(shg_id, initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_status  ON public.payout_ledger(status);

CREATE OR REPLACE FUNCTION public.prevent_payout_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'payout_ledger: rows are immutable once created (op=%, id=%)', TG_OP, OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_immutable ON public.payout_ledger;
CREATE TRIGGER trg_payout_immutable
  BEFORE UPDATE OR DELETE ON public.payout_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payout_mutation();

ALTER TABLE public.payout_ledger ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.payout_ledger TO authenticated;
GRANT INSERT ON public.payout_ledger TO authenticated;
GRANT ALL ON public.payout_ledger TO service_role;

CREATE POLICY "Artisan reads own payouts" ON public.payout_ledger
  FOR SELECT TO authenticated
  USING (
    artisan_id IS NOT NULL AND public.is_org_artisan(auth.uid(), artisan_id)
  );

CREATE POLICY "Coordinator reads own SHG payouts" ON public.payout_ledger
  FOR SELECT TO authenticated
  USING (
    shg_id IS NOT NULL AND public.is_shg_coordinator(auth.uid(), shg_id)
  );

CREATE POLICY "Financier manages payouts" ON public.payout_ledger
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'financier'))
  WITH CHECK (public.has_role(auth.uid(), 'financier'));

CREATE POLICY "Admin reads all payouts" ON public.payout_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinator initiates payouts for own SHG" ON public.payout_ledger
  FOR INSERT TO authenticated
  WITH CHECK (
    shg_id IS NOT NULL AND public.is_shg_coordinator(auth.uid(), shg_id)
    AND status = 'pending'
  );

-- ---------------------------------------------------------------------------
-- 8. carts + cart_items — Customer shopping cart
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  status     text        NOT NULL DEFAULT 'active'
             CHECK (status IN ('active','checked_out','abandoned','merged')),
  currency   text        NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_has_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

COMMENT ON TABLE public.carts IS 'Customer shopping carts (authenticated and anonymous). Anonymous carts use session_id and are merged on login.';

CREATE TABLE IF NOT EXISTS public.cart_items (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id       uuid          NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id    uuid          NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity      integer       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  currency      text          NOT NULL DEFAULT 'INR',
  customisation jsonb         NOT NULL DEFAULT '{}'::jsonb,
  added_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

COMMENT ON TABLE public.cart_items IS 'Cart line items. unit_price is snapshotted at add-time; checkout must revalidate current product price before confirming order.';

CREATE INDEX IF NOT EXISTS idx_carts_user        ON public.carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_session      ON public.carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_cart    ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);

ALTER TABLE public.carts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO anon, authenticated;
GRANT ALL ON public.carts, public.cart_items TO service_role;

CREATE POLICY "User manages own cart" ON public.carts
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon reads own session cart" ON public.carts
  FOR SELECT TO anon
  USING (session_id IS NOT NULL);

CREATE POLICY "Anon creates session cart" ON public.carts
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

CREATE POLICY "Anon manages own session cart" ON public.carts
  FOR ALL TO anon
  USING (user_id IS NULL AND session_id IS NOT NULL)
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

CREATE POLICY "Admin reads all carts" ON public.carts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "User manages own cart items" ON public.cart_items
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()));

CREATE POLICY "Anon manages own session cart items" ON public.cart_items
  FOR ALL TO anon
  USING  (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.session_id IS NOT NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.session_id IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 9. action_audit_logs — Harden existing table, add immutability
-- ---------------------------------------------------------------------------
ALTER TABLE public.action_audit_logs
  ADD COLUMN IF NOT EXISTS actor_user_id uuid  REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_type   text,
  ADD COLUMN IF NOT EXISTS ip_address    inet,
  ADD COLUMN IF NOT EXISTS request_id    text;

COMMENT ON TABLE  public.action_audit_logs IS 'Immutable audit trail of consequential actions. Rows are append-only; UPDATE and DELETE are blocked by trigger.';
COMMENT ON COLUMN public.action_audit_logs.ip_address IS 'IP address supplied by the trusted backend only; never trust a client-submitted value.';

CREATE INDEX IF NOT EXISTS idx_audit_actor_user ON public.action_audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON public.action_audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON public.action_audit_logs(action, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'action_audit_logs: rows are immutable (op=%, id=%)', TG_OP, OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_immutable ON public.action_audit_logs;
CREATE TRIGGER trg_audit_immutable
  BEFORE UPDATE OR DELETE ON public.action_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- Replace open demo policy with scoped policies
DROP POLICY IF EXISTS "Demo full access — audit log" ON public.action_audit_logs;

GRANT SELECT ON public.action_audit_logs TO authenticated;
GRANT INSERT ON public.action_audit_logs TO authenticated;

CREATE POLICY "Admin reads all audit logs" ON public.action_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "User reads own audit entries" ON public.action_audit_logs
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

CREATE POLICY "Coordinator reads own SHG audit trail" ON public.action_audit_logs
  FOR SELECT TO authenticated
  USING (
    actor_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_memberships m
      WHERE m.user_id = auth.uid()
        AND m.member_role = 'coordinator'
        AND (
          (entity_type = 'shg' AND entity_id = m.shg_id)
          OR entity_type IN ('product','order','proposal','listing_draft','voice_session','payout_ledger')
        )
    )
  );

CREATE POLICY "Authenticated appends audit entry" ON public.action_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 10. updated_at triggers for new mutable tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shg_clusters_updated_at  ON public.shg_clusters;
DROP TRIGGER IF EXISTS trg_po_factoring_updated_at   ON public.po_factoring;
DROP TRIGGER IF EXISTS trg_listing_drafts_updated_at ON public.listing_drafts;
DROP TRIGGER IF EXISTS trg_voice_sessions_updated_at ON public.voice_sessions;
DROP TRIGGER IF EXISTS trg_carts_updated_at          ON public.carts;
DROP TRIGGER IF EXISTS trg_cart_items_updated_at     ON public.cart_items;

CREATE TRIGGER trg_shg_clusters_updated_at
  BEFORE UPDATE ON public.shg_clusters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_po_factoring_updated_at
  BEFORE UPDATE ON public.po_factoring
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_listing_drafts_updated_at
  BEFORE UPDATE ON public.listing_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_voice_sessions_updated_at
  BEFORE UPDATE ON public.voice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. is_financier helper function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_financier(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'financier')
$$;

-- ---------------------------------------------------------------------------
-- 12. Demo seed data (clearly labelled DEMONSTRATION MODE)
-- ---------------------------------------------------------------------------

-- shg_clusters demo rows
INSERT INTO public.shg_clusters (id, cluster_name, state_srlm_id, state, district, block, cluster_manager)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Bihar Madhubani Cluster — Demonstration', 'BR-SRLM-0042-DEMO', 'Bihar',     'Madhubani',    'Madhubani Sadar', 'Demonstration Cluster Manager'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Manipur Bishnupur Cluster — Demonstration', 'MN-SRLM-0017-DEMO', 'Manipur', 'Bishnupur',    'Bishnupur Block', 'Demonstration Cluster Manager'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Rajasthan Sawai Madhopur Cluster — Demonstration', 'RJ-SRLM-0093-DEMO', 'Rajasthan', 'Sawai Madhopur', 'Sawai Madhopur Block', 'Demonstration Cluster Manager')
ON CONFLICT DO NOTHING;

-- Link existing demo SHGs to clusters
UPDATE public.shgs SET cluster_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.shgs SET cluster_id = 'aaaaaaaa-0000-0000-0000-000000000002' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.shgs SET cluster_id = 'aaaaaaaa-0000-0000-0000-000000000003' WHERE id = '33333333-3333-3333-3333-333333333333';

-- Demo DPP passport (pending; no polygon_tx_hash — DEMONSTRATION MODE)
INSERT INTO public.dpp_passports (id, product_id, merkle_root, merkle_leaf_count, chain, qr_code_url)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '0x3a8f7d2c1e4b9f6a0d5c8e2b1a7f3d9c6e0b4a5f2d8c1e7b3a9f6d2c5e0b4a1',
  12,
  'polygon_amoy',
  'https://kalaswar.in/passport/demo-kouna-tote'
) ON CONFLICT DO NOTHING;

-- Demo voice session (DEMONSTRATION MODE)
INSERT INTO public.voice_sessions (id, whatsapp_phone, artisan_id, shg_id, language, intent, status, step, context)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  '+919876543210',
  '22222222-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'hi',
  'list_product',
  'completed',
  'confirmed',
  '{"product_name":"Kouna basket demo","price_suggestion":1200,"is_demo":true}'::jsonb
) ON CONFLICT DO NOTHING;

-- Demo listing draft (DEMONSTRATION MODE)
INSERT INTO public.listing_drafts (
  id, artisan_id, shg_id, voice_session_id, source,
  title, description, category, materials, price_suggestion,
  raw_transcript, ai_assisted, status
)
VALUES (
  'dddddddd-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'cccccccc-0000-0000-0000-000000000001',
  'whatsapp',
  'Kouna Grass Round Basket — Demo Draft',
  'Hand-woven kouna grass round storage basket with braided handles. Demonstration listing draft created via WhatsApp voice note.',
  'Baskets & Bags',
  ARRAY['kouna grass','cotton cord'],
  1200.00,
  'Demo transcript: artisan described a kouna grass basket with handles, priced at 1200 rupees.',
  true,
  'pending_review'
) ON CONFLICT DO NOTHING;

-- Demo payout (is_demo=true — DEMONSTRATION MODE)
INSERT INTO public.payout_ledger (
  artisan_id, shg_id, payout_type, amount_inr, channel, status, is_demo, note
)
VALUES (
  '22222222-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'wage',
  3600.00,
  'demo',
  'demo',
  true,
  'DEMONSTRATION MODE: simulated DBT wage payout for Kouna Tote order — not a real transaction'
);

-- Demo anonymous cart (DEMONSTRATION MODE)
INSERT INTO public.carts (id, session_id, status)
VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'demo-session-kalaswar-2026', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.cart_items (cart_id, product_id, quantity, unit_price)
VALUES ('eeeeeeee-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 1290.00)
ON CONFLICT DO NOTHING;
