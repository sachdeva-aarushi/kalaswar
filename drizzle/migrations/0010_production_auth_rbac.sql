-- ============ Production auth + RBAC (additive; demo-mode policies retained) ============

-- Buyer role for the B2B Studio
alter type public.app_role add value if not exists 'buyer';

-- Profiles: language preference and onboarding status
alter table public.profiles add column if not exists preferred_language text not null default 'en';
alter table public.profiles add column if not exists onboarding_status text not null default 'pending';
alter table public.profiles add column if not exists updated_at timestamptz;

-- Buyers link to an authenticated account (nullable during demonstration)
alter table public.buyers add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists buyers_user_id_uq on public.buyers(user_id) where user_id is not null;

-- Signup trigger: profile with language; roles limited to customer/buyer from signup metadata.
-- coordinator/artisan/admin roles are never granted from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lang text := lower(coalesce(new.raw_user_meta_data->>'preferred_language', 'en'));
  v_role public.app_role := 'customer';
begin
  if v_lang not in ('en','hi','mr') then
    v_lang := 'en';
  end if;
  if new.raw_user_meta_data->>'account_type' = 'buyer' then
    v_role := 'buyer';
  end if;
  insert into public.profiles (id, display_name, preferred_language)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            v_lang)
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, v_role) on conflict do nothing;
  return new;
end;
$$;

-- Membership helpers (security definer, no recursion)
create or replace function public.is_shg_coordinator(_user_id uuid, _shg_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles r
    join public.group_memberships m on m.user_id = r.user_id
    where r.user_id = _user_id
      and r.role = 'coordinator'
      and m.shg_id = _shg_id
      and m.member_role = 'coordinator'
  )
$$;

create or replace function public.owns_buyer(_user_id uuid, _buyer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.buyers b
    where b.id = _buyer_id and b.user_id = _user_id
  )
$$;

create or replace function public.is_org_artisan(_user_id uuid, _artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_memberships m
    where m.user_id = _user_id and m.artisan_id = _artisan_id
  )
$$;

-- ============ Authenticated grants ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_price_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cost_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cost_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.craft_stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_memberships TO authenticated;

-- ============ Production-scoped policies (authenticated) ============

-- Buyers: own organisation only
create policy "Buyers manage own organisation" on public.buyers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Buyer requests: own buyer organisation
create policy "Buyer requests of own organisation" on public.buyer_requests
  for all to authenticated
  using (exists (select 1 from public.buyers b where b.id = buyer_requests.buyer_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.buyers b where b.id = buyer_requests.buyer_id and b.user_id = auth.uid()));

-- Quotations
create policy "Coordinators manage quotations for own SHG" on public.quotations
  for all to authenticated
  using (public.is_shg_coordinator(auth.uid(), shg_id))
  with check (public.is_shg_coordinator(auth.uid(), shg_id));
create policy "Buyers read quotations shared with them" on public.quotations
  for select to authenticated
  using (exists (
    select 1 from public.buyer_requests br
    join public.buyers b on b.id = br.buyer_id
    where br.id = quotations.buyer_request_id and b.user_id = auth.uid()
  ));

-- Quotation versions follow their quotation
create policy "Coordinators manage versions of own quotations" on public.quotation_versions
  for all to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_versions.quotation_id and public.is_shg_coordinator(auth.uid(), q.shg_id)))
  with check (exists (select 1 from public.quotations q where q.id = quotation_versions.quotation_id and public.is_shg_coordinator(auth.uid(), q.shg_id)));
create policy "Buyers read versions of shared quotations" on public.quotation_versions
  for select to authenticated
  using (exists (
    select 1 from public.quotations q
    join public.buyer_requests br on br.id = q.buyer_request_id
    join public.buyers b on b.id = br.buyer_id
    where q.id = quotation_versions.quotation_id and b.user_id = auth.uid()
  ));

-- Samples and sample events
create policy "Coordinators manage samples for own SHG" on public.sample_requests
  for all to authenticated
  using (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id))
  with check (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id));
create policy "Buyers read their samples" on public.sample_requests
  for select to authenticated
  using (public.owns_buyer(auth.uid(), buyer_id));
