-- UPI ID for a self-help group (entered once by the coordinator in demonstration mode)
ALTER TABLE public.shgs ADD COLUMN upi_id text;

-- Payment records: customer payments against an order and payouts to an artisan.
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  shg_id uuid REFERENCES public.shgs(id) ON DELETE SET NULL,
  artisan_id uuid REFERENCES public.artisans(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'customer_payment',
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'upi_qr',
  status text NOT NULL DEFAULT 'recorded',
  upi_reference text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT ON public.payments TO anon;
GRANT ALL ON public.payments TO service_role;

-- Immutable event log per order: the downloadable "contract" of every step.
CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT SELECT, INSERT ON public.order_events TO anon;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Demonstration mode: anon may read and append (matches the existing demo-writes policy pattern).
CREATE POLICY "Demo: anyone can read payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can record payments" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo: anyone can read order events" ON public.order_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can append order events" ON public.order_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Backfill the event log from existing demonstration orders and assignments.
INSERT INTO public.order_events (order_id, event_type, note, created_at)
SELECT id, 'placed', 'Order placed (demonstration record)', created_at
FROM public.orders;

INSERT INTO public.order_events (order_id, event_type, note, created_at)
SELECT a.order_id, 'assigned', 'Assigned to ' || ar.name, a.assigned_at
FROM public.order_assignments a
JOIN public.artisans ar ON ar.id = a.artisan_id;

INSERT INTO public.order_events (order_id, event_type, note, created_at)
SELECT id, 'delivered', 'Marked delivered (demonstration record)', now()
FROM public.orders WHERE status = 'delivered';
