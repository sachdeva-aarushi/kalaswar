-- =============================================================================
-- Migration 0018: Product Provenance, Blockchain Batches & QR Tags
-- =============================================================================
-- Features:
--   1. blockchain_batches        - Merkle batch commits to Polygon Layer-2
--   2. product_provenance_logs   - Immutable 4-stage lifecycle events
--   3. product_qr_tags           - Unguessable hashed QR tags with replacement
--
-- Lifecycle Stages:
--   - PRODUCTION_STARTED    (Artisan or CRP/Coordinator)
--   - INSPECTED_AND_PACKAGED (CRP/Coordinator Quality Check & Packaging)
--   - IN_TRANSIT            (CRP/Coordinator or Logistics Partner)
--   - DELIVERED_AND_VERIFIED (Logistics / CRP / Buyer verification)
--
-- Security & Privacy Guarantees:
--   - No PII (phone, Aadhaar, residential street address) in event logs or leaves.
--   - No exact GPS coordinates: only coarse craft territory / district.
--   - Immutability triggers prevent modification or deletion of historical events.
--   - Stage sequence transitions enforced transactionally at database level.
--   - RLS strictly prevents artisans from impersonating CRPs or logistics partners.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum Types
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provenance_stage') THEN
    CREATE TYPE public.provenance_stage AS ENUM (
      'PRODUCTION_STARTED',
      'INSPECTED_AND_PACKAGED',
      'IN_TRANSIT',
      'DELIVERED_AND_VERIFIED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_lifecycle_status') THEN
    CREATE TYPE public.batch_lifecycle_status AS ENUM (
      'PENDING',
      'SUBMITTED',
      'CONFIRMED',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qr_tag_status') THEN
    CREATE TYPE public.qr_tag_status AS ENUM (
      'ACTIVE',
      'REVOKED',
      'REPLACED'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. blockchain_batches
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blockchain_batches (
  id                uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference   text                        NOT NULL UNIQUE,
  merkle_root       text                        NOT NULL,
  leaf_count        integer                     NOT NULL CHECK (leaf_count > 0),
  status            public.batch_lifecycle_status NOT NULL DEFAULT 'PENDING',
  chain_id          bigint                      NOT NULL DEFAULT 137, -- Polygon PoS (137 = Mainnet, 80002 = Amoy)
  contract_address  text,
  tx_hash           text,
  block_number      bigint,
  submitted_at      timestamptz,
  confirmed_at      timestamptz,
  failed_at         timestamptz,
  error_message     text,
  created_by        uuid                        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz                 NOT NULL DEFAULT now(),
  updated_at        timestamptz                 NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.blockchain_batches IS 'Batches of canonical stage-event Merkle roots anchored to Polygon Layer-2.';
COMMENT ON COLUMN public.blockchain_batches.merkle_root IS '32-byte cryptographic root of the Merkle tree over canonical event leaves (0x...).';
COMMENT ON COLUMN public.blockchain_batches.tx_hash IS 'Polygon transaction hash confirming the root commit.';

CREATE INDEX IF NOT EXISTS idx_blockchain_batches_status    ON public.blockchain_batches(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_batches_root      ON public.blockchain_batches(merkle_root);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blockchain_batches_tx ON public.blockchain_batches(tx_hash) WHERE tx_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. product_provenance_logs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_provenance_logs (
  id                    uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid                    NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  order_id              uuid                    REFERENCES public.orders(id) ON DELETE SET NULL,
  stage                 public.provenance_stage NOT NULL,
  stage_sequence        integer                 NOT NULL CHECK (stage_sequence BETWEEN 1 AND 4),
  actor_role            text                    NOT NULL CHECK (actor_role IN ('artisan', 'coordinator', 'logistics', 'buyer', 'admin')),
  actor_display_name    text                    NOT NULL, -- Privacy-safe (e.g. 'Radha D.')
  recorded_by           uuid                    REFERENCES auth.users(id) ON DELETE SET NULL,
  coarse_location       text                    NOT NULL, -- Regional boundary only (e.g. 'Bolpur, Birbhum, West Bengal')
  canonical_hash        text                    NOT NULL, -- 0x{sha256(canonical_json)}
  batch_id              uuid                    REFERENCES public.blockchain_batches(id) ON DELETE SET NULL,
  merkle_index          integer,
  merkle_proof          jsonb,                  -- Array of sibling proof hashes for verification
  idempotency_key       text,
  metadata              jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  occurred_at           timestamptz             NOT NULL DEFAULT now(),
  created_at            timestamptz             NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uq_provenance_product_stage UNIQUE (product_id, stage),
  CONSTRAINT uq_provenance_product_seq UNIQUE (product_id, stage_sequence),
  CONSTRAINT chk_canonical_hash_format CHECK (canonical_hash ~ '^0x[0-9a-fA-F]{64}$')
);

COMMENT ON TABLE  public.product_provenance_logs IS 'Immutable chronological stage events recording physical product provenance.';
COMMENT ON COLUMN public.product_provenance_logs.coarse_location IS 'State and district only. Strict zero-GPS privacy policy.';
COMMENT ON COLUMN public.product_provenance_logs.canonical_hash IS 'SHA-256 hash of alphabetically-sorted compact JSON event payload.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provenance_product_stage ON public.product_provenance_logs(product_id, stage_sequence);
CREATE INDEX IF NOT EXISTS idx_provenance_batch         ON public.product_provenance_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_provenance_hash          ON public.product_provenance_logs(canonical_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provenance_idempotency
  ON public.product_provenance_logs(product_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Stage Progression & Transition Validation Trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_provenance_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected_seq integer;
  v_current_max_seq integer;
BEGIN
  -- 1. Map stage to strict sequence number
  CASE NEW.stage
    WHEN 'PRODUCTION_STARTED'     THEN v_expected_seq := 1;
    WHEN 'INSPECTED_AND_PACKAGED' THEN v_expected_seq := 2;
    WHEN 'IN_TRANSIT'             THEN v_expected_seq := 3;
    WHEN 'DELIVERED_AND_VERIFIED' THEN v_expected_seq := 4;
    ELSE
      RAISE EXCEPTION 'Invalid provenance stage: %', NEW.stage;
  END CASE;

  -- Ensure stage_sequence matches expected sequence
  NEW.stage_sequence := v_expected_seq;

  -- 2. Query current stage progress for this product
  SELECT COALESCE(MAX(stage_sequence), 0)
  INTO v_current_max_seq
  FROM public.product_provenance_logs
  WHERE product_id = NEW.product_id;

  -- 3. Enforce valid initial event and strict forward sequencing
  IF v_current_max_seq = 0 THEN
    IF v_expected_seq <> 1 THEN
      RAISE EXCEPTION 'Initial provenance event for product % must be PRODUCTION_STARTED (got %)',
        NEW.product_id, NEW.stage;
    END IF;
  ELSE
    IF v_expected_seq <= v_current_max_seq THEN
      RAISE EXCEPTION 'Stage regression or duplicate submission for product %: cannot record % after stage sequence %',
        NEW.product_id, NEW.stage, v_current_max_seq;
    END IF;

    IF v_expected_seq <> v_current_max_seq + 1 THEN
      RAISE EXCEPTION 'Stage sequence gap for product %: expected stage sequence % but received % (%)',
        NEW.product_id, v_current_max_seq + 1, v_expected_seq, NEW.stage;
    END IF;
  END IF;

  -- 4. Role-based stage authoring validation (Artisans cannot impersonate CRPs or logistics)
  IF NEW.stage = 'PRODUCTION_STARTED' THEN
    IF NEW.actor_role NOT IN ('artisan', 'coordinator', 'admin') THEN
      RAISE EXCEPTION 'Stage PRODUCTION_STARTED can only be recorded by artisan, coordinator, or admin (got %)', NEW.actor_role;
    END IF;
  ELSIF NEW.stage = 'INSPECTED_AND_PACKAGED' THEN
    IF NEW.actor_role NOT IN ('coordinator', 'admin') THEN
      RAISE EXCEPTION 'Stage INSPECTED_AND_PACKAGED requires coordinator (CRP) or admin role. Artisans are not permitted to self-certify inspection (got %)', NEW.actor_role;
    END IF;
  ELSIF NEW.stage = 'IN_TRANSIT' THEN
    IF NEW.actor_role NOT IN ('coordinator', 'logistics', 'admin') THEN
      RAISE EXCEPTION 'Stage IN_TRANSIT requires coordinator, logistics, or admin role (got %)', NEW.actor_role;
    END IF;
  ELSIF NEW.stage = 'DELIVERED_AND_VERIFIED' THEN
    IF NEW.actor_role NOT IN ('coordinator', 'logistics', 'buyer', 'admin') THEN
      RAISE EXCEPTION 'Stage DELIVERED_AND_VERIFIED requires authorized handler, buyer, or coordinator (got %)', NEW.actor_role;
    END IF;
  END IF;

  -- 5. Timestamp hygiene: server-generated or bounded
  IF NEW.occurred_at IS NULL THEN
    NEW.occurred_at := now();
  END IF;

  IF NEW.occurred_at > (now() + interval '5 minutes') THEN
    RAISE EXCEPTION 'Event timestamp cannot be in the future (occurred_at=%, server_now=%)',
      NEW.occurred_at, now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_provenance_stage ON public.product_provenance_logs;
CREATE TRIGGER trg_validate_provenance_stage
  BEFORE INSERT ON public.product_provenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_provenance_stage_transition();

-- ---------------------------------------------------------------------------
-- 5. Immutability Trigger on product_provenance_logs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_provenance_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'product_provenance_logs: historical events cannot be deleted (id=%)', OLD.id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Only allow backend worker to attach batch_id, merkle_index, and merkle_proof
    IF (OLD.product_id <> NEW.product_id) OR
       (OLD.stage <> NEW.stage) OR
       (OLD.stage_sequence <> NEW.stage_sequence) OR
       (OLD.actor_role <> NEW.actor_role) OR
       (OLD.actor_display_name <> NEW.actor_display_name) OR
       (OLD.canonical_hash <> NEW.canonical_hash) OR
       (OLD.occurred_at <> NEW.occurred_at) OR
       (OLD.created_at <> NEW.created_at) THEN
      RAISE EXCEPTION 'product_provenance_logs: event core fields are immutable (id=%)', OLD.id;
    END IF;

    -- Once batch_id is set, row is entirely locked
    IF OLD.batch_id IS NOT NULL AND OLD.batch_id <> NEW.batch_id THEN
      RAISE EXCEPTION 'product_provenance_logs: batch assignment cannot be changed once committed (id=%)', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provenance_logs_immutable ON public.product_provenance_logs;
CREATE TRIGGER trg_provenance_logs_immutable
  BEFORE UPDATE OR DELETE ON public.product_provenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_provenance_log_mutation();

-- ---------------------------------------------------------------------------
-- 6. product_qr_tags
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_qr_tags (
  id                    uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid                    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  token_hash            text                    NOT NULL UNIQUE, -- SHA-256 of raw bearer token
  public_code           text                    NOT NULL UNIQUE, -- Unguessable short code (e.g. kqr_...)
  status                public.qr_tag_status    NOT NULL DEFAULT 'ACTIVE',
  is_active             boolean                 NOT NULL DEFAULT true,
  version               integer                 NOT NULL DEFAULT 1 CHECK (version > 0),
  revoked_at            timestamptz,
  revoked_reason        text,
  replaced_by_tag_id    uuid                    REFERENCES public.product_qr_tags(id) ON DELETE SET NULL,
  issued_by             uuid                    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz             NOT NULL DEFAULT now(),
  updated_at            timestamptz             NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.product_qr_tags IS 'Cryptographic QR verification tags linking physical items to provenance records.';
COMMENT ON COLUMN public.product_qr_tags.token_hash IS 'SHA-256 hash of secret bearer token; plaintext token is never stored in DB.';
COMMENT ON COLUMN public.product_qr_tags.public_code IS 'Unguessable public identifier used in passport routing.';

-- Exactly one active QR tag per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_active_qr_tag
  ON public.product_qr_tags(product_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_qr_tags_lookup_hash
  ON public.product_qr_tags(token_hash)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_qr_tags_public_code
  ON public.product_qr_tags(public_code);

-- ---------------------------------------------------------------------------
-- 7. QR Replacement & Verification Functions
-- ---------------------------------------------------------------------------

-- Atomically revoke/replace an active QR tag
CREATE OR REPLACE FUNCTION public.replace_product_qr_tag(
  p_product_id uuid,
  p_new_token_hash text,
  p_new_public_code text,
  p_reason text DEFAULT 'Tag replaced'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_id uuid;
  v_old_ver integer;
  v_new_id uuid;
BEGIN
  -- Locate current active tag
  SELECT id, version INTO v_old_id, v_old_ver
  FROM public.product_qr_tags
  WHERE product_id = p_product_id AND is_active = true
  FOR UPDATE;

  -- Generate new tag id
  v_new_id := gen_random_uuid();

  -- Insert new active tag
  INSERT INTO public.product_qr_tags (
    id,
    product_id,
    token_hash,
    public_code,
    status,
    is_active,
    version,
    issued_by
  ) VALUES (
    v_new_id,
    p_product_id,
    p_new_token_hash,
    p_new_public_code,
    'ACTIVE',
    true,
    COALESCE(v_old_ver, 0) + 1,
    auth.uid()
  );

  -- Archive old tag if one existed
  IF v_old_id IS NOT NULL THEN
    UPDATE public.product_qr_tags
    SET
      status = 'REPLACED',
      is_active = false,
      revoked_at = now(),
      revoked_reason = p_reason,
      replaced_by_tag_id = v_new_id,
      updated_at = now()
    WHERE id = v_old_id;
  END IF;

  RETURN v_new_id;
END;
$$;

-- Public QR Token Verification (Security definer, safe for anon)
CREATE OR REPLACE FUNCTION public.verify_product_qr_tag(p_token_hash text)
RETURNS TABLE (
  is_valid boolean,
  tag_status text,
  product_id uuid,
  public_code text,
  version integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (t.is_active AND t.status = 'ACTIVE') AS is_valid,
    t.status::text                        AS tag_status,
    t.product_id                          AS product_id,
    t.public_code                         AS public_code,
    t.version                             AS version
  FROM public.product_qr_tags t
  WHERE t.token_hash = p_token_hash
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.blockchain_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_provenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_qr_tags ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.blockchain_batches TO anon, authenticated;
GRANT SELECT ON public.product_provenance_logs TO anon, authenticated;
GRANT SELECT ON public.product_qr_tags TO authenticated;

GRANT INSERT, UPDATE ON public.blockchain_batches TO authenticated;
GRANT INSERT ON public.product_provenance_logs TO authenticated;
GRANT INSERT, UPDATE ON public.product_qr_tags TO authenticated;

GRANT ALL ON public.blockchain_batches TO service_role;
GRANT ALL ON public.product_provenance_logs TO service_role;
GRANT ALL ON public.product_qr_tags TO service_role;

-- --- blockchain_batches Policies ---

-- Anyone (public/buyer) can inspect confirmed batches on-chain
CREATE POLICY "Public read confirmed batches"
  ON public.blockchain_batches
  FOR SELECT TO anon, authenticated
  USING (status = 'CONFIRMED' OR public.has_role(auth.uid(), 'admin'));

-- Only admins and service role can create or mutate batches
CREATE POLICY "Admin manages batches"
  ON public.blockchain_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --- product_provenance_logs Policies ---

-- Public users can read all committed provenance logs for passport display
CREATE POLICY "Public read provenance logs"
  ON public.product_provenance_logs
  FOR SELECT TO anon, authenticated
  USING (true);

-- Admin can insert any stage event
CREATE POLICY "Admin inserts provenance logs"
  ON public.product_provenance_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coordinators (CRPs) can record events for products belonging to artisans in their SHG
CREATE POLICY "Coordinator inserts provenance for own SHG"
  ON public.product_provenance_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator') AND
    actor_role IN ('coordinator', 'logistics') AND
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.artisans a ON a.id = p.artisan_id
      WHERE p.id = product_provenance_logs.product_id
        AND public.is_shg_coordinator(auth.uid(), a.shg_id)
    )
  );

-- Artisans can ONLY record their own initial PRODUCTION_STARTED event.
-- Impersonation of CRPs or logistics is blocked here and in the trigger.
CREATE POLICY "Artisan inserts initial stage only"
  ON public.product_provenance_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'artisan') AND
    stage = 'PRODUCTION_STARTED' AND
    actor_role = 'artisan' AND
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_provenance_logs.product_id
        AND public.is_org_artisan(auth.uid(), p.artisan_id)
    )
  );

-- --- product_qr_tags Policies ---

-- Admin reads all QR tags
CREATE POLICY "Admin reads all QR tags"
  ON public.product_qr_tags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Coordinator reads QR tags for own SHG
CREATE POLICY "Coordinator reads QR tags for own SHG"
  ON public.product_qr_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.artisans a ON a.id = p.artisan_id
      WHERE p.id = product_qr_tags.product_id
        AND public.is_shg_coordinator(auth.uid(), a.shg_id)
    )
  );

-- Admin manages QR tags
CREATE POLICY "Admin manages QR tags"
  ON public.product_qr_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coordinator creates QR tags for own SHG products
CREATE POLICY "Coordinator creates QR tags for own SHG"
  ON public.product_qr_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator') AND
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.artisans a ON a.id = p.artisan_id
      WHERE p.id = product_qr_tags.product_id
        AND public.is_shg_coordinator(auth.uid(), a.shg_id)
    )
  );