create policy "Sample events follow sample access" on public.sample_events
  for all to authenticated
  using (exists (
    select 1 from public.sample_requests s
    where s.id = sample_events.sample_id
      and ((s.shg_id is not null and public.is_shg_coordinator(auth.uid(), s.shg_id))
           or public.owns_buyer(auth.uid(), s.buyer_id))
  ))
  with check (exists (
    select 1 from public.sample_requests s
    where s.id = sample_events.sample_id
      and ((s.shg_id is not null and public.is_shg_coordinator(auth.uid(), s.shg_id))
           or public.owns_buyer(auth.uid(), s.buyer_id))
  ));

-- Orders and their children (coordinator scope via product -> artisan -> SHG)
create policy "Coordinators manage orders of own SHG" on public.orders
  for all to authenticated
  using (exists (
    select 1 from public.products p
    join public.artisans a on a.id = p.artisan_id
    where p.id = orders.product_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.products p
    join public.artisans a on a.id = p.artisan_id
    where p.id = orders.product_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));
create policy "Buyers read their own orders" on public.orders
  for select to authenticated
  using (exists (
    select 1 from public.buyer_requests br
    join public.buyers b on b.id = br.buyer_id
    where br.id = orders.buyer_request_id and b.user_id = auth.uid()
  ));

create policy "Order events follow order access" on public.order_events
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = order_events.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ) or exists (
    select 1 from public.orders o
    join public.buyer_requests br on br.id = o.buyer_request_id
    join public.buyers b on b.id = br.buyer_id
    where o.id = order_events.order_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = order_events.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

create policy "Payments for own SHG" on public.payments
  for all to authenticated
  using (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id))
  with check (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id));
create policy "Expenses for own SHG" on public.expenses
  for all to authenticated
  using (public.is_shg_coordinator(auth.uid(), shg_id))
  with check (public.is_shg_coordinator(auth.uid(), shg_id));

create policy "Inventory for own SHG" on public.materials_inventory
  for all to authenticated
  using (public.is_shg_coordinator(auth.uid(), shg_id))
  with check (public.is_shg_coordinator(auth.uid(), shg_id));
create policy "Material price history for own SHG" on public.material_price_history
  for all to authenticated
  using (public.is_shg_coordinator(auth.uid(), shg_id))
  with check (public.is_shg_coordinator(auth.uid(), shg_id));

create policy "Cost inputs via product SHG" on public.product_cost_inputs
  for all to authenticated
  using (exists (
    select 1 from public.products p
    join public.artisans a on a.id = p.artisan_id
    where p.id = product_cost_inputs.product_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.products p
    join public.artisans a on a.id = p.artisan_id
    where p.id = product_cost_inputs.product_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));
create policy "Cost snapshots via product SHG" on public.product_cost_snapshots
  for all to authenticated
  using (exists (
    select 1 from public.products p
    join public.artisans a on a.id = p.artisan_id
    where p.id = product_cost_snapshots.product_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.products p
    join public.artisans a on a.id = p.artisan_id
    where p.id = product_cost_snapshots.product_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

create policy "Assignments via order SHG" on public.order_assignments
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = order_assignments.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ) or public.is_org_artisan(auth.uid(), order_assignments.artisan_id))
  with check (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = order_assignments.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

create policy "Quality checks via order SHG" on public.quality_checks
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = quality_checks.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = quality_checks.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

create policy "Shipments via order SHG" on public.shipments
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = shipments.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = shipments.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));
create policy "Shipment events follow shipment access" on public.shipment_events
  for all to authenticated
  using (exists (
    select 1 from public.shipments s
    join public.orders o on o.id = s.order_id
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where s.id = shipment_events.shipment_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.shipments s
    join public.orders o on o.id = s.order_id
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where s.id = shipment_events.shipment_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

create policy "Production plans via order SHG" on public.production_plans
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = production_plans.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.orders o
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where o.id = production_plans.order_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));
create policy "Production events follow plan access" on public.production_events
  for all to authenticated
  using (exists (
    select 1 from public.production_plans pp
    join public.orders o on o.id = pp.order_id
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where pp.id = production_events.plan_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ))
  with check (exists (
    select 1 from public.production_plans pp
    join public.orders o on o.id = pp.order_id
    join public.products p on p.id = o.product_id
    join public.artisans a on a.id = p.artisan_id
    where pp.id = production_events.plan_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

create policy "Custom requests for own SHG" on public.custom_requests
  for all to authenticated
  using (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id))
  with check (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id));
