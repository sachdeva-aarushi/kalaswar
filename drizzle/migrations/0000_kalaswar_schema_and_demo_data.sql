-- Kalaswar core schema + seeded demonstration records (clearly labelled demo data)

create table public.shgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.artisans (
  id uuid primary key default gen_random_uuid(),
  shg_id uuid not null references public.shgs(id) on delete cascade,
  name text not null,
  craft text not null,
  bio text not null default '',
  preferred_language text not null default 'en',
  photo_url text,
  photo_public_id text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'Crafts',
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  image_public_id text,
  availability boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  customer_reference text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'pending' check (status in ('pending','in_production','ready_for_dispatch','delivered','delayed')),
  expected_dispatch_at date,
  created_at timestamptz not null default now()
);

create table public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by text not null default 'demonstration'
);

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  payment_status text not null default 'demo',
  created_at timestamptz not null default now()
);

create index idx_artisans_shg on public.artisans(shg_id);
create index idx_products_artisan on public.products(artisan_id);
create index idx_orders_product on public.orders(product_id);
create index idx_orders_status on public.orders(status);
create index idx_assignments_order on public.order_assignments(order_id);
create index idx_tips_artisan on public.tips(artisan_id);

-- Grants (demo mode: public catalogue reads; demo writes listed below)
grant select on public.shgs to anon, authenticated;
grant select on public.artisans to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, update on public.orders to anon, authenticated;
grant select, insert, delete on public.order_assignments to anon, authenticated;
grant select, insert on public.tips to anon, authenticated;
grant all on public.shgs, public.artisans, public.products, public.orders, public.order_assignments, public.tips to service_role;

alter table public.shgs enable row level security;
alter table public.artisans enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_assignments enable row level security;
alter table public.tips enable row level security;

create policy "Public read SHGs" on public.shgs for select using (true);
create policy "Public read artisans" on public.artisans for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Demo write products" on public.products for all using (true) with check (true);
create policy "Public read orders" on public.orders for select using (true);
create policy "Demo update orders" on public.orders for update using (true) with check (true);
create policy "Public read assignments" on public.order_assignments for select using (true);
create policy "Demo write assignments" on public.order_assignments for all using (true) with check (true);
create policy "Public read tips" on public.tips for select using (true);
create policy "Demo insert tips" on public.tips for insert with check (true);

-- ============ DEMONSTRATION RECORDS ============
insert into public.shgs (id, name, region, preferred_language) values
  ('11111111-1111-1111-1111-111111111111', 'Mithila Mahila Collective', 'Madhubani, Bihar', 'hi'),
  ('22222222-2222-2222-2222-222222222222', 'Kouna Sakhi Group', 'Bishnupur, Manipur', 'hi'),
  ('33333333-3333-3333-3333-333333333333', 'Ranthambore Stitches Circle', 'Sawai Madhopur, Rajasthan', 'en');

insert into public.artisans (id, shg_id, name, craft, bio, preferred_language, photo_url) values
  ('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Meenakshi Devi', 'Mithila painting', 'Meenakshi learned Mithila painting from her mother, grinding her first pigments on a household grinding stone at twelve. Today she leads painting workshops for younger members of the collective and dreams of her work travelling further than the village fair.', 'hi', '/__l5e/assets-v1/3c14172d-c447-4f00-8267-fc05b7083b29/image-3.png'),
  ('11111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Sunita Kumari', 'Sikki grass craft', 'Sunita weaves sikki grass — a fine golden grass that grows after the monsoon — into boxes and ornaments. She says the grass asks for patience, and that patience has paid for her daughter''s school books.', 'hi', '/__l5e/assets-v1/3c14172d-c447-4f00-8267-fc05b7083b29/image-3.png'),
  ('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Ingobi Leima', 'Kouna grass weaving', 'Ingobi harvests and hand-weaves kouna, the water reed that grows around Loktak lake. Each tote takes her three days. Her collective of twenty-two women fills orders for shops in Imphal and now, through Kalaswar, beyond.', 'hi', '/__l5e/assets-v1/21f73a68-17d4-4348-a911-8e6320e9b77f/image-2.png'),
  ('22222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Linthoi Chanu', 'Fibre crochet and embellishment', 'Linthoi adds the embroidery and crochet flowers that finish the collective''s woven bags. She can identify every member''s stitching from across the room, and teaches the pattern library to new members.', 'hi', '/__l5e/assets-v1/21f73a68-17d4-4348-a911-8e6320e9b77f/image-2.png'),
  ('33333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Bhavna Meena', 'Hand embroidery', 'Bhavna stitches aari embroidery on textiles from her home in Sawai Madhopur, working between school hours and the village well. Her floral motifs are drawn from the forests around Ranthambore.', 'en', '/__l5e/assets-v1/3c14172d-c447-4f00-8267-fc05b7083b29/image-3.png'),
  ('11111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Kamla Devi', 'Terracotta pottery', 'Kamla throws terracotta on a wheel her grandmother pedalled by foot. Her diya lamps light every doorway in the village at Diwali, and she is now teaching two apprentices the wheel.', 'hi', '/__l5e/assets-v1/3c14172d-c447-4f00-8267-fc05b7083b29/image-3.png');

