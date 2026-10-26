-- Demonstration mode: the coordinator records each collective's monthly capacity
-- from the workspace so MakePossible feasibility checks use live figures.
-- Before production this must become an authenticated coordinator write (update scoped to the coordinator's own collective).
grant update (monthly_capacity) on public.shgs to anon, authenticated;

create policy "Demo: coordinator records collective monthly capacity"
  on public.shgs
  for update
  to anon, authenticated
  using (true)
  with check (true);

COMMENT ON POLICY "Demo: coordinator records collective monthly capacity" ON public.shgs IS 'Demonstration-mode capacity recording; production must scope updates to the signed-in coordinator''s own collective';