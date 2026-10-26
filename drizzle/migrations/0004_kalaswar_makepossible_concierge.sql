-- Kalaswar: MakePossible feasibility data + Gift Concierge request/proposal workflow
-- + auth scaffolding (profiles, roles, memberships). Demo rows are labelled DEMONSTRATION MODE.

-- ============ Collective capacity ============
alter table public.shgs add column monthly_capacity integer;
COMMENT ON COLUMN public.shgs.monthly_capacity IS 'Pieces the collective can produce per month; null = unknown (MakePossible reports insufficient information)';

-- ============ Auth scaffolding ============
create type public.app_role as enum ('admin', 'coordinator', 'artisan', 'customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- Profile + default role on signup (app-owned trigger on auth lifecycle).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy "Read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- ============ Collective membership (production intent) ============
create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  shg_id uuid not null references public.shgs(id) on delete cascade,
  artisan_id uuid references public.artisans(id) on delete set null,
  member_role text not null default 'coordinator',
  created_at timestamptz not null default now(),
  unique (user_id, shg_id)
);
create index idx_group_memberships_shg on public.group_memberships(shg_id);

-- ============ Skills, materials, craft guidance ============
create table public.artisan_skills (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  skill text not null,
  level text not null default 'core',
  notes text,
  created_at timestamptz not null default now(),
  unique (artisan_id, skill)
);
create index idx_artisan_skills_artisan on public.artisan_skills(artisan_id);

create table public.materials_inventory (
  id uuid primary key default gen_random_uuid(),
  shg_id uuid not null references public.shgs(id) on delete cascade,
  name text not null,
  unit text not null default 'unit',
  quantity numeric not null default 0,
  low_stock_threshold numeric,
  updated_at timestamptz not null default now(),
  updated_by text
);
create index idx_materials_shg on public.materials_inventory(shg_id);

create table public.craft_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  craft text not null,
  category text,
  language text not null default 'en',
  steps jsonb not null default '[]'::jsonb,
  source text not null default 'recorded',
  created_at timestamptz not null default now()
);

-- ============ Gift Concierge: requests, proposals, approvals ============
create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  customer_reference text not null,
  shg_id uuid references public.shgs(id) on delete set null,
  title text not null,
  brief text not null,
  structured jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_custom_requests_shg on public.custom_requests(shg_id);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_requests(id) on delete cascade,
  version integer not null,
  spec jsonb not null default '{}'::jsonb,
  status text not null default 'sent',
  created_by text not null default 'Coordinator — demonstration',
  created_at timestamptz not null default now(),
  unique (request_id, version)
);
create index idx_proposals_request on public.proposals(request_id);

create table public.proposal_approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  approver_role text not null,
  approved_at timestamptz not null default now(),
  unique (proposal_id, approver_role)
);

alter table public.orders add column proposal_id uuid references public.proposals(id);
alter table public.orders add column is_custom boolean not null default false;
COMMENT ON COLUMN public.orders.is_custom IS 'Custom-order confirmation traceable to an approved proposal';

-- ============ Production records ============
create table public.quality_checks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  artisan_id uuid references public.artisans(id) on delete set null,
  result text not null,
  notes text,
  checked_by text,
  checked_at timestamptz not null default now()
);
create index idx_quality_checks_order on public.quality_checks(order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'preparing',
  carrier text,
  tracking_ref text,
  provider text,
  created_at timestamptz not null default now()
);
create index idx_shipments_order on public.shipments(order_id);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_type text not null,
  note text,
  occurred_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shg_id uuid not null references public.shgs(id) on delete cascade,
  artisan_id uuid references public.artisans(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  category text not null,
  amount numeric not null,
  note text,
  recorded_by text,
  recorded_at timestamptz not null default now()
);
create index idx_expenses_shg on public.expenses(shg_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  public_id text not null,
  secure_url text not null,
  purpose text not null default 'product_photo',
  uploaded_by text,
  created_at timestamptz not null default now()
);

