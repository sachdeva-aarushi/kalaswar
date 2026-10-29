-- The custom-order confirmation journey writes a demonstration order row from the
-- marketplace concierge. Align orders with the other demo-writable tables (products,
-- order_assignments, tips already allow demonstration inserts).
grant insert on public.orders to anon, authenticated;

create policy "Demo insert orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);