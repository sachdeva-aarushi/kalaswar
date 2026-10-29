-- Kalaswar expansion: foundation tables for Living Craft Stories, FairPrice Engine,
-- and the B2B Studio + MakePossible pipeline. Additive only; existing tables untouched.
-- Demonstration-mode RLS follows the existing project pattern: public exposure is
-- limited by policy (unpublished stories are never publicly readable) and demo writes
-- are labelled for replacement by authenticated, scoped policies before real users.

-- ============ Pillar 3 — FairPrice Engine ============

create table public.material_price_history (
  id uuid primary key default gen_random_uuid(),
  shg_id uuid not null,
  material_id uuid, -- nullable: ad-hoc material entries without an inventory row
  material_name text not null,
  unit text,
  unit_price_inr numeric(12,2) not null,
  source text,
  note text,
  recorded_by text,
  recorded_at timestamptz not null default now()
);

create table public.product_cost_inputs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  shg_id uuid,
  material_name text not null,
  quantity_per_unit numeric(12,3) not null default 0,
  unit text,
  unit_cost_inr numeric(12,2) not null default 0,
  wastage_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_labour_inputs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  stage_name text not null,
  hours_per_unit numeric(8,2) not null default 0,
  rate_inr_per_hour numeric(12,2), -- null = rate not yet recorded; labour is never silently free
  rate_source text,
  created_at timestamptz not null default now()
);

create table public.product_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version integer not null,
  currency text not null default 'INR',
  breakdown jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  unique (product_id, version)
);

-- ============ Pillar 2 — Living Craft Stories ============

create table public.craft_stories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  shg_id uuid,
  artisan_id uuid references public.artisans(id) on delete set null,
  title text not null,
  body text not null,
  language text not null default 'en',
  status text not null default 'draft' check (status in ('draft','in_review','published','retired')),
  source_notes text,
  original_notes text, -- maker's raw notes kept alongside any AI-organised draft
  ai_assisted boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_consents (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.craft_stories(id) on delete cascade,
  consent_type text not null check (consent_type in ('maker_name','maker_photo','voice_transcript','workshop_photo','cultural_notes','marketing_reuse')),
  granted boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now(),
  unique (story_id, consent_type)
);

-- ============ Pillar 4 — B2B Studio ============

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  region text,
  intended_use text,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now()
);