create table public.action_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ============ Grants (demo-readable, per project demonstration mode) ============
grant select, insert, update, delete on public.group_memberships, public.artisan_skills,
  public.materials_inventory, public.craft_guides, public.custom_requests, public.proposals,
  public.proposal_approvals, public.quality_checks, public.shipments, public.shipment_events,
  public.expenses, public.media_assets, public.action_audit_logs to anon;
grant select, insert, update, delete on public.group_memberships, public.artisan_skills,
  public.materials_inventory, public.craft_guides, public.custom_requests, public.proposals,
  public.proposal_approvals, public.quality_checks, public.shipments, public.shipment_events,
  public.expenses, public.media_assets, public.action_audit_logs to authenticated;
grant all on public.group_memberships, public.artisan_skills, public.materials_inventory,
  public.craft_guides, public.custom_requests, public.proposals, public.proposal_approvals,
  public.quality_checks, public.shipments, public.shipment_events, public.expenses,
  public.media_assets, public.action_audit_logs to service_role;
grant select, insert, update on public.orders to anon;

alter table public.group_memberships enable row level security;
alter table public.artisan_skills enable row level security;
alter table public.materials_inventory enable row level security;
alter table public.craft_guides enable row level security;
alter table public.custom_requests enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_approvals enable row level security;
alter table public.quality_checks enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.expenses enable row level security;
alter table public.media_assets enable row level security;
alter table public.action_audit_logs enable row level security;

-- DEMONSTRATION MODE: full anon access keeps the guided demo journey working without
-- accounts. Before production, drop these policies and rely on the authenticated,
-- membership-scoped policies documented in docs/ARCHITECTURE.md.
create policy "Demo full access — group memberships" on public.group_memberships for all using (true) with check (true);
create policy "Demo full access — artisan skills" on public.artisan_skills for all using (true) with check (true);
create policy "Demo full access — materials" on public.materials_inventory for all using (true) with check (true);
create policy "Demo full access — craft guides" on public.craft_guides for all using (true) with check (true);
create policy "Demo full access — custom requests" on public.custom_requests for all using (true) with check (true);
create policy "Demo full access — proposals" on public.proposals for all using (true) with check (true);
create policy "Demo full access — proposal approvals" on public.proposal_approvals for all using (true) with check (true);
create policy "Demo full access — quality checks" on public.quality_checks for all using (true) with check (true);
create policy "Demo full access — shipments" on public.shipments for all using (true) with check (true);
create policy "Demo full access — shipment events" on public.shipment_events for all using (true) with check (true);
create policy "Demo full access — expenses" on public.expenses for all using (true) with check (true);
create policy "Demo full access — media assets" on public.media_assets for all using (true) with check (true);
create policy "Demo full access — audit log" on public.action_audit_logs for all using (true) with check (true);

-- ============ DEMONSTRATION RECORDS (labelled demo data) ============
update public.shgs set monthly_capacity = 40 where id = '11111111-1111-1111-1111-111111111111';
update public.shgs set monthly_capacity = 55 where id = '22222222-2222-2222-2222-222222222222';
update public.shgs set monthly_capacity = 30 where id = '33333333-3333-3333-3333-333333333333';

insert into public.group_memberships (shg_id, artisan_id, member_role) values
  ('22222222-2222-2222-2222-222222222222', '22222222-0000-0000-0000-000000000001', 'artisan'),
  ('22222222-2222-2222-2222-222222222222', '22222222-0000-0000-0000-000000000002', 'artisan');

