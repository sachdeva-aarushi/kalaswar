-- =============================================================================
-- Migration 0017: Add updated_at column to voice_sessions
-- =============================================================================
-- The trigger trg_voice_sessions_updated_at created in migration 0014 executes
-- public.set_updated_at(), which expects an updated_at column on public.voice_sessions.
-- =============================================================================

ALTER TABLE public.voice_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.voice_sessions.updated_at IS 'Timestamp of last update, automatically maintained by trg_voice_sessions_updated_at trigger.';