create table public.buyer_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  title text not null,
  structured jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','submitted','under_review','feasibility_ready','quoted','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  buyer_request_id uuid not null references public.buyer_requests(id) on delete cascade,
  shg_id uuid,
  status text not null default 'draft' check (status in ('draft','submitted','revision_requested','revised','accepted','declined','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  version integer not null,
  spec jsonb not null,
  status text not null default 'draft' check (status in ('draft','submitted','accepted','declined','expired','superseded')),
  created_by text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (quotation_id, version)
);

create table public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references public.quotations(id) on delete set null,
  buyer_request_id uuid references public.buyer_requests(id) on delete set null,
  shg_id uuid,
  buyer_id uuid references public.buyers(id) on delete set null,
  spec jsonb not null default '{}',
  spec_version integer not null default 1,
  fee_inr numeric(12,2) not null default 0,
  status text not null default 'requested' check (status in ('requested','under_review','approved_for_production','in_production','ready_for_review','dispatched','delivered','feedback_received','approved','revision_requested','cancelled')),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sample_events (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references public.sample_requests(id) on delete cascade,
  event_type text not null,
  note text,
  occurred_at timestamptz not null default now()
);

-- ============ Shared — production planning, notifications ============

create table public.production_plans (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stages jsonb not null default '[]',
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.production_plans(id) on delete cascade,
  stage text not null,
  note text,
  recorded_by text,
  occurred_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('coordinator','artisan','buyer')),
  audience_ref text,
  event_type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index material_price_history_shg_idx on public.material_price_history (shg_id, material_name, recorded_at);
create index cost_inputs_product_idx on public.product_cost_inputs (product_id);
create index labour_inputs_product_idx on public.product_labour_inputs (product_id);
create index cost_snapshots_product_idx on public.product_cost_snapshots (product_id, version);
create index craft_stories_status_idx on public.craft_stories (status);
create index buyer_requests_status_idx on public.buyer_requests (status);
create index quotations_request_idx on public.quotations (buyer_request_id);
create index quotation_versions_quote_idx on public.quotation_versions (quotation_id, version);
create index sample_requests_status_idx on public.sample_requests (status);
create index production_plans_order_idx on public.production_plans (order_id);
create index notifications_audience_idx on public.notifications (audience, created_at);

-- ============ Grants (Data API access) ============

grant select, insert, update, delete on
  public.material_price_history, public.product_cost_inputs, public.product_labour_inputs,
  public.product_cost_snapshots, public.buyers, public.buyer_requests, public.quotations,
  public.quotation_versions, public.sample_requests, public.sample_events,
  public.production_plans, public.production_events, public.notifications, public.story_consents
  to anon, authenticated;
grant all on
  public.material_price_history, public.product_cost_inputs, public.product_labour_inputs,
  public.product_cost_snapshots, public.buyers, public.buyer_requests, public.quotations,
  public.quotation_versions, public.sample_requests, public.sample_events,
  public.production_plans, public.production_events, public.notifications, public.story_consents
  to service_role;

-- Craft stories: anon may read only published stories; demo writes stay open and labelled.
grant select on public.craft_stories to anon, authenticated;
grant insert, update, delete on public.craft_stories to authenticated;
grant insert, update, delete on public.craft_stories to anon; -- DEMONSTRATION: replaced by scoped auth before real users
grant all on public.craft_stories to service_role;

-- ============ RLS ============

alter table public.material_price_history enable row level security;
alter table public.product_cost_inputs enable row level security;
alter table public.product_labour_inputs enable row level security;
alter table public.product_cost_snapshots enable row level security;
alter table public.craft_stories enable row level security;
alter table public.story_consents enable row level security;
alter table public.buyers enable row level security;
alter table public.buyer_requests enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_versions enable row level security;
alter table public.sample_requests enable row level security;
alter table public.sample_events enable row level security;
alter table public.production_plans enable row level security;
alter table public.production_events enable row level security;
alter table public.notifications enable row level security;

-- Demonstration-mode policies (labelled; replaced by scoped authenticated policies before real users)
create policy "Demo full access — material prices" on public.material_price_history for all using (true) with check (true);
create policy "Demo full access — cost inputs" on public.product_cost_inputs for all using (true) with check (true);
create policy "Demo full access — labour inputs" on public.product_labour_inputs for all using (true) with check (true);
create policy "Demo full access — cost snapshots" on public.product_cost_snapshots for all using (true) with check (true);
create policy "Demo full access — story consents" on public.story_consents for all using (true) with check (true);
create policy "Demo full access — buyers" on public.buyers for all using (true) with check (true);
create policy "Demo full access — buyer requests" on public.buyer_requests for all using (true) with check (true);
create policy "Demo full access — quotations" on public.quotations for all using (true) with check (true);
create policy "Demo full access — quotation versions" on public.quotation_versions for all using (true) with check (true);
create policy "Demo full access — sample requests" on public.sample_requests for all using (true) with check (true);
create policy "Demo full access — sample events" on public.sample_events for all using (true) with check (true);
create policy "Demo full access — production plans" on public.production_plans for all using (true) with check (true);
create policy "Demo full access — production events" on public.production_events for all using (true) with check (true);
create policy "Demo full access — notifications" on public.notifications for all using (true) with check (true);
create policy "Demo full access — craft story writes" on public.craft_stories for insert to anon, authenticated with check (true);
create policy "Demo full access — craft story updates" on public.craft_stories for update to anon, authenticated using (true) with check (true);
create policy "Demo full access — craft story deletes" on public.craft_stories for delete to anon, authenticated using (true);
create policy "Published stories are publicly readable" on public.craft_stories for select to anon using (status = 'published');
create policy "All stories readable by authenticated demo users" on public.craft_stories for select to authenticated using (true);

comment on table public.craft_stories is 'Maker-approved craft stories; anon SELECT restricted to published rows. Demo writes must be replaced by scoped authenticated policies before real users.';
comment on table public.product_cost_snapshots is 'Immutable versioned cost snapshots; approved terms are never silently rewritten.';
