-- =============================================================================
-- Migration 0013: Add financier role to app_role enum
-- =============================================================================
-- In PostgreSQL, ALTER TYPE ... ADD VALUE must be committed in its own
-- transaction before the new enum value can be referenced in policies, casts,
-- or functions in subsequent migrations (SQLSTATE 55P04).
-- =============================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financier';