insert into public.artisan_skills (artisan_id, skill, level, notes) values
  ('22222222-0000-0000-0000-000000000001', 'kouna grass weaving', 'core', 'Totes, slings and baskets; three days per large tote'),
  ('22222222-0000-0000-0000-000000000001', 'floral embroidery', 'secondary', null),
  ('22222222-0000-0000-0000-000000000002', 'kouna grass weaving', 'secondary', null),
  ('22222222-0000-0000-0000-000000000002', 'crochet embellishment', 'core', 'Flower motifs and trim finishing'),
  ('11111111-0000-0000-0000-000000000001', 'mithila painting', 'core', 'Kachni and bharni styles, natural pigments'),
  ('11111111-0000-0000-0000-000000000002', 'sikki grass craft', 'core', 'Boxes, ornaments, diamond-knot stitch'),
  ('11111111-0000-0000-0000-000000000003', 'terracotta pottery', 'core', 'Wheel-thrown diyas and matka, open-kiln firing'),
  ('33333333-0000-0000-0000-000000000001', 'aari embroidery', 'core', 'Floral motifs on cotton and silk'),
  ('33333333-0000-0000-0000-000000000001', 'block printing', 'secondary', 'Partner family workshop for print runs');

insert into public.materials_inventory (shg_id, name, unit, quantity, low_stock_threshold, updated_by) values
  ('22222222-2222-2222-2222-222222222222', 'Kouna grass (dried, twisted)', 'kg', 48, 12, 'Coordinator — demonstration'),
  ('22222222-2222-2222-2222-222222222222', 'Cotton lining cloth', 'metre', 30, 10, 'Coordinator — demonstration'),
  ('22222222-2222-2222-2222-222222222222', 'Embroidery thread (assorted)', 'bundle', 22, 8, 'Coordinator — demonstration'),
  ('11111111-1111-1111-1111-111111111111', 'Sikki grass (golden)', 'kg', 9, 4, 'Coordinator — demonstration'),
  ('11111111-1111-1111-1111-111111111111', 'Hand-made paper', 'sheet', 120, 40, 'Coordinator — demonstration'),
  ('11111111-1111-1111-1111-111111111111', 'Natural pigment set', 'set', 6, 2, 'Coordinator — demonstration'),
  ('11111111-1111-1111-1111-111111111111', 'Terracotta clay', 'kg', 65, 20, 'Coordinator — demonstration'),
  ('33333333-3333-3333-3333-333333333333', 'Cotton fabric (wine)', 'metre', 26, 10, 'Coordinator — demonstration'),
  ('33333333-3333-3333-3333-333333333333', 'Aari thread set', 'set', 11, 4, 'Coordinator — demonstration');

insert into public.craft_guides (title, craft, category, language, steps, source) values
  ('Weaving a kouna tote: from reed to handles', 'kouna grass weaving', 'Baskets & Bags', 'en',
   '[{"title":"Prepare the reed","detail":"Split dried kouna into fine strands and twist two strands together for strength."},{"title":"Start the base","detail":"Lay eight twisted strands as the warp and begin a tight over-under weave."},{"title":"Build the walls","detail":"Fold the warp upward and weave the sides, keeping tension even."},{"title":"Braid the handles","detail":"Braid three thick strands per handle and stitch them inside the rim."},{"title":"Finish and dry","detail":"Trim, tuck the ends, and rest the piece in shade for a day."}]'::jsonb,
   'recorded'),
  ('Stitching a sikki jewellery box', 'sikki grass craft', 'Home & Storage', 'en',
   '[{"title":"Soak and split","detail":"Soak golden sikki until pliable, then split into fine blades."},{"title":"The diamond knot","detail":"Coil and stitch blades in the traditional diamond-knot pattern."},{"title":"Shape the lid","detail":"Build the lid slightly proud of the base for a snug fit."}]'::jsonb,
   'recorded'),
  ('Mithila painting: kachni line work', 'mithila painting', 'Paintings & Wall Art', 'en',
   '[{"title":"Grind the pigment","detail":"Lampblack, turmeric and flower juices ground on a household stone."},{"title":"Double-line kachni","detail":"Draw every form twice — two fine lines with hatching between."},{"title":"Fill and border","detail":"Fill with flat colour and finish with a bold running border."}]'::jsonb,
   'recorded'),
  ('Aari embroidery: wildflower motifs', 'aari embroidery', 'Textiles & Table', 'en',
   '[{"title":"Stretch the cloth","detail":"Fix cotton on an adda frame so the tension is drum-tight."},{"title":"The aari hook","detail":"Work chain stitch from the front with the hooked awl."},{"title":"Leaf and petal","detail":"Satin-fill petals, stem-stitch leaves, French-knot centres."}]'::jsonb,
   'recorded');