create policy "Proposals for own SHG" on public.proposals
  for all to authenticated
  using (exists (
    select 1 from public.custom_requests cr
    where cr.id = proposals.request_id and cr.shg_id is not null and public.is_shg_coordinator(auth.uid(), cr.shg_id)
  ))
  with check (exists (
    select 1 from public.custom_requests cr
    where cr.id = proposals.request_id and cr.shg_id is not null and public.is_shg_coordinator(auth.uid(), cr.shg_id)
  ));
create policy "Proposal approvals via request SHG" on public.proposal_approvals
  for all to authenticated
  using (exists (
    select 1 from public.proposals pr
    join public.custom_requests cr on cr.id = pr.request_id
    where pr.id = proposal_approvals.proposal_id and cr.shg_id is not null and public.is_shg_coordinator(auth.uid(), cr.shg_id)
  ))
  with check (exists (
    select 1 from public.proposals pr
    join public.custom_requests cr on cr.id = pr.request_id
    where pr.id = proposal_approvals.proposal_id and cr.shg_id is not null and public.is_shg_coordinator(auth.uid(), cr.shg_id)
  ));

-- Tips: coordinator sees tips paid to own SHG artisans
create policy "Tips via artisan SHG" on public.tips
  for select to authenticated
  using (exists (
    select 1 from public.artisans a
    where a.id = tips.artisan_id and public.is_shg_coordinator(auth.uid(), a.shg_id)
  ));

-- Craft stories: maker and coordinator access to drafts
create policy "Artisans manage own stories" on public.craft_stories
  for all to authenticated
  using (artisan_id is not null and public.is_org_artisan(auth.uid(), artisan_id))
  with check (artisan_id is not null and public.is_org_artisan(auth.uid(), artisan_id));
create policy "Coordinators manage stories of own SHG" on public.craft_stories
  for all to authenticated
  using (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id))
  with check (shg_id is not null and public.is_shg_coordinator(auth.uid(), shg_id));

-- Product drafts: owning artisan
create policy "Artisans manage own product drafts" on public.product_drafts
  for all to authenticated
  using (public.is_org_artisan(auth.uid(), artisan_id))
  with check (public.is_org_artisan(auth.uid(), artisan_id));

-- Notifications: scoped by audience
create policy "Coordinator notifications" on public.notifications
  for select to authenticated
  using (audience = 'coordinator' and audience_ref in (
    select m.shg_id::text from public.group_memberships m
    where m.user_id = auth.uid() and m.member_role = 'coordinator'
  ));
create policy "Buyer notifications" on public.notifications
  for select to authenticated
  using (audience = 'buyer' and audience_ref in (
    select b.id::text from public.buyers b where b.user_id = auth.uid()
  ));
create policy "Artisan notifications" on public.notifications
  for select to authenticated
  using (audience = 'artisan' and audience_ref in (
    select m.artisan_id::text from public.group_memberships m
    where m.user_id = auth.uid() and m.artisan_id is not null
  ));
create policy "Mark own notifications read" on public.notifications
  for update to authenticated
  using (audience = 'coordinator' and audience_ref in (
    select m.shg_id::text from public.group_memberships m
    where m.user_id = auth.uid() and m.member_role = 'coordinator'
  ) or audience = 'buyer' and audience_ref in (
    select b.id::text from public.buyers b where b.user_id = auth.uid()
  ) or audience = 'artisan' and audience_ref in (
    select m.artisan_id::text from public.group_memberships m
    where m.user_id = auth.uid() and m.artisan_id is not null
  ));

COMMENT ON TABLE public.user_roles IS 'Privileged role assignments; rows are created only by the signup trigger (customer/buyer) or by trusted service-role operations.';