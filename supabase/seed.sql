-- =============================================================================
-- KALASWAR SEED DATA (IDEMPOTENT DEMONSTRATION DATASET)
-- =============================================================================
-- Matching schema across migrations 0000 through 0013.
-- Safe for repeated execution: uses deterministic UUIDs and ON CONFLICT handling.
--
-- Contents:
--   1. Schema adjustments (additive helper columns if not present)
--   2. Demo Auth Users & Roles (admin, coordinator, artisan, customer, buyer, financier)
--   3. 3 SHG Clusters (West Bengal, Maharashtra, Uttar Pradesh)
--   4. 3 Self-Help Groups (linked to clusters)
--   5. 12 Artisans (regional names, preferred languages, skills & memberships)
--   6. 30 Products (Kantha, Warli, Handloom Silk, Cushion Covers) + Media Assets
--   7. Inventory (14 materials, including 5 intentionally stale records & low-stock alerts)
--   8. 10 Orders across varied workflow stages + assignments, events, QC, shipments, payments
--   9. 3 B2B Requests (buyers, RFPs, versioned quotations, sample requests & events)
--  10. Digital Product Passports (DPP) on Polygon L2
--  11. Voice Sessions & Listing Drafts (WhatsApp voice simulation)
--  12. Action Audit Logs & Payout Ledger (Simulated DBT wage payouts)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SCHEMA SAFETY & HELPER COLUMNS
-- ---------------------------------------------------------------------------
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS voice_lang_pref text;
ALTER TABLE public.artisans ADD COLUMN IF NOT EXISTS phone_number text;

-- Ensure auth schema and pgcrypto exist for offline or standalone postgres
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Helper to safely compute blowfish password hash for demo accounts
CREATE OR REPLACE FUNCTION public._demo_hash_pwd(pwd text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  RETURN extensions.crypt(pwd, extensions.gen_salt('bf', 8));
EXCEPTION WHEN OTHERS THEN
  BEGIN
    RETURN crypt(pwd, gen_salt('bf', 8));
  EXCEPTION WHEN OTHERS THEN
    -- Fallback placeholder hash if pgcrypto extension is unavailable
    RETURN '$2a$08$demo.hash.placeholder.for.offline.mode.only.kalaswar.demo';
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. DEMO USERS, PROFILES, AND USER ROLES
-- ---------------------------------------------------------------------------
-- Passwords for all demo accounts: 'KalaswarDemo@2025'
-- Deterministic User UUIDs:
--   Coordinator: 99999999-0000-0000-0000-000000000002
--   Artisan:     99999999-0000-0000-0000-000000000003
--   Customer:    99999999-0000-0000-0000-000000000004
--   Buyer:       99999999-0000-0000-0000-000000000005
--   Financier:   99999999-0000-0000-0000-000000000006

DO $$
DECLARE
  v_hash text := public._demo_hash_pwd('KalaswarDemo@2025');
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
    )
    VALUES
      ('99999999-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'coordinator.sunita@kalaswar.demo', v_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sunita Patil","role":"coordinator","preferred_language":"mr"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
      ('99999999-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'artisan.anita@kalaswar.demo', v_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Anita Ansari","role":"artisan","preferred_language":"hi"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
      ('99999999-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'customer.priya@kalaswar.demo', v_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Priya Sharma","role":"customer","preferred_language":"en"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
      ('99999999-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'buyer.fabindia@kalaswar.demo', v_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Priya Nair","account_type":"buyer","org":"FabIndia"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
      ('99999999-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'financier.sbi@kalaswar.demo', v_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Rajesh Verma (NABARD/SBI)","role":"financier"}'::jsonb, 'authenticated', 'authenticated', now(), now())
    ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;
  END IF;
END;
$$;

-- Profiles
INSERT INTO public.profiles (id, display_name, preferred_language, onboarding_status, updated_at)
VALUES
  ('99999999-0000-0000-0000-000000000002', 'Sunita Patil (SHG Coordinator)', 'mr', 'completed', now()),
  ('99999999-0000-0000-0000-000000000003', 'Anita Ansari (Master Artisan)', 'hi', 'completed', now()),
  ('99999999-0000-0000-0000-000000000004', 'Priya Sharma (Retail Customer)', 'en', 'completed', now()),
  ('99999999-0000-0000-0000-000000000005', 'Priya Nair (FabIndia Sourcing)', 'en', 'completed', now()),
  ('99999999-0000-0000-0000-000000000006', 'Rajesh Verma (Micro-Financier)', 'hi', 'completed', now())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  preferred_language = EXCLUDED.preferred_language,
  onboarding_status = EXCLUDED.onboarding_status;

-- User Roles
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('99999999-0000-0000-0000-000000000002', 'coordinator'),
  ('99999999-0000-0000-0000-000000000003', 'artisan'),
  ('99999999-0000-0000-0000-000000000004', 'customer'),
  ('99999999-0000-0000-0000-000000000005', 'buyer'),
  ('99999999-0000-0000-0000-000000000006', 'financier')
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. THREE SHG CLUSTERS (West Bengal, Maharashtra, Uttar Pradesh)
-- ---------------------------------------------------------------------------
INSERT INTO public.shg_clusters (id, cluster_name, state_srlm_id, state, district, block, bank_dbt_account, bank_ifsc, cluster_manager)
VALUES
  (
    'aaaaaaaa-0001-0000-0000-000000000001',
    'Bengal Gramin Hastakala Cluster',
    'WB-SRLM-0219-DEMO',
    'West Bengal',
    'Birbhum',
    'Bolpur-Sriniketan',
    'DBT-WB-9988221101',
    'SBIN0001234',
    'Debabrata Mukherjee'
  ),
  (
    'aaaaaaaa-0001-0000-0000-000000000002',
    'Sahyadri Warli Tribal Cluster',
    'MH-SRLM-0412-DEMO',
    'Maharashtra',
    'Palghar',
    'Dahanu',
    'DBT-MH-4455667702',
    'MAHB0000567',
    'Eknath Vartha'
  ),
  (
    'aaaaaaaa-0001-0000-0000-000000000003',
    'Kashi Vankar Silk Cluster',
    'UP-SRLM-0308-DEMO',
    'Uttar Pradesh',
    'Varanasi',
    'Arajiline',
    'DBT-UP-7711223303',
    'UBIN0532109',
    'Mohammad Zameer'
  )
ON CONFLICT (id) DO UPDATE SET
  cluster_name = EXCLUDED.cluster_name,
  state = EXCLUDED.state,
  district = EXCLUDED.district,
  block = EXCLUDED.block,
  cluster_manager = EXCLUDED.cluster_manager;

-- ---------------------------------------------------------------------------
-- 4. THREE SELF-HELP GROUPS (SHGs)
-- ---------------------------------------------------------------------------
INSERT INTO public.shgs (id, cluster_id, name, region, preferred_language, monthly_capacity, upi_id)
VALUES
  (
    'bbbbbbbb-0001-0000-0000-000000000001',
    'aaaaaaaa-0001-0000-0000-000000000001',
    'Shantiniketan Kantha Mahila Samiti',
    'Bolpur, Birbhum, West Bengal',
    'bn',
    80,
    'shantiniketan.kantha@upi'
  ),
  (
    'bbbbbbbb-0001-0000-0000-000000000002',
    'aaaaaaaa-0001-0000-0000-000000000002',
    'Dahanu Warli Prerna Bachat Gat',
    'Dahanu, Palghar, Maharashtra',
    'mr',
    120,
    'dahanu.warli@upi'
  ),
  (
    'bbbbbbbb-0001-0000-0000-000000000003',
    'aaaaaaaa-0001-0000-0000-000000000003',
    'Varanasi Resham Vankar Sakhi Sangathan',
    'Arajiline, Varanasi, Uttar Pradesh',
    'hi',
    60,
    'varanasi.resham@upi'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  preferred_language = EXCLUDED.preferred_language,
  monthly_capacity = EXCLUDED.monthly_capacity,
  upi_id = EXCLUDED.upi_id;

-- Link coordinator to SHG 2 (Maharashtra)
INSERT INTO public.group_memberships (id, user_id, shg_id, artisan_id, member_role)
VALUES
  ('99999999-0000-0000-0000-000000000010', '99999999-0000-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000002', null, 'coordinator')
ON CONFLICT (user_id, shg_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. 12 ARTISANS WITH HINDI / REGIONAL NAMES & VOICE PREFERENCES
-- ---------------------------------------------------------------------------
-- 4 in West Bengal (Kantha), 4 in Maharashtra (Warli), 4 in Uttar Pradesh (Silk & Cushions)

INSERT INTO public.artisans (id, shg_id, name, craft, bio, preferred_language, voice_lang_pref, phone_number, photo_public_id, photo_url)
VALUES
  -- Bengal Kantha Artisans (Bengali)
  (
    'cccccccc-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Aparna Ghosh',
    'Kantha embroidery',
    'Aparna has practiced Bolpur running-stitch Kantha for over eighteen years. She leads pattern layout and vegetable-dye thread selection for the collective.',
    'bn', 'bn', '+919830112201',
    'kalaswar/demo/artisan_aparna_ghosh',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_aparna_ghosh.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000002',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Rumela Mondal',
    'Nakshi Kantha quilts',
    'Specializes in heirloom Nakshi Kantha quilts using repurposed tussar silk and vintage cotton layers, narrating rural folklore through needlework.',
    'bn', 'bn', '+919830112202',
    'kalaswar/demo/artisan_rumela_mondal',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_rumela_mondal.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000003',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Kalyani Das',
    'Kantha silk stoles',
    'Known for high-precision geometric boundary stitches and miniature border work on pure silk stoles and scarves.',
    'bn', 'bn', '+919830112203',
    'kalaswar/demo/artisan_kalyani_das',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_kalyani_das.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000004',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Shampa Roy',
    'Kantha cushion motifs',
    'Master of floral and bird motifs on raw cotton cushion covers and table linen with double-layer backing.',
    'bn', 'bn', '+919830112204',
    'kalaswar/demo/artisan_shampa_roy',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_shampa_roy.jpg'
  ),

  -- Maharashtra Warli Artisans (Marathi)
  (
    'cccccccc-0001-0000-0000-000000000005',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Savita Gavit',
    'Warli canvas painting',
    'Savita paints ritual Warli wedding chauks and harvest tarpa dances on handmade paper and raw cotton cloth using rice flour paste and geru mud.',
    'mr', 'mr', '+919820223305',
    'kalaswar/demo/artisan_savita_gavit',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_savita_gavit.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000006',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Surekha Vartha',
    'Warli wall murals',
    'Renowned in Dahanu for large-scale bamboo and canvas Warli murals representing community forest gathering and monsoon rites.',
    'mr', 'mr', '+919820223306',
    'kalaswar/demo/artisan_surekha_vartha',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_surekha_vartha.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000007',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Anandi Bhoye',
    'Warli home decor & bamboo',
    'Integrates traditional triangular Warli figurines with utility home decor items including bamboo trays, coasters, and clocks.',
    'mr', 'mr', '+919820223307',
    'kalaswar/demo/artisan_anandi_bhoye',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_anandi_bhoye.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000008',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Laxmi Kurkute',
    'Warli terracotta & textiles',
    'Pairs terracotta clay pot surfaces with fine-brush natural white pigment line work depicting daily tribal life.',
    'mr', 'mr', '+919820223308',
    'kalaswar/demo/artisan_laxmi_kurkute',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_laxmi_kurkute.jpg'
  ),

  -- Uttar Pradesh Silk & Cushion Artisans (Hindi)
  (
    'cccccccc-0001-0000-0000-000000000009',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Anita Ansari',
    'Banarasi handloom silk weaving',
    'Third-generation handloom weaver from Varanasi. Specialises in pure Katan silk sarees and brocade wefts with intricate floral jaal.',
    'hi', 'hi', '+919810334409',
    'kalaswar/demo/artisan_anita_ansari',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_anita_ansari.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000010',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Shabana Parveen',
    'Zari brocade & cushion covers',
    'Expert in zari thread tension and jacquard loom setups for premium silk brocade cushion covers and decorative table runners.',
    'hi', 'hi', '+919810334410',
    'kalaswar/demo/artisan_shabana_parveen',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_shabana_parveen.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000011',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Pooja Maurya',
    'Handloom silk stoles',
    'Weaves lightweight organza and mulberry silk stoles with zari selvage borders and natural mineral dye finishing.',
    'hi', 'hi', '+919810334411',
    'kalaswar/demo/artisan_pooja_maurya',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_pooja_maurya.jpg'
  ),
  (
    'cccccccc-0001-0000-0000-000000000012',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Radha Devi',
    'Hand-spun tussar silk & cushions',
    'Works on traditional pit-looms weaving textured tussar silk fabrics, cushion panels, and festive decorative textile squares.',
    'hi', 'hi', '+919810334412',
    'kalaswar/demo/artisan_radha_devi',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/artisan_radha_devi.jpg'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  craft = EXCLUDED.craft,
  bio = EXCLUDED.bio,
  preferred_language = EXCLUDED.preferred_language,
  voice_lang_pref = EXCLUDED.voice_lang_pref,
  phone_number = EXCLUDED.phone_number,
  photo_public_id = EXCLUDED.photo_public_id,
  photo_url = EXCLUDED.photo_url;

-- Link Anita Ansari to her demo auth account
INSERT INTO public.group_memberships (id, user_id, shg_id, artisan_id, member_role)
VALUES
  ('99999999-0000-0000-0000-000000000011', '99999999-0000-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000003', 'cccccccc-0001-0000-0000-000000000009', 'artisan')
ON CONFLICT (user_id, shg_id) DO NOTHING;

-- Artisan Skills (Core & Secondary)
INSERT INTO public.artisan_skills (artisan_id, skill, level, notes)
VALUES
  ('cccccccc-0001-0000-0000-000000000001', 'kantha embroidery', 'core', 'Running stitch and pattern tracing on tussar silk'),
  ('cccccccc-0001-0000-0000-000000000001', 'natural dyeing', 'secondary', 'Indigo and madder root cold-vat dyeing'),
  ('cccccccc-0001-0000-0000-000000000002', 'nakshi kantha quilting', 'core', 'Heirloom thick-layer quilting with mythological panels'),
  ('cccccccc-0001-0000-0000-000000000003', 'kantha border finish', 'core', 'Fine thread border stitching and edge finishing'),
  ('cccccccc-0001-0000-0000-000000000004', 'cushion cover fabrication', 'core', 'Zip insertion and piping for embroidered cushion covers'),
  ('cccccccc-0001-0000-0000-000000000005', 'warli canvas painting', 'core', 'Rice paste and gum arabic application on mud-treated canvas'),
  ('cccccccc-0001-0000-0000-000000000006', 'warli mural composition', 'core', 'Large-scale narrative composition of tribal life and sacred trees'),
  ('cccccccc-0001-0000-0000-000000000007', 'bamboo craft painting', 'core', 'Fine-line acrylic and mineral paint on curved bamboo trays'),
  ('cccccccc-0001-0000-0000-000000000008', 'terracotta painting', 'core', 'Slip-coating and white pigment brushwork on clay pottery'),
  ('cccccccc-0001-0000-0000-000000000009', 'katan silk weaving', 'core', 'Throw-shuttle pit loom weaving of high-twist pure silk yarn'),
  ('cccccccc-0001-0000-0000-000000000010', 'zari brocade weaving', 'core', 'Gold and silver metallic thread interweaving for upholstery'),
  ('cccccccc-0001-0000-0000-000000000011', 'handloom stole weaving', 'core', 'Lightweight summer silk and organza weave structures'),
  ('cccccccc-0001-0000-0000-000000000012', 'tussar silk processing', 'core', 'Yarn reeling, warping, and textured cushion fabric weaving')
ON CONFLICT (artisan_id, skill) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. 30 PRODUCTS ACROSS 4 CRAFTS WITH CLOUDINARY PLACEHOLDER IDS
-- ---------------------------------------------------------------------------
-- Crafts: Kantha (1-8), Warli (9-16), Handloom Silk (17-23), Cushion Covers (24-30)

INSERT INTO public.products (id, artisan_id, name, description, category, price, image_public_id, image_url, availability, updated_by)
VALUES
  -- Craft 1: Kantha (West Bengal)
  (
    'dddddddd-0001-0000-0000-000000000001',
    'cccccccc-0001-0000-0000-000000000001',
    'Hand-Stitched Kantha Silk Dupatta',
    'Pure Murshidabad silk dupatta adorned with traditional running Kantha stitch in lotus and conch motifs. Each piece represents two weeks of dedicated needlecraft.',
    'Textiles & Apparel', 3450.00,
    'kalaswar/demo/kantha_silk_dupatta_01',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_silk_dupatta_01.jpg',
    true, 'Aparna Ghosh'
  ),
  (
    'dddddddd-0001-0000-0000-000000000002',
    'cccccccc-0001-0000-0000-000000000002',
    'Nakshi Kantha Heritage Quilt',
    'Multilayered cotton and tussar quilt depicting rural harvest scenes and cosmic mandalas. Hand-quilted using naturally dyed threads.',
    'Home & Living', 8900.00,
    'kalaswar/demo/nakshi_kantha_quilt_02',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/nakshi_kantha_quilt_02.jpg',
    true, 'Rumela Mondal'
  ),
  (
    'dddddddd-0001-0000-0000-000000000003',
    'cccccccc-0001-0000-0000-000000000003',
    'Kantha Geometric Motif Scarf',
    'Lightweight handloom cotton scarf detailed with diagonal diamond Kantha stitch lines and tassel borders.',
    'Fashion Accessories', 1650.00,
    'kalaswar/demo/kantha_geo_scarf_03',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_geo_scarf_03.jpg',
    true, 'Kalyani Das'
  ),
  (
    'dddddddd-0001-0000-0000-000000000004',
    'cccccccc-0001-0000-0000-000000000001',
    'Floral Kantha Cotton Bed Runner',
    'Six-foot bed runner featuring botanical vine patterns in madder red and indigo blue on ivory handloom khadi.',
    'Home & Living', 2800.00,
    'kalaswar/demo/kantha_bed_runner_04',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_bed_runner_04.jpg',
    true, 'Aparna Ghosh'
  ),
  (
    'dddddddd-0001-0000-0000-000000000005',
    'cccccccc-0001-0000-0000-000000000004',
    'Kantha Embroidered Laptop Sleeve',
    'Padded 14-inch laptop sleeve made with durable cotton canvas and a high-density Kantha embroidered cover flap.',
    'Bags & Accessories', 1450.00,
    'kalaswar/demo/kantha_laptop_sleeve_05',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_laptop_sleeve_05.jpg',
    true, 'Shampa Roy'
  ),
  (
    'dddddddd-0001-0000-0000-000000000006',
    'cccccccc-0001-0000-0000-000000000004',
    'Traditional Kantha Everyday Tote',
    'Spacious shopping tote featuring double-stitched straps, magnetic clasp, and all-over fish and floral Kantha motif.',
    'Bags & Accessories', 1850.00,
    'kalaswar/demo/kantha_tote_06',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_tote_06.jpg',
    true, 'Shampa Roy'
  ),
  (
    'dddddddd-0001-0000-0000-000000000007',
    'cccccccc-0001-0000-0000-000000000003',
    'Kantha Embroidered Table Mat Set of 6',
    'Set of six matching dining placemats with fine cross-hatch Kantha embroidery and sturdy jute-cotton backing.',
    'Dining & Kitchen', 2200.00,
    'kalaswar/demo/kantha_table_mats_07',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_table_mats_07.jpg',
    true, 'Kalyani Das'
  ),
  (
    'dddddddd-0001-0000-0000-000000000008',
    'cccccccc-0001-0000-0000-000000000002',
    'Festive Kantha Tussar Silk Stole',
    'Golden tussar silk stole finished with intricate multi-color border embroidery and hand-knotted fringe.',
    'Fashion Accessories', 3100.00,
    'kalaswar/demo/kantha_silk_stole_08',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/kantha_silk_stole_08.jpg',
    true, 'Rumela Mondal'
  ),

  -- Craft 2: Warli Art (Maharashtra)
  (
    'dddddddd-0001-0000-0000-000000000009',
    'cccccccc-0001-0000-0000-000000000005',
    'Warli Tarpa Dance Canvas Painting',
    'Authentic 24x18 inch canvas painting created with rice paste on cow-dung and red geru prepared fabric. Represents communal Tarpa night celebration.',
    'Paintings & Wall Art', 4200.00,
    'kalaswar/demo/warli_tarpa_canvas_09',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_tarpa_canvas_09.jpg',
    true, 'Savita Gavit'
  ),
  (
    'dddddddd-0001-0000-0000-000000000010',
    'cccccccc-0001-0000-0000-000000000008',
    'Handpainted Warli Terracotta Vase',
    'Wheel-thrown terracotta vase hand-painted in traditional white pigment detailing musicians, deer, and sacred groves.',
    'Clay & Terracotta', 1350.00,
    'kalaswar/demo/warli_terracotta_vase_10',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_terracotta_vase_10.jpg',
    true, 'Laxmi Kurkute'
  ),
  (
    'dddddddd-0001-0000-0000-000000000011',
    'cccccccc-0001-0000-0000-000000000006',
    'Warli Village Harvest Wall Scroll',
    'Handloom cotton scroll mounted on polished teak rods depicting grain harvesting, threshing, and monsoon prayers.',
    'Paintings & Wall Art', 2900.00,
    'kalaswar/demo/warli_harvest_scroll_11',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_harvest_scroll_11.jpg',
    true, 'Surekha Vartha'
  ),
  (
    'dddddddd-0001-0000-0000-000000000012',
    'cccccccc-0001-0000-0000-000000000007',
    'Warli Motif Bamboo Serving Tray',
    'Seasoned natural bamboo tray with a water-resistant resin finish over handpainted Warli dancing circle motifs.',
    'Dining & Kitchen', 1550.00,
    'kalaswar/demo/warli_bamboo_tray_12',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_bamboo_tray_12.jpg',
    true, 'Anandi Bhoye'
  ),
  (
    'dddddddd-0001-0000-0000-000000000013',
    'cccccccc-0001-0000-0000-000000000007',
    'Warli Handpainted Wooden Coaster Set',
    'Set of 6 mango-wood coasters featuring distinct Warli daily-life icons: farmer, potter, hunter, peacock, hut, sun.',
    'Dining & Kitchen', 850.00,
    'kalaswar/demo/warli_coaster_set_13',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_coaster_set_13.jpg',
    true, 'Anandi Bhoye'
  ),
  (
    'dddddddd-0001-0000-0000-000000000014',
    'cccccccc-0001-0000-0000-000000000006',
    'Sacred Tree of Life Warli Frame',
    'Framed 12x12 inch miniature painting centered on the revered Palghat mother goddess tree with birds and animals.',
    'Paintings & Wall Art', 2100.00,
    'kalaswar/demo/warli_tree_frame_14',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_tree_frame_14.jpg',
    true, 'Surekha Vartha'
  ),
  (
    'dddddddd-0001-0000-0000-000000000015',
    'cccccccc-0001-0000-0000-000000000008',
    'Warli Earth Pigment Decorative Wall Plate',
    '10-inch round earthenware plate hand-glazed and painted with circular Warli ritual procession figures.',
    'Home & Living', 1200.00,
    'kalaswar/demo/warli_dec_plate_15',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_dec_plate_15.jpg',
    true, 'Laxmi Kurkute'
  ),
  (
    'dddddddd-0001-0000-0000-000000000016',
    'cccccccc-0001-0000-0000-000000000005',
    'Warli Storytelling Silent Wall Clock',
    '12-inch handcrafted wooden dial with quartz silent-sweep mechanism and 12 miniature Warli activity vignettes.',
    'Home & Living', 1950.00,
    'kalaswar/demo/warli_wall_clock_16',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_wall_clock_16.jpg',
    true, 'Savita Gavit'
  ),

  -- Craft 3: Handloom Silk (Uttar Pradesh)
  (
    'dddddddd-0001-0000-0000-000000000017',
    'cccccccc-0001-0000-0000-000000000009',
    'Banarasi Katan Silk Handloom Saree',
    'Pure mulberry Katan silk saree woven on traditional throw-shuttle looms in Varanasi with antique gold zari shikargah border.',
    'Textiles & Apparel', 16500.00,
    'kalaswar/demo/silk_katan_saree_17',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_katan_saree_17.jpg',
    true, 'Anita Ansari'
  ),
  (
    'dddddddd-0001-0000-0000-000000000018',
    'cccccccc-0001-0000-0000-000000000011',
    'Pure Raw Silk Handwoven Stole',
    'Featherweight hand-spun raw silk stole in warm turmeric gold with hand-twisted tassels and subtle zari wefts.',
    'Fashion Accessories', 2450.00,
    'kalaswar/demo/silk_raw_stole_18',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_raw_stole_18.jpg',
    true, 'Pooja Maurya'
  ),
  (
    'dddddddd-0001-0000-0000-000000000019',
    'cccccccc-0001-0000-0000-000000000009',
    'Chanderi Silk Zari Border Dupatta',
    'Translucent Chanderi silk-cotton weave featuring a rich two-inch gold zari border and delicately dotted butti body.',
    'Textiles & Apparel', 3800.00,
    'kalaswar/demo/silk_chanderi_dupatta_19',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_chanderi_dupatta_19.jpg',
    true, 'Anita Ansari'
  ),
  (
    'dddddddd-0001-0000-0000-000000000020',
    'cccccccc-0001-0000-0000-000000000012',
    'Handloom Tussar Silk Fabric (2.5m)',
    'Unstitched natural beige Tussar silk yardage suitable for formal kurtas or bespoke jackets. Rich organic slub texture.',
    'Craft Materials', 2950.00,
    'kalaswar/demo/silk_tussar_fabric_20',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_tussar_fabric_20.jpg',
    true, 'Radha Devi'
  ),
  (
    'dddddddd-0001-0000-0000-000000000021',
    'cccccccc-0001-0000-0000-000000000011',
    'Matka Silk Handwoven Scarf',
    'Thick spun Matka silk muffler with contrast selvage lines, offering breathable winter insulation.',
    'Fashion Accessories', 1900.00,
    'kalaswar/demo/silk_matka_scarf_21',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_matka_scarf_21.jpg',
    true, 'Pooja Maurya'
  ),
  (
    'dddddddd-0001-0000-0000-000000000022',
    'cccccccc-0001-0000-0000-000000000010',
    'Banarasi Zari Brocade Table Runner',
    'Heavy weight banarasi brocade table runner in deep royal blue with golden floral paisley jaal.',
    'Textiles & Table', 3200.00,
    'kalaswar/demo/silk_brocade_runner_22',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_brocade_runner_22.jpg',
    true, 'Shabana Parveen'
  ),
  (
    'dddddddd-0001-0000-0000-000000000023',
    'cccccccc-0001-0000-0000-000000000009',
    'Mulberry Silk Handloom Shawl',
    'Soft, hand-finished mulberry silk evening wrap with double-sided weaving and fine knotted fringes.',
    'Textiles & Apparel', 4600.00,
    'kalaswar/demo/silk_mulberry_shawl_23',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/silk_mulberry_shawl_23.jpg',
    true, 'Anita Ansari'
  ),

  -- Craft 4: Cushion Covers (Across Clusters)
  (
    'dddddddd-0001-0000-0000-000000000024',
    'cccccccc-0001-0000-0000-000000000004',
    'Kantha Embroidered Cotton Cushion Cover',
    '16x16 inch cotton cushion cover detailed with all-over diamond Kantha stitching and invisible zip enclosure.',
    'Home & Living', 950.00,
    'kalaswar/demo/cushion_kantha_cotton_24',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_kantha_cotton_24.jpg',
    true, 'Shampa Roy'
  ),
  (
    'dddddddd-0001-0000-0000-000000000025',
    'cccccccc-0001-0000-0000-000000000007',
    'Warli Tribal Motif Linen Cushion Cover',
    'Natural unbleached linen cushion cover with screen-printed Warli ceremonial dance patterns and embroidered highlights.',
    'Home & Living', 850.00,
    'kalaswar/demo/cushion_warli_linen_25',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_warli_linen_25.jpg',
    true, 'Anandi Bhoye'
  ),
  (
    'dddddddd-0001-0000-0000-000000000026',
    'cccccccc-0001-0000-0000-000000000010',
    'Banarasi Silk Brocade Cushion Cover',
    'Opulent 18x18 inch pure silk brocade cushion cover in wine red and antique zari, backed with heavy dupion silk.',
    'Home & Living', 1650.00,
    'kalaswar/demo/cushion_banarasi_silk_26',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_banarasi_silk_26.jpg',
    true, 'Shabana Parveen'
  ),
  (
    'dddddddd-0001-0000-0000-000000000027',
    'cccccccc-0001-0000-0000-000000000012',
    'Aari Floral Embroidered Velvet Cushion',
    'Deep emerald green velvet cushion cover embellished with intricate fine chain-stitch aari needlework.',
    'Home & Living', 1450.00,
    'kalaswar/demo/cushion_aari_velvet_27',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_aari_velvet_27.jpg',
    true, 'Radha Devi'
  ),
  (
    'dddddddd-0001-0000-0000-000000000028',
    'cccccccc-0001-0000-0000-000000000001',
    'Indigo Hand Block Print Cushion Cover',
    'Natural indigo dabu-resist hand block printed cushion cover with running white Kantha stitch accents.',
    'Home & Living', 920.00,
    'kalaswar/demo/cushion_indigo_block_28',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_indigo_block_28.jpg',
    true, 'Aparna Ghosh'
  ),
  (
    'dddddddd-0001-0000-0000-000000000029',
    'cccccccc-0001-0000-0000-000000000012',
    'Raw Silk & Jute Textured Cushion Cover',
    'Two-tone textured cushion cover pairing coarse hand-spun golden jute wefts with smooth dyed raw silk.',
    'Home & Living', 1100.00,
    'kalaswar/demo/cushion_silk_jute_29',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_silk_jute_29.jpg',
    true, 'Radha Devi'
  ),
  (
    'dddddddd-0001-0000-0000-000000000030',
    'cccccccc-0001-0000-0000-000000000004',
    'Nakshi Embroidered Bolster Cover',
    'Cylindrical bolster cushion cover featuring geometric floral end-caps and continuous running Kantha stripes.',
    'Home & Living', 1350.00,
    'kalaswar/demo/cushion_leather_applique_30',
    'https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_leather_applique_30.jpg',
    true, 'Shampa Roy'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  image_public_id = EXCLUDED.image_public_id,
  image_url = EXCLUDED.image_url,
  availability = EXCLUDED.availability;

-- Media Assets associated with products
INSERT INTO public.media_assets (product_id, public_id, secure_url, purpose, uploaded_by)
SELECT
  p.id,
  p.image_public_id,
  p.image_url,
  'product_photo',
  'Demonstration Seed'
FROM public.products p
WHERE p.id >= 'dddddddd-0001-0000-0000-000000000001'
  AND p.id <= 'dddddddd-0001-0000-0000-000000000030'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. INVENTORY (14 RAW MATERIALS, INCLUDING 5 INTENTIONALLY STALE RECORDS)
-- ---------------------------------------------------------------------------
-- Stale records have updated_at between 75 and 140 days ago.
-- Low-stock alert records have quantity <= low_stock_threshold.

INSERT INTO public.materials_inventory (id, shg_id, name, unit, quantity, low_stock_threshold, updated_at, updated_by)
VALUES
  -- SHG 1 (Bengal Kantha)
  (
    'eeeeeeee-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Pure Murshidabad Silk Fabric',
    'metre', 45.0, 15.0,
    now() - interval '3 days', 'Aparna Ghosh'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000002',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Anchor Stranded Cotton Threads (Assorted)',
    'bundle', 85.0, 25.0,
    now() - interval '5 days', 'Aparna Ghosh'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000003',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Unbleached Khadi Cotton Backing',
    'metre', 60.0, 20.0,
    now() - interval '85 days', -- STALE RECORD (85 days old)
    'Rumela Mondal'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000004',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'Natural Vegetable Indigo Dye Cake',
    'kg', 3.5, 5.0,            -- LOW STOCK ALERT (3.5 <= 5.0)
    now() - interval '120 days', -- STALE RECORD (120 days old)
    'Kalyani Das'
  ),

  -- SHG 2 (Maharashtra Warli)
  (
    'eeeeeeee-0001-0000-0000-000000000005',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Raw Cotton Canvas Rolls (10 oz)',
    'metre', 70.0, 20.0,
    now() - interval '2 days', 'Savita Gavit'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000006',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Red Geru Mineral Mud Pigment',
    'kg', 12.0, 10.0,
    now() - interval '95 days', -- STALE RECORD (95 days old)
    'Savita Gavit'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000007',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Refined Rice Flour Powder (Binder Base)',
    'kg', 24.0, 8.0,
    now() - interval '6 days', 'Surekha Vartha'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000008',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Seasoned Bamboo Strips (Cut & Sanded)',
    'bundle', 40.0, 15.0,
    now() - interval '140 days', -- STALE RECORD (140 days old)
    'Anandi Bhoye'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000009',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'Terracotta Potting Clay Blend',
    'kg', 110.0, 30.0,
    now() - interval '4 days', 'Laxmi Kurkute'
  ),

  -- SHG 3 (Uttar Pradesh Silk & Cushions)
  (
    'eeeeeeee-0001-0000-0000-000000000010',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Pure Mulberry Raw Silk Yarn (20/22 denier)',
    'kg', 18.0, 10.0,
    now() - interval '1 day', 'Anita Ansari'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000011',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Metallic Gold Tested Zari Reels',
    'reel', 4.0, 10.0,         -- LOW STOCK ALERT (4 <= 10)
    now() - interval '8 days', 'Shabana Parveen'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000012',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Heavy Viscose Velvet Fabric (Emerald)',
    'metre', 32.0, 12.0,
    now() - interval '75 days', -- STALE RECORD (75 days old)
    'Radha Devi'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000013',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Concealed Brass Cushion Zippers (16-inch)',
    'piece', 65.0, 25.0,
    now() - interval '10 days', 'Shabana Parveen'
  ),
  (
    'eeeeeeee-0001-0000-0000-000000000014',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'Handloom Tussar Silk Yarn Cones',
    'cone', 14.0, 8.0,
    now() - interval '110 days', -- STALE RECORD (110 days old)
    'Radha Devi'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  unit = EXCLUDED.unit,
  quantity = EXCLUDED.quantity,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  updated_at = EXCLUDED.updated_at,
  updated_by = EXCLUDED.updated_by;

-- Material Price History records for costing engine
INSERT INTO public.material_price_history (shg_id, material_name, unit, unit_price_inr, source, recorded_by)
VALUES
  ('bbbbbbbb-0001-0000-0000-000000000001', 'Pure Murshidabad Silk Fabric', 'metre', 450.00, 'Berhampore Silk Mandi', 'Aparna Ghosh'),
  ('bbbbbbbb-0001-0000-0000-000000000001', 'Anchor Stranded Cotton Threads', 'bundle', 35.00, 'Bolpur Wholesale Bazar', 'Aparna Ghosh'),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'Raw Cotton Canvas Rolls', 'metre', 180.00, 'Palghar Textile Depot', 'Savita Gavit'),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'Red Geru Mineral Mud Pigment', 'kg', 60.00, 'Dahanu Local Collector', 'Savita Gavit'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'Pure Mulberry Raw Silk Yarn', 'kg', 5400.00, 'Varanasi Resham Mandi', 'Anita Ansari'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'Metallic Gold Tested Zari Reels', 'reel', 320.00, 'Chowk Zari Traders', 'Shabana Parveen')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. 10 ORDERS AT VARIED STAGES
-- ---------------------------------------------------------------------------
-- Stages: pending (2), in_production (3), ready_for_dispatch (2), delayed (1), delivered (2)

INSERT INTO public.orders (id, product_id, customer_reference, quantity, status, expected_dispatch_at, source, is_custom)
VALUES
  -- 1. Pending (New retail order)
  (
    'ffffffff-0001-0000-0000-000000000001',
    'dddddddd-0001-0000-0000-000000000001',
    'ORD-2026-WB-101', 2, 'pending',
    now() + interval '14 days', 'retail', false
  ),
  -- 2. Pending (Custom order)
  (
    'ffffffff-0001-0000-0000-000000000002',
    'dddddddd-0001-0000-0000-000000000024',
    'ORD-2026-WB-102', 4, 'pending',
    now() + interval '10 days', 'concierge', true
  ),
  -- 3. In Production (Warli Canvas)
  (
    'ffffffff-0001-0000-0000-000000000003',
    'dddddddd-0001-0000-0000-000000000009',
    'ORD-2026-MH-203', 1, 'in_production',
    now() + interval '7 days', 'retail', false
  ),
  -- 4. In Production (Banarasi Saree)
  (
    'ffffffff-0001-0000-0000-000000000004',
    'dddddddd-0001-0000-0000-000000000017',
    'ORD-2026-UP-304', 1, 'in_production',
    now() + interval '12 days', 'retail', false
  ),
  -- 5. In Production (Kantha Quilt)
  (
    'ffffffff-0001-0000-0000-000000000005',
    'dddddddd-0001-0000-0000-000000000002',
    'ORD-2026-WB-105', 1, 'in_production',
    now() + interval '18 days', 'retail', false
  ),
  -- 6. Ready for Dispatch (Warli Coasters)
  (
    'ffffffff-0001-0000-0000-000000000006',
    'dddddddd-0001-0000-0000-000000000013',
    'ORD-2026-MH-206', 5, 'ready_for_dispatch',
    now() + interval '2 days', 'retail', false
  ),
  -- 7. Ready for Dispatch (Brocade Cushions)
  (
    'ffffffff-0001-0000-0000-000000000007',
    'dddddddd-0001-0000-0000-000000000026',
    'ORD-2026-UP-307', 6, 'ready_for_dispatch',
    now() + interval '1 day', 'retail', false
  ),
  -- 8. Delayed (Silk Shawl due to weather humidity)
  (
    'ffffffff-0001-0000-0000-000000000008',
    'dddddddd-0001-0000-0000-000000000023',
    'ORD-2026-UP-308', 2, 'delayed',
    now() + interval '4 days', 'retail', false
  ),
  -- 9. Delivered (Warli Terracotta Vase)
  (
    'ffffffff-0001-0000-0000-000000000009',
    'dddddddd-0001-0000-0000-000000000010',
    'ORD-2026-MH-209', 2, 'delivered',
    now() - interval '5 days', 'retail', false
  ),
  -- 10. Delivered (Kantha Bed Runner)
  (
    'ffffffff-0001-0000-0000-000000000010',
    'dddddddd-0001-0000-0000-000000000004',
    'ORD-2026-WB-110', 1, 'delivered',
    now() - interval '8 days', 'retail', false
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  expected_dispatch_at = EXCLUDED.expected_dispatch_at;

-- Order Assignments
INSERT INTO public.order_assignments (order_id, artisan_id, assigned_by)
VALUES
  ('ffffffff-0001-0000-0000-000000000003', 'cccccccc-0001-0000-0000-000000000005', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000004', 'cccccccc-0001-0000-0000-000000000009', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000005', 'cccccccc-0001-0000-0000-000000000002', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000006', 'cccccccc-0001-0000-0000-000000000007', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000007', 'cccccccc-0001-0000-0000-000000000010', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000008', 'cccccccc-0001-0000-0000-000000000009', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000009', 'cccccccc-0001-0000-0000-000000000008', 'Sunita Patil (Coordinator)'),
  ('ffffffff-0001-0000-0000-000000000010', 'cccccccc-0001-0000-0000-000000000001', 'Sunita Patil (Coordinator)')
ON CONFLICT DO NOTHING;

-- Order Events Log
INSERT INTO public.order_events (order_id, event_type, note, created_at)
VALUES
  ('ffffffff-0001-0000-0000-000000000001', 'placed', 'Order placed by customer Priya Sharma', now() - interval '1 day'),
  ('ffffffff-0001-0000-0000-000000000003', 'placed', 'Order placed via online storefront', now() - interval '6 days'),
  ('ffffffff-0001-0000-0000-000000000003', 'assigned', 'Assigned to Savita Gavit', now() - interval '5 days'),
  ('ffffffff-0001-0000-0000-000000000003', 'in_production', 'Canvas background mud-wash completed', now() - interval '3 days'),
  ('ffffffff-0001-0000-0000-000000000006', 'qc_passed', 'All 5 coaster sets inspected and verified flawless', now() - interval '1 day'),
  ('ffffffff-0001-0000-0000-000000000009', 'shipped', 'Handed over to India Post parcel service', now() - interval '8 days'),
  ('ffffffff-0001-0000-0000-000000000009', 'delivered', 'Delivered and confirmed by customer OTP', now() - interval '5 days')
ON CONFLICT DO NOTHING;

-- Quality Checks
INSERT INTO public.quality_checks (order_id, artisan_id, result, notes, checked_by)
VALUES
  ('ffffffff-0001-0000-0000-000000000006', 'cccccccc-0001-0000-0000-000000000007', 'passed', 'Surface polish smooth, paint sealed with natural resin', 'Sunita Patil'),
  ('ffffffff-0001-0000-0000-000000000007', 'cccccccc-0001-0000-0000-000000000010', 'passed', 'Zari count and zip alignment match specification', 'Sunita Patil'),
  ('ffffffff-0001-0000-0000-000000000009', 'cccccccc-0001-0000-0000-000000000008', 'passed', 'Kiln firing intact, no micro-fractures in clay', 'Sunita Patil')
ON CONFLICT DO NOTHING;

-- Shipments
INSERT INTO public.shipments (id, order_id, status, carrier, tracking_ref, provider)
VALUES
  ('12121212-0001-0000-0000-000000000006', 'ffffffff-0001-0000-0000-000000000006', 'preparing', 'Delhivery Express', 'DLHV-99882211-MH', 'delhivery'),
  ('12121212-0001-0000-0000-000000000009', 'ffffffff-0001-0000-0000-000000000009', 'delivered', 'India Post SpeedPost', 'SP-MH-77441102-IN', 'india_post'),
  ('12121212-0001-0000-0000-000000000010', 'ffffffff-0001-0000-0000-000000000010', 'delivered', 'BlueDart Surface', 'BD-WB-55331199-IN', 'bluedart')
ON CONFLICT (id) DO NOTHING;

-- Customer Payments & Artisan Disbursements
INSERT INTO public.payments (id, order_id, shg_id, direction, amount, method, status, upi_reference, note)
VALUES
  ('34343434-0001-0000-0000-000000000001', 'ffffffff-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'customer_payment', 6900.00, 'upi_qr', 'recorded', 'UPI/2026/0401/889922', 'Paid via UPI QR on storefront'),
  ('34343434-0001-0000-0000-000000000003', 'ffffffff-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000002', 'customer_payment', 4200.00, 'upi_qr', 'recorded', 'UPI/2026/0329/774411', 'Paid via GPay'),
  ('34343434-0001-0000-0000-000000000009', 'ffffffff-0001-0000-0000-000000000009', 'bbbbbbbb-0001-0000-0000-000000000002', 'payout', 2160.00, 'dbt', 'recorded', 'DBT/2026/0320/991122', 'Simulated DBT wage payout to Laxmi Kurkute')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. THREE B2B REQUESTS (BUYERS, RFPs, QUOTATIONS & SAMPLES)
-- ---------------------------------------------------------------------------
-- 1. FabIndia (Corporate Diwali Gifting)
-- 2. Good Earth (Boutique Heritage Resort Furnishing)
-- 3. Tata CLiQ Luxury (Artisan Provenance Collection)

INSERT INTO public.buyers (id, user_id, org_name, category, contact_name, contact_email, contact_phone, region, intended_use, verification_status)
VALUES
  (
    '77777777-0001-0000-0000-000000000001',
    '99999999-0000-0000-0000-000000000005',
    'FabIndia Overseas Pvt Ltd',
    'Retail Chain & Lifestyle',
    'Priya Nair',
    'buyer.fabindia@kalaswar.demo',
    '+919811223344',
    'New Delhi, NCR',
    'Corporate Diwali gift hampers with authentic artisan provenance',
    'verified'
  ),
  (
    '77777777-0001-0000-0000-000000000002',
    null,
    'Good Earth Design Studio',
    'Luxury Home & Hospitality',
    'Vikramaditya Seth',
    'sourcing@goodearth.example.com',
    '+919822334455',
    'Mumbai, Maharashtra',
    'Custom Kantha bed runners & cushion covers for heritage resort',
    'verified'
  ),
  (
    '77777777-0001-0000-0000-000000000003',
    null,
    'Tata CLiQ Luxury — Indic Heritage',
    'E-Commerce Luxury Portal',
    'Radhika Singhal',
    'radhika.s@tatacliq.example.com',
    '+919833445566',
    'Bengaluru, Karnataka',
    'Exclusive curated Warli panels with blockchain product passports',
    'verified'
  )
ON CONFLICT (id) DO UPDATE SET
  org_name = EXCLUDED.org_name,
  verification_status = EXCLUDED.verification_status;

-- B2B Requests
INSERT INTO public.buyer_requests (id, request_code, buyer_id, title, structured, status)
VALUES
  -- B2B Request 1
  (
    '88888888-0001-0000-0000-000000000001',
    'B2B-REQ-2026-001',
    '77777777-0001-0000-0000-000000000001',
    '500 Handloom Silk Stoles & Warli Art Coasters for Diwali Hampers',
    '{
      "target_delivery_date": "2026-10-15",
      "budget_inr": 850000,
      "items": [
        {"craft": "Handloom Silk Stole", "quantity": 500, "target_unit_price": 1200},
        {"craft": "Warli Wooden Coasters (Set of 4)", "quantity": 500, "target_unit_price": 500}
      ],
      "packaging": "Recycled handmade paper gift box with artisan story card",
      "compliance": "Lead-free natural dyes, SRLM certification"
    }'::jsonb,
    'quoted'
  ),
  -- B2B Request 2
  (
    '88888888-0001-0000-0000-000000000002',
    'B2B-REQ-2026-002',
    '77777777-0001-0000-0000-000000000002',
    '300 Nakshi Kantha Bed Covers & 600 Matching Cushions for Resort',
    '{
      "target_delivery_date": "2026-12-01",
      "budget_inr": 1800000,
      "items": [
        {"craft": "Nakshi Kantha King Bed Cover", "quantity": 300, "target_unit_price": 4500},
        {"craft": "Kantha Linen Cushion Cover", "quantity": 600, "target_unit_price": 750}
      ],
      "custom_spec": "Colorway: Madder red, natural cream, sage green"
    }'::jsonb,
    'under_review'
  ),
  -- B2B Request 3
  (
    '88888888-0001-0000-0000-000000000003',
    'B2B-REQ-2026-003',
    '77777777-0001-0000-0000-000000000003',
    '150 Curated Warli Framed Heritage Panels with Merkle DPP Passports',
    '{
      "target_delivery_date": "2026-11-20",
      "budget_inr": 450000,
      "items": [
        {"craft": "Warli Tarpa Canvas Framed 12x12", "quantity": 150, "target_unit_price": 3000}
      ],
      "provenance_requirement": "On-chain Merkle root on Polygon L2 with public verification QR"
    }'::jsonb,
    'accepted'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status;

-- Quotations & Immutable Versions for B2B Request 1 & 3
INSERT INTO public.quotations (id, buyer_request_id, shg_id, status)
VALUES
  ('66666666-0001-0000-0000-000000000001', '88888888-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000003', 'submitted'),
  ('66666666-0001-0000-0000-000000000002', '88888888-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000002', 'accepted')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotation_versions (id, quotation_id, version, spec, status, created_by)
VALUES
  (
    '55555555-0001-0000-0000-000000000001',
    '66666666-0001-0000-0000-000000000001', 1,
    '{
      "unit_price_inr": 1250,
      "total_inr": 875000,
      "lead_time_days": 42,
      "materials_breakdown": {"silk_yarn_inr": 450, "zari_inr": 200, "finishing_inr": 100},
      "artisan_wage_inr": 400,
      "shg_margin_inr": 100
    }'::jsonb,
    'submitted', 'Sunita Patil (Coordinator)'
  ),
  (
    '55555555-0001-0000-0000-000000000002',
    '66666666-0001-0000-0000-000000000002', 1,
    '{
      "unit_price_inr": 2900,
      "total_inr": 435000,
      "lead_time_days": 30,
      "materials_breakdown": {"teak_frame_inr": 600, "treated_canvas_inr": 350, "natural_pigment_inr": 150},
      "artisan_wage_inr": 1500,
      "dpp_blockchain_fee_inr": 50,
      "shg_margin_inr": 250
    }'::jsonb,
    'accepted', 'Sunita Patil (Coordinator)'
  )
ON CONFLICT (quotation_id, version) DO NOTHING;

-- Sample Request for Request 3
INSERT INTO public.sample_requests (id, quotation_id, buyer_request_id, shg_id, buyer_id, spec, fee_inr, status, feedback)
VALUES
  (
    '44444444-0001-0000-0000-000000000001',
    '66666666-0001-0000-0000-000000000002',
    '88888888-0001-0000-0000-000000000003',
    'bbbbbbbb-0001-0000-0000-000000000002',
    '77777777-0001-0000-0000-000000000003',
    '{"sample_type":"Master artisan signed proof piece","frame":"Natural seasoned teak"}'::jsonb,
    3500.00,
    'approved',
    'Sample approved. Mud wash tone and brush fidelity are exceptional. Proceed with full batch production.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sample_events (sample_id, event_type, note)
VALUES
  ('44444444-0001-0000-0000-000000000001', 'sample_dispatched', 'Proof panel sent via courier to Bengaluru headquarters'),
  ('44444444-0001-0000-0000-000000000001', 'feedback_approved', 'Formal buyer sign-off received via portal')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. DIGITAL PRODUCT PASSPORTS (DPP) ON POLYGON L2
-- ---------------------------------------------------------------------------
-- Note: Rows with polygon_tx_hash set are immutable per prevent_dpp_mutation trigger.
-- Safe insert uses ON CONFLICT (id) DO NOTHING.

INSERT INTO public.dpp_passports (
  id, product_id, merkle_root, merkle_leaf_count,
  polygon_tx_hash, polygon_block, chain, qr_code_url, committed_at
)
VALUES
  -- Passport 1: Committed on Polygon Amoy for Warli Tarpa Canvas
  (
    '22223333-0001-0000-0000-000000000001',
    'dddddddd-0001-0000-0000-000000000009',
    '0x7c4f9a1e3b5d8c2e0f6a4b1d9c7e5a3f2b8d0c6e4a1b9f7d5c3e1a8b6d4f2c0e',
    64,
    '0x9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a',
    4892104,
    'polygon_amoy',
    'https://kalaswar.in/verify/dpp/warli-tarpa-001',
    now() - interval '14 days'
  ),
  -- Passport 2: Committed on Polygon Amoy for Banarasi Katan Silk Saree
  (
    '22223333-0001-0000-0000-000000000002',
    'dddddddd-0001-0000-0000-000000000017',
    '0x3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c',
    32,
    '0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e',
    4910240,
    'polygon_amoy',
    'https://kalaswar.in/verify/dpp/banarasi-saree-002',
    now() - interval '7 days'
  ),
  -- Passport 3: Pending batch commit (merkle root computed, waiting for L2 batch transaction)
  (
    '22223333-0001-0000-0000-000000000003',
    'dddddddd-0001-0000-0000-000000000002',
    '0x5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    16,
    null, null,
    'polygon_amoy',
    'https://kalaswar.in/verify/dpp/nakshi-kantha-quilt-003',
    null
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. VOICE SESSIONS & LISTING DRAFTS (WHATSAPP SIMULATION)
-- ---------------------------------------------------------------------------
INSERT INTO public.voice_sessions (id, whatsapp_phone, artisan_id, shg_id, language, intent, status, step, context, transcript)
VALUES
  (
    '77778888-0001-0000-0000-000000000001',
    '+919810334409',
    'cccccccc-0001-0000-0000-000000000009',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'hi',
    'list_product',
    'completed',
    'confirmed',
    '{"product_name":"Banarasi Zari Border Stole","price_suggestion":2600,"craft":"Handloom Silk"}'::jsonb,
    '[
      {"role":"artisan","text":"Namaste, maine ek naya katan silk stole banaya hai zari border ke saath, isko dukan par dalna hai."},
      {"role":"assistant","text":"Bahut sundar Anita ji! Iska dam aap kitna rakhna chahti hain aur kitne din me dispatch ho sakega?"},
      {"role":"artisan","text":"Iski keemat 2600 rupaye rakhiye aur ye taiyar hai, 2 din me bhej sakte hain."}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.listing_drafts (
  id, artisan_id, shg_id, voice_session_id, source, title, description,
  category, materials, price_suggestion, raw_transcript, ai_assisted, status
)
VALUES
  (
    '66667777-0001-0000-0000-000000000001',
    'cccccccc-0001-0000-0000-000000000009',
    'bbbbbbbb-0001-0000-0000-000000000003',
    '77778888-0001-0000-0000-000000000001',
    'whatsapp',
    'Banarasi Zari Border Katan Silk Stole',
    'Handloom woven pure Katan silk stole with zari selvage borders created by Anita Ansari in Varanasi.',
    'Fashion Accessories',
    ARRAY['Katan silk yarn', 'Zari metallic thread'],
    2600.00,
    'Artisan voice transcript: Namaste, maine ek naya katan silk stole banaya hai zari border ke saath...',
    true,
    'pending_review'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. IMMUTABLE PAYOUT LEDGER & ACTION AUDIT TRAIL
-- ---------------------------------------------------------------------------
-- Payout ledger rows use prevent_payout_mutation trigger (immutable).
-- Safe execution with ON CONFLICT (id) DO NOTHING.

INSERT INTO public.payout_ledger (
  id, artisan_id, shg_id, cluster_id, order_id, payout_type, amount_inr,
  reference, channel, status, is_demo, note
)
VALUES
  (
    '33334444-0001-0000-0000-000000000001',
    'cccccccc-0001-0000-0000-000000000008',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'aaaaaaaa-0001-0000-0000-000000000002',
    'ffffffff-0001-0000-0000-000000000009',
    'wage', 2160.00,
    'DBT-SIM-MH-99881', 'dbt', 'completed', true,
    'Simulated DBT wage payout for Warli vase order completion'
  ),
  (
    '33334444-0001-0000-0000-000000000002',
    'cccccccc-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'aaaaaaaa-0001-0000-0000-000000000001',
    'ffffffff-0001-0000-0000-000000000010',
    'wage', 1850.00,
    'DBT-SIM-WB-77221', 'dbt', 'completed', true,
    'Simulated DBT wage payout for Kantha runner delivery'
  )
ON CONFLICT (id) DO NOTHING;

-- Action Audit Logs
INSERT INTO public.action_audit_logs (id, actor, action, entity, entity_id, payload)
VALUES
  (
    '11110000-0001-0000-0000-000000000001',
    'cluster_registered',
    'shg_clusters',
    'aaaaaaaa-0001-0000-0000-000000000001',
    '{"cluster_name":"Bengal Gramin Hastakala Cluster","srlm_id":"WB-SRLM-0219-DEMO"}'::jsonb
  ),
  (
    '11110000-0001-0000-0000-000000000002',
    'Sunita Patil (SHG Coordinator)',
    'quotation_submitted',
    'quotations',
    '66666666-0001-0000-0000-000000000001',
    '{"buyer_request":"B2B-REQ-2026-001","version":1,"total_inr":875000}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Clean up helper function
DROP FUNCTION IF EXISTS public._demo_hash_pwd(text);

-- =============================================================================
-- SEED COMPLETE
-- =============================================================================
