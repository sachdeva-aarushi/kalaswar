-- =============================================================================
-- Verification SQL for Migration 0018: Product Provenance & QR Tags
-- =============================================================================
-- Run this against a Supabase database AFTER applying migration 0018.
-- Every block ends with a PASS/FAIL message.
-- Use: psql -f verify_0018_provenance.sql
-- =============================================================================

BEGIN;

-- ── 1. Verify all three tables exist ─────────────────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blockchain_batches'
  )), 'FAIL: blockchain_batches table not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_provenance_logs'
  )), 'FAIL: product_provenance_logs table not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_qr_tags'
  )), 'FAIL: product_qr_tags table not found';

  RAISE NOTICE 'PASS: All three tables exist';
END $$;

-- ── 2. Verify enum types exist ───────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provenance_stage')),
    'FAIL: provenance_stage enum not found';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_lifecycle_status')),
    'FAIL: batch_lifecycle_status enum not found';
  ASSERT (SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qr_tag_status')),
    'FAIL: qr_tag_status enum not found';

  RAISE NOTICE 'PASS: All enum types exist';
END $$;

-- ── 3. Verify RLS is enabled on all three tables ─────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT relrowsecurity FROM pg_class
    WHERE relname = 'blockchain_batches' AND relnamespace = 'public'::regnamespace
  ), 'FAIL: RLS not enabled on blockchain_batches';

  ASSERT (
    SELECT relrowsecurity FROM pg_class
    WHERE relname = 'product_provenance_logs' AND relnamespace = 'public'::regnamespace
  ), 'FAIL: RLS not enabled on product_provenance_logs';

  ASSERT (
    SELECT relrowsecurity FROM pg_class
    WHERE relname = 'product_qr_tags' AND relnamespace = 'public'::regnamespace
  ), 'FAIL: RLS not enabled on product_qr_tags';

  RAISE NOTICE 'PASS: RLS enabled on all three tables';
END $$;

-- ── 4. Verify triggers exist ─────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_validate_provenance_stage'
      AND tgrelid = 'public.product_provenance_logs'::regclass
  )), 'FAIL: stage validation trigger not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_provenance_logs_immutable'
      AND tgrelid = 'public.product_provenance_logs'::regclass
  )), 'FAIL: immutability trigger not found';

  RAISE NOTICE 'PASS: Both triggers exist';
END $$;

-- ── 5. Verify security-definer functions exist ───────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'validate_provenance_stage_transition'
  )), 'FAIL: validate_provenance_stage_transition function not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'prevent_provenance_log_mutation'
  )), 'FAIL: prevent_provenance_log_mutation function not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'replace_product_qr_tag'
  )), 'FAIL: replace_product_qr_tag function not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'verify_product_qr_tag'
  )), 'FAIL: verify_product_qr_tag function not found';

  RAISE NOTICE 'PASS: All security-definer functions exist';
END $$;

-- ── 6. Verify unique indexes exist ───────────────────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_provenance_idempotency'
  )), 'FAIL: idempotency index not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_product_active_qr_tag'
  )), 'FAIL: active QR tag unique index not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_blockchain_batches_tx'
  )), 'FAIL: blockchain batch tx unique index not found';

  RAISE NOTICE 'PASS: All unique indexes exist';
END $$;

-- ── 7. Verify RLS policy count ───────────────────────────────────────────────

DO $$
DECLARE
  v_batch_policies integer;
  v_provenance_policies integer;
  v_qr_policies integer;
BEGIN
  SELECT count(*) INTO v_batch_policies
  FROM pg_policies WHERE tablename = 'blockchain_batches' AND schemaname = 'public';

  SELECT count(*) INTO v_provenance_policies
  FROM pg_policies WHERE tablename = 'product_provenance_logs' AND schemaname = 'public';

  SELECT count(*) INTO v_qr_policies
  FROM pg_policies WHERE tablename = 'product_qr_tags' AND schemaname = 'public';

  ASSERT v_batch_policies >= 2,
    format('FAIL: Expected >= 2 policies on blockchain_batches, found %s', v_batch_policies);
  ASSERT v_provenance_policies >= 3,
    format('FAIL: Expected >= 3 policies on product_provenance_logs, found %s', v_provenance_policies);
  ASSERT v_qr_policies >= 4,
    format('FAIL: Expected >= 4 policies on product_qr_tags, found %s', v_qr_policies);

  RAISE NOTICE 'PASS: Policy counts OK (batches=%, provenance=%, qr=%)',
    v_batch_policies, v_provenance_policies, v_qr_policies;
END $$;

-- ── 8. Verify canonical_hash format constraint ──────────────────────────────

DO $$
BEGIN
  -- This should succeed (valid hash format is checked by the CHECK constraint)
  -- We verify the constraint exists rather than inserting test data
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_canonical_hash_format'
  )), 'FAIL: canonical_hash format constraint not found';

  RAISE NOTICE 'PASS: canonical_hash CHECK constraint exists';
END $$;

-- ── 9. Verify foreign key relationships ──────────────────────────────────────

DO $$
DECLARE
  v_fk_count integer;
BEGIN
  SELECT count(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
    AND table_name IN ('product_provenance_logs', 'product_qr_tags', 'blockchain_batches');

  -- product_provenance_logs: product_id, order_id, recorded_by, batch_id = 4 FKs
  -- product_qr_tags: product_id, replaced_by_tag_id, issued_by = 3 FKs
  -- blockchain_batches: created_by = 1 FK
  ASSERT v_fk_count >= 8,
    format('FAIL: Expected >= 8 foreign keys across provenance tables, found %s', v_fk_count);

  RAISE NOTICE 'PASS: Foreign key count OK (found %)', v_fk_count;
END $$;

-- ── 10. Verify unique constraints on provenance ──────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'uq_provenance_product_stage'
      AND table_name = 'product_provenance_logs'
  )), 'FAIL: uq_provenance_product_stage constraint not found';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'uq_provenance_product_seq'
      AND table_name = 'product_provenance_logs'
  )), 'FAIL: uq_provenance_product_seq constraint not found';

  RAISE NOTICE 'PASS: Unique constraints on provenance logs exist';
END $$;

RAISE NOTICE '══════════════════════════════════════════════════════════════';
RAISE NOTICE 'ALL MIGRATION 0018 VERIFICATION CHECKS PASSED';
RAISE NOTICE '══════════════════════════════════════════════════════════════';

ROLLBACK; -- Verification only, do not commit

