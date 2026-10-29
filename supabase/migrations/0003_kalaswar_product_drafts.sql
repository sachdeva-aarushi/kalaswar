-- Working draft the voice assistant fills in while the artisan speaks details.
CREATE TABLE public.product_drafts (
  artisan_id uuid PRIMARY KEY REFERENCES public.artisans(id) ON DELETE CASCADE,
  name text,
  description text,
  price numeric(10,2),
  category text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_drafts TO anon;
GRANT ALL ON public.product_drafts TO service_role;

ALTER TABLE public.product_drafts ENABLE ROW LEVEL SECURITY;

-- Demonstration mode: the assistant's working draft is app state, open to anon writes.
CREATE POLICY "Demo: anyone can read product drafts" ON public.product_drafts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can write product drafts" ON public.product_drafts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo: anyone can update product drafts" ON public.product_drafts FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can delete product drafts" ON public.product_drafts FOR DELETE TO anon, authenticated USING (true);