insert into public.custom_requests (request_code, customer_reference, shg_id, title, brief, structured, status, language) values
  ('KCR-1001', 'Demo customer — Ananya (demonstration)', '22222222-2222-2222-2222-222222222222',
   'Woven wedding favour pouches for a September wedding',
   'I am getting married in September and want 40 small handmade pouches as wedding favours for guests. Something natural, woven, with each guest''s name on it. Our budget is around 550 rupees per pouch and we need them in Pune three weeks before the wedding.',
   '{"occasion":"Wedding favours","recipient":"40 wedding guests","style":"Natural, handwoven, festive","craft_preference":"woven grass","materials":"any natural grass","personalisation":"Each guest''s name, up to 14 characters","quantity":40,"budget_inr_per_unit":550,"deadline_in_days":21,"destination":"Pune, Maharashtra"}'::jsonb,
   'under_review', 'en'),
  ('KCR-1002', 'Demo customer — Rahul (demonstration)', null,
   'Handwoven pashmina stoles for a winter retreat',
   'We need 120 handwoven pashmina stoles in two colours for a corporate winter retreat in December. Budget is 2,500 rupees per stole and we would need them in Manali.',
   '{"occasion":"Corporate retreat gifts","recipient":"120 attendees","style":"Classic two-tone","craft_preference":"pashmina weaving","materials":"pashmina wool","personalisation":"None","quantity":120,"budget_inr_per_unit":2500,"deadline_in_days":45,"destination":"Manali, Himachal Pradesh"}'::jsonb,
   'submitted', 'en');

insert into public.proposals (request_id, version, spec, status) values
  ((select id from public.custom_requests where request_code = 'KCR-1001'), 1,
   '{"name":"Kouna woven favour pouches","description":"Small hand-woven kouna pouches with a woven name tag for each guest, finished with a marigold trim","materials":"Kouna grass, cotton lining, marigold thread","personalisation":"Woven name tag per guest (up to 14 characters) — woven tags hold the deadline better than embroidery","quantity":40,"price_per_unit_inr":650,"currency":"INR","total_inr":26000,"production_days":18,"dispatch_terms":"Dispatch from Bishnupur to Pune via courier partner (demonstration record)","cancellation_terms":"Full cancellation possible until production starts, then material costs only (demonstration record)","changes_from_request":"Price is 650 per pouch against the 550 budget; name tags are woven instead of embroidered to keep the 21-day deadline"}'::jsonb,
   'sent');

insert into public.quality_checks (order_id, artisan_id, result, notes, checked_by) values
  ('20000000-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'passed', 'Weave tension and strap stitching checked on all five baskets', 'Coordinator — demonstration');

insert into public.shipments (order_id, status, carrier, tracking_ref) values
  ('20000000-0000-0000-0000-000000000005', 'preparing', null, null);
insert into public.shipment_events (shipment_id, event_type, note) values
  ((select id from public.shipments where order_id = '20000000-0000-0000-0000-000000000005'), 'packing', 'Five storage baskets packed with straw padding (demonstration record)');

insert into public.expenses (shg_id, artisan_id, order_id, category, amount, note, recorded_by) values
  ('22222222-2222-2222-2222-222222222222', '22222222-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Materials — kouna grass', 1450, 'Grass purchased at the weekly market for the tote order', 'Coordinator — demonstration');
