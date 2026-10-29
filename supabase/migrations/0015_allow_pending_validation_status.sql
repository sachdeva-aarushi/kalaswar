-- Migration 0015: Allow 'pending_validation' in listing_drafts status check constraint
ALTER TABLE public.listing_drafts
  DROP CONSTRAINT IF EXISTS listing_drafts_status_check;

ALTER TABLE public.listing_drafts
  ADD CONSTRAINT listing_drafts_status_check
  CHECK (status IN ('draft', 'pending_validation', 'pending_review', 'approved', 'rejected', 'published', 'archived'));
