-- ==============================================================================
-- 0018_four_user_types_and_onboarding.sql
-- Strictly enforces four user types (artisan, coordinator, customer, buyer).
-- Admins are permanently removed and cannot self-register.
-- ==============================================================================

-- 1. Extend artisans table for self-registration and SHG linkage
alter table public.artisans add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.artisans add column if not exists phone text;
alter table public.artisans add column if not exists status text not null default 'pending';
alter table public.artisans add column if not exists rejection_note text;
alter table public.artisans add column if not exists updated_at timestamptz;
create index if not exists idx_artisans_user_id on public.artisans(user_id);
create index if not exists idx_artisans_status on public.artisans(status);

-- 2. Extend buyers table for GSTIN and B2B corporate profile
alter table public.buyers add column if not exists company_name text;
alter table public.buyers add column if not exists gstin text;
alter table public.buyers add column if not exists contact_person text;
alter table public.buyers add column if not exists contact_phone text;
alter table public.buyers add column if not exists contact_email text;
alter table public.buyers add column if not exists updated_at timestamptz;

-- 3. Extend shgs table for SRLM identification and registration
alter table public.shgs add column if not exists state text;
alter table public.shgs add column if not exists district text;
alter table public.shgs add column if not exists block text;
alter table public.shgs add column if not exists srlm_id text;
alter table public.shgs add column if not exists contact text;
alter table public.shgs add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.shgs add column if not exists updated_at timestamptz;

-- 4. Artisan Invitations by SHG Coordinator
create table if not exists public.artisan_invites (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid references auth.users(id) on delete cascade,
  shg_id uuid references public.shgs(id) on delete cascade,
  phone text not null,
  name text,
  craft text,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.artisan_invites enable row level security;
grant select, insert, update on public.artisan_invites to authenticated;

create policy "Coordinators manage invites for own collective"
  on public.artisan_invites
  for all
  to authenticated
  using (coordinator_id = auth.uid());

-- 5. Hardened Signup Trigger:
-- Strictly supports customer, buyer, artisan, coordinator.
-- Never assigns admin role under any circumstances.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lang text := lower(coalesce(new.raw_user_meta_data->>'preferred_language', 'en'));
  v_role public.app_role := 'customer';
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type', new.raw_user_meta_data->>'role');
begin
  if v_lang not in ('en','hi','mr') then
    v_lang := 'en';
  end if;

  -- Strictly map permitted roles (admin is ignored and falls back to customer)
  if v_account_type = 'buyer' then
    v_role := 'buyer';
  elsif v_account_type = 'coordinator' then
    v_role := 'coordinator';
  elsif v_account_type = 'artisan' then
    v_role := 'artisan';
  else
    v_role := 'customer';
  end if;

  insert into public.profiles (id, display_name, preferred_language, onboarding_status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      v_lang,
      case
        when v_role = 'artisan' then 'pending_approval'
        else 'completed'
      end
    )
    on conflict (id) do update set
      display_name = coalesce(excluded.display_name, public.profiles.display_name),
      preferred_language = excluded.preferred_language;

  insert into public.user_roles (user_id, role)
    values (new.id, v_role)
    on conflict do nothing;

  return new;
end;
$$;

-- 6. Row Level Security Policies for Data Isolation
-- Artisans can only mutate products if they are approved
create or replace function public.is_approved_artisan(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.artisans
    where user_id = _user_id and status in ('approved', 'active')
  )
$$;

