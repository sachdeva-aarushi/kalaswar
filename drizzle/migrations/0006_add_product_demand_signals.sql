-- Demand-informed planning: distinct recorded signals per product (views, saves, enquiries).
-- Purchases are already recorded as orders; signals add the softer demand evidence.
-- DEMONSTRATION MODE: anon inserts allow the public product page to record views/enquiries
-- without accounts. Before production, scope inserts to verified customer sessions.
create table public.product_signals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  signal_type text not null check (signal_type in ('view','save','enquiry')),
  created_at timestamptz not null default now(),
  recorded_by text not null default 'Customer — demonstration'
);
create index idx_product_signals_product on public.product_signals(product_id, signal_type);
create index idx_product_signals_time on public.product_signals(created_at);

grant select, insert on public.product_signals to anon;
grant select, insert, update, delete on public.product_signals to authenticated;
grant all on public.product_signals to service_role;

alter table public.product_signals enable row level security;
create policy "Demo: anyone can read demand signals" on public.product_signals for select to anon, authenticated using (true);
create policy "Demo: anyone can record demand signals" on public.product_signals for insert to anon, authenticated with check (true);

COMMENT ON TABLE public.product_signals IS 'Demand-informed planning signals (views/saves/enquiries) — demonstration: anon inserts are labelled demo; production must scope writes to verified sessions';