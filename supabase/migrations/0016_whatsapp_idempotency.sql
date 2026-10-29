-- =============================================================================
-- Migration 0016: WhatsApp Endpoint Idempotency
-- =============================================================================
-- Enforces idempotency across /internal/whatsapp/* endpoints (media, voice, approve).
-- Stores whatsapp_message_id with a unique constraint so duplicate deliveries
-- return the original response instead of creating duplicate listing drafts.
-- =============================================================================

-- 1. Add whatsapp_message_id to listing_drafts with a unique constraint
ALTER TABLE public.listing_drafts
  ADD COLUMN IF NOT EXISTS whatsapp_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_drafts_whatsapp_msg_id
  ON public.listing_drafts(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

COMMENT ON COLUMN public.listing_drafts.whatsapp_message_id IS 'Unique Meta Cloud API or Twilio WhatsApp message ID that initiated this listing draft; prevents duplicate drafts on network retries.';

-- 2. Dedicated idempotency table for all incoming WhatsApp messages & responses
CREATE TABLE IF NOT EXISTS public.whatsapp_incoming_messages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id  text        NOT NULL UNIQUE,
  phone                text        NOT NULL,
  endpoint             text        NOT NULL,
  request_payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  response_payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  listing_draft_id     uuid        REFERENCES public.listing_drafts(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.whatsapp_incoming_messages IS 'Audit and idempotency log for WhatsApp webhook messages. Stores cached response payloads so duplicate deliveries return original results.';
COMMENT ON COLUMN public.whatsapp_incoming_messages.whatsapp_message_id IS 'Unique WhatsApp message ID (e.g. wamid.HBg...); must be globally unique.';

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_phone ON public.whatsapp_incoming_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_created ON public.whatsapp_incoming_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_incoming_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_incoming_messages TO authenticated;
GRANT ALL ON public.whatsapp_incoming_messages TO service_role;

DROP POLICY IF EXISTS "Coordinator reads own SHG incoming whatsapp messages" ON public.whatsapp_incoming_messages;
CREATE POLICY "Coordinator reads own SHG incoming whatsapp messages" ON public.whatsapp_incoming_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_sessions vs
      WHERE vs.whatsapp_phone = whatsapp_incoming_messages.phone
        AND vs.shg_id IS NOT NULL
        AND public.is_shg_coordinator(auth.uid(), vs.shg_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.listing_drafts ld
      WHERE ld.id = whatsapp_incoming_messages.listing_draft_id
        AND ld.shg_id IS NOT NULL
        AND public.is_shg_coordinator(auth.uid(), ld.shg_id)
    )
  );

DROP POLICY IF EXISTS "Admin reads all incoming whatsapp messages" ON public.whatsapp_incoming_messages;
CREATE POLICY "Admin reads all incoming whatsapp messages" ON public.whatsapp_incoming_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
