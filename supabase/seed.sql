-- =============================================================================
-- KALASWAR CANONICAL REFERENCE SEED DATA
-- =============================================================================
-- Contains strictly reference taxonomy, crafts, categories, states, and languages.
-- NO fake users, NO fake products, NO fake orders, NO fake reviews, NO fake content.
-- Safe for idempotent execution across all environments.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reference_categories (
  slug text PRIMARY KEY,
  name text NOT NULL,
  name_hi text,
  name_mr text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reference_crafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  state text NOT NULL,
  gi_registered boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reference_states (
  code text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reference_languages (
  code text PRIMARY KEY,
  name text NOT NULL,
  native_name text NOT NULL
);

-- 1. Reference Categories
INSERT INTO public.reference_categories (slug, name, name_hi, name_mr)
VALUES
  ('textiles-handlooms', 'Textiles & Handlooms', 'वस्त्र एवं हथकरघा', 'कापड आणि हातमाग'),
  ('pottery-terracotta', 'Pottery & Terracotta', 'मिट्टी के बर्तन व टेराकोटा', 'मातीची भांडी आणि टेराकोटा'),
  ('paintings-folk-art', 'Paintings & Folk Art', 'पारंपरिक चित्रकला व लोककला', 'पारंपरिक चित्रे आणि लोककला'),
  ('natural-fiber-crafts', 'Natural Fiber & Grass Crafts', 'प्राकृतिक रेशा व घास शिल्प', 'नैसर्गिक फायबर आणि गवत कला'),
  ('wood-metal-crafts', 'Wood & Metal Crafts', 'काष्ठ एवं धातु शिल्प', 'लाकूड आणि धातू कला'),
  ('jewelry-adornment', 'Jewelry & Adornment', 'पारंपरिक आभूषण', 'पारंपरिक दागिने')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_hi = EXCLUDED.name_hi,
  name_mr = EXCLUDED.name_mr;

-- 2. Reference Crafts
INSERT INTO public.reference_crafts (name, category, state, gi_registered)
VALUES
  ('Kantha Embroidery', 'Textiles & Handlooms', 'West Bengal', true),
  ('Warli Tribal Art', 'Paintings & Folk Art', 'Maharashtra', true),
  ('Banarasi Handloom Silk', 'Textiles & Handlooms', 'Uttar Pradesh', true),
  ('Sikki Grass Craft', 'Natural Fiber & Grass Crafts', 'Bihar', true),
  ('Terracotta Craft', 'Pottery & Terracotta', 'West Bengal', true),
  ('Madhubani Painting', 'Paintings & Folk Art', 'Bihar', true),
  ('Aari Hand Embroidery', 'Textiles & Handlooms', 'Jammu & Kashmir', true),
  ('Kutch Embroidery', 'Textiles & Handlooms', 'Gujarat', true),
  ('Dhokra Metal Casting', 'Wood & Metal Crafts', 'Chhattisgarh', true),
  ('Channapatna Wood Toys', 'Wood & Metal Crafts', 'Karnataka', true),
  ('Blue Pottery', 'Pottery & Terracotta', 'Rajasthan', true),
  ('Kalamkari Art', 'Paintings & Folk Art', 'Andhra Pradesh', true)
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  state = EXCLUDED.state,
  gi_registered = EXCLUDED.gi_registered;

-- 3. Reference States & UTs
INSERT INTO public.reference_states (code, name)
VALUES
  ('AP', 'Andhra Pradesh'),
  ('AR', 'Arunachal Pradesh'),
  ('AS', 'Assam'),
  ('BR', 'Bihar'),
  ('CG', 'Chhattisgarh'),
  ('GA', 'Goa'),
  ('GJ', 'Gujarat'),
  ('HR', 'Haryana'),
  ('HP', 'Himachal Pradesh'),
  ('JH', 'Jharkhand'),
  ('KA', 'Karnataka'),
  ('KL', 'Kerala'),
  ('MP', 'Madhya Pradesh'),
  ('MH', 'Maharashtra'),
  ('MN', 'Manipur'),
  ('ML', 'Meghalaya'),
  ('MZ', 'Mizoram'),
  ('NL', 'Nagaland'),
  ('OD', 'Odisha'),
  ('PB', 'Punjab'),
  ('RJ', 'Rajasthan'),
  ('SK', 'Sikkim'),
  ('TN', 'Tamil Nadu'),
  ('TG', 'Telangana'),
  ('TR', 'Tripura'),
  ('UP', 'Uttar Pradesh'),
  ('UK', 'Uttarakhand'),
  ('WB', 'West Bengal'),
  ('DL', 'Delhi'),
  ('JK', 'Jammu & Kashmir'),
  ('LA', 'Ladakh')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name;

-- 4. Reference Languages
INSERT INTO public.reference_languages (code, name, native_name)
VALUES
  ('en', 'English', 'English'),
  ('hi', 'Hindi', 'हिन्दी'),
  ('mr', 'Marathi', 'मराठी'),
  ('bn', 'Bengali', 'বাংলা'),
  ('gu', 'Gujarati', 'ગુજરાતી')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name;