insert into public.products (id, artisan_id, name, description, category, price, image_url, availability) values
  ('10000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Kouna Grass Round Sling Bag', 'A round hand-woven kouna grass sling with a full floral-embroidery face and adjustable strap. Light, sturdy, and finished by hand in Bishnupur.', 'Baskets & Bags', 1290.00, '/__l5e/assets-v1/7e443b28-4be9-4fd9-b947-4aff88db0c9d/image.png', true),
  ('10000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Kouna Grass Market Tote', 'The collective''s signature large tote, woven from twisted kouna grass with braided handles and a bright embroidered posy. Holds a week of market produce.', 'Baskets & Bags', 1650.00, '/__l5e/assets-v1/7e443b28-4be9-4fd9-b947-4aff88db0c9d/image.png', true),
  ('10000000-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Kouna Grass Zip Pouch', 'A compact everyday pouch in fine kouna weave with a single embroidered marigold and a lined zipper — good for cords, cards and coins.', 'Home & Storage', 690.00, '/__l5e/assets-v1/7e443b28-4be9-4fd9-b947-4aff88db0c9d/image.png', true),
  ('10000000-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Wild Grass Storage Basket', 'A deep storage basket woven from wild hill grass with sturdy ring handles. Each piece varies slightly in tone, as the grass dries.', 'Home & Storage', 980.00, '/__l5e/assets-v1/21f73a68-17d4-4348-a911-8e6320e9b77f/image-2.png', true),
  ('10000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Sikki Grass Jewellery Box', 'A small lidded box in golden sikki grass, its lid worked in the traditional diamond-knot pattern. The grass is soaked, split and stitched entirely by hand.', 'Home & Storage', 1450.00, '/__l5e/assets-v1/7210f8c8-8d61-4afe-81d1-f4a4e6c93a28/image-gen/62a9985a-d521-49aa-885b-d6d5643741c5', true),
  ('10000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 'Mithila Painting: Fish and Lotus', 'Natural pigment on hand-made paper, framed in bamboo. Meenakshi paints the fish-and-lotus motif for prosperity, in the kachni line style of Madhubani.', 'Paintings & Wall Art', 3200.00, '/__l5e/assets-v1/3c14172d-c447-4f00-8267-fc05b7083b29/image-3.png', true),
  ('10000000-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000001', 'Block-Printed Cotton Runner', 'Six feet of hand block-printed cotton in terracotta and indigo, printed with carved teak blocks by a family workshop Bhavna partners with in Sawai Madhopur.', 'Textiles & Table', 1800.00, '/__l5e/assets-v1/7210f8c8-8d61-4afe-81d1-f4a4e6c93a28/image-gen/082cce65-2e62-4774-a969-52f9d754c31e', true),
  ('10000000-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000001', 'Embroidered Cushion Cover', 'Deep wine cotton with aari-embroidered wildflowers in six thread colours. Fits a standard 16-inch cushion; cover only.', 'Textiles & Table', 950.00, '/__l5e/assets-v1/7210f8c8-8d61-4afe-81d1-f4a4e6c93a28/image-gen/4c5659d5-6ea4-480b-96f4-492a67cf54eb', true),
  ('10000000-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', 'Terracotta Diya and Pot Set', 'A set of six hand-thrown diyas with one small storage matka. Unglazed, fired in an open kiln — the colour deepens with use.', 'Clay & Terracotta', 720.00, '/__l5e/assets-v1/7210f8c8-8d61-4afe-81d1-f4a4e6c93a28/image-gen/3c7e26d2-06bf-480b-96f4-492a67cf54eb', true),
  ('10000000-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000002', 'Crochet Flower Keyring', 'A tiny hand-crochet bloom with a kouna grass ring, made from thread offcuts so nothing in the workshop is wasted.', 'Toys & Little Things', 350.00, '/__l5e/assets-v1/7e443b28-4be9-4fd9-b947-4aff88db0c9d/image.png', true);

insert into public.orders (id, product_id, customer_reference, quantity, status, expected_dispatch_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'KSW-1043', 4, 'in_production', now() + interval '9 days'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'KSW-1044', 6, 'in_production', now() + interval '12 days'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'KSW-1045', 2, 'pending', now() + interval '15 days'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', 'KSW-1046', 3, 'pending', now() + interval '10 days'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'KSW-1047', 5, 'ready_for_dispatch', now() + interval '3 days'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000009', 'KSW-1048', 10, 'delivered', now() - interval '4 days'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008', 'KSW-1049', 8, 'delayed', now() + interval '2 days'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000010', 'KSW-1050', 12, 'pending', now() + interval '7 days');

insert into public.order_assignments (order_id, artisan_id, assigned_by) values
  ('20000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Coordinator — demonstration'),
  ('20000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Coordinator — demonstration'),
  ('20000000-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Coordinator — demonstration'),
  ('20000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'Coordinator — demonstration'),
  ('20000000-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000001', 'Coordinator — demonstration');

insert into public.tips (artisan_id, amount, payment_status) values
  ('22222222-0000-0000-0000-000000000001', 150.00, 'demo');
