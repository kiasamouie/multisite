-- ===================================================================
-- Seed: Platform marketing tenant + 2 demo tenants with sample content
-- ===================================================================

-- 1. PLATFORM / MARKETING TENANT (the public-facing website at localhost:3000)
INSERT INTO tenants (name, domain, plan, admin_enabled, branding, nav_config)
VALUES (
  'Multisite Platform',
  'localhost',
  'pro',
  false,
  '{"primary_color":"#2563eb","accent_color":"#7c3aed","bg_color":"#ffffff","font_family":"Inter, sans-serif"}',
  '{"links":[{"label":"Features","href":"/features"},{"label":"Pricing","href":"/pricing"},{"label":"About","href":"/about"}],"cta":{"label":"Get Started","href":"/pricing"}}'
)
ON CONFLICT (domain) DO NOTHING;

-- 2. PROPLUMB — plumber/contractor demo
INSERT INTO tenants (name, domain, plan, admin_enabled, branding, nav_config)
VALUES (
  'ProPlumb Solutions',
  'proplumb.localhost',
  'growth',
  true,
  '{"primary_color":"#0891b2","accent_color":"#f59e0b","bg_color":"#f8fafc","font_family":"Inter, sans-serif","logo_url":""}',
  '{"links":[{"label":"Services","href":"/services"},{"label":"About","href":"/about"},{"label":"Gallery","href":"/gallery"}],"cta":{"label":"Get a Quote","href":"/contact"}}'
)
ON CONFLICT (domain) DO NOTHING;

-- 3. KAI MUSIC — musician portfolio demo
INSERT INTO tenants (name, domain, plan, admin_enabled, branding, nav_config)
VALUES (
  'Kai Music',
  'kaimusic.localhost',
  'pro',
  true,
  '{"primary_color":"#7c3aed","accent_color":"#ec4899","bg_color":"#0f0f0f","font_family":"Inter, sans-serif","logo_url":""}',
  '{"links":[{"label":"Music","href":"/music"},{"label":"Events","href":"/events"},{"label":"Bio","href":"/bio"}],"cta":{"label":"Book Me","href":"/contact"}}'
)
ON CONFLICT (domain) DO NOTHING;

-- ===================================================================
-- PAGES + SECTIONS + BLOCKS for each tenant
-- ===================================================================

-- Helper: We reference tenants by domain to keep this idempotent.

-- ── PLATFORM MARKETING ──────────────────────────────────────────────

-- Homepage
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'home', 'Build Beautiful Websites', true, true
FROM tenants WHERE domain = 'localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'hero', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'hero', '{"title":"Build stunning multi-tenant websites","subtitle":"The all-in-one platform for agencies, freelancers, and SaaS builders. Launch beautiful, branded websites for every client — from a single dashboard.","cta_text":"Start Free Trial","cta_link":"/pricing","background_url":""}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'home' AND s.type = 'hero'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'features', 1
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'features_list', '{"title":"Everything you need","subtitle":"A complete toolkit for building and managing multi-tenant websites.","features":[{"title":"24+ Block Types","description":"Hero, gallery, pricing, FAQ, testimonials, and more — all drag-and-drop ready.","icon":"widgets"},{"title":"Full Branding Control","description":"Custom colors, fonts, logos, and favicons per tenant. Each site looks unique.","icon":"palette"},{"title":"Built-in Billing","description":"Stripe integration with starter, growth, and pro plans. Manage subscriptions effortlessly.","icon":"payments"},{"title":"Feature Flags","description":"Toggle features per tenant or per plan tier. Ship with confidence.","icon":"toggle_on"},{"title":"Media Library","description":"Upload and manage images per tenant with built-in storage.","icon":"image"},{"title":"SEO Ready","description":"Per-page metadata, clean URLs, and server-rendered pages for lightning-fast load times.","icon":"search"}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'home' AND s.type = 'features'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'cta', 2
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'cta', '{"title":"Ready to launch your next project?","subtitle":"Join hundreds of agencies already building with Multisite.","cta_text":"Get Started","cta_link":"/pricing"}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'home' AND s.type = 'cta'
ON CONFLICT DO NOTHING;

-- Pricing page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'pricing', 'Pricing Plans', true, false
FROM tenants WHERE domain = 'localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'pricing', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'pricing'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'pricing_table', '{"title":"Simple, transparent pricing","subtitle":"Choose the plan that fits your needs.","plans":[{"name":"Starter","price":"$0","period":"forever","features":["1 website","5 pages","Basic blocks","Community support"],"cta_text":"Start Free","cta_link":"/admin","highlighted":false},{"name":"Growth","price":"$29","period":"/month","features":["5 websites","Unlimited pages","All blocks","Priority support","Custom domain","Analytics"],"cta_text":"Start Trial","cta_link":"/admin","highlighted":true},{"name":"Pro","price":"$79","period":"/month","features":["Unlimited websites","Unlimited pages","All blocks","Dedicated support","Custom domain","Analytics","API access","Feature flags","White-label"],"cta_text":"Contact Sales","cta_link":"/contact","highlighted":false}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'pricing' AND s.type = 'pricing'
ON CONFLICT DO NOTHING;

-- Features page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'features', 'Platform Features', true, false
FROM tenants WHERE domain = 'localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'content', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'features'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'heading', '{"text":"Platform Features","level":1,"align":"center"}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'features' AND s.type = 'content'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'rich_text', '{"html":"<p class=\"text-center text-lg text-gray-600\">Everything you need to build, manage, and scale multi-tenant websites — all from a single dashboard.</p>"}', 1
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'localhost' AND p.slug = 'features' AND s.type = 'content'
ON CONFLICT DO NOTHING;

-- ── PROPLUMB ────────────────────────────────────────────────────────

-- Homepage
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'home', 'Professional Plumbing Services', true, true
FROM tenants WHERE domain = 'proplumb.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'hero', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'hero', '{"title":"Your Trusted Local Plumber","subtitle":"24/7 emergency service. Licensed & insured. Serving the greater metro area for over 15 years.","cta_text":"Get a Free Quote","cta_link":"/contact","background_url":""}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home' AND s.type = 'hero'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'services', 1
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'features_list', '{"title":"Our Services","subtitle":"From leaky faucets to full renovations, we handle it all.","features":[{"title":"Emergency Repairs","description":"24/7 response for burst pipes, floods, and urgent plumbing issues.","icon":"plumbing"},{"title":"Bathroom Remodeling","description":"Complete bathroom renovations from design to installation.","icon":"bathtub"},{"title":"Drain Cleaning","description":"Professional drain cleaning and clog removal for homes and businesses.","icon":"water_drop"},{"title":"Water Heater Service","description":"Installation, repair, and maintenance of all water heater types.","icon":"local_fire_department"}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home' AND s.type = 'services'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'social', 2
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'stats', '{"items":[{"value":"500+","label":"Jobs Completed"},{"value":"15+","label":"Years Experience"},{"value":"4.9","label":"Star Rating"},{"value":"24/7","label":"Availability"}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home' AND s.type = 'social'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'hours', 3
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'opening_hours', '{"title":"Business Hours","hours":[{"day":"Monday - Friday","time":"7:00 AM - 6:00 PM"},{"day":"Saturday","time":"8:00 AM - 4:00 PM"},{"day":"Sunday","time":"Emergency Only"}],"note":"Emergency service available 24/7. Call us anytime."}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'home' AND s.type = 'hours'
ON CONFLICT DO NOTHING;

-- Services page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'services', 'Our Services', true, false
FROM tenants WHERE domain = 'proplumb.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

-- About page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'about', 'About Us', true, false
FROM tenants WHERE domain = 'proplumb.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

-- Contact page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'contact', 'Contact Us', true, false
FROM tenants WHERE domain = 'proplumb.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'contact', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'contact'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'contact_form', '{"title":"Get in Touch","subtitle":"Fill out the form below and we will get back to you within 24 hours.","fields":["name","email","phone","message"]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'proplumb.localhost' AND p.slug = 'contact' AND s.type = 'contact'
ON CONFLICT DO NOTHING;

-- ── KAI MUSIC ───────────────────────────────────────────────────────

-- Homepage
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'home', 'Kai — Musician & Producer', true, true
FROM tenants WHERE domain = 'kaimusic.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'hero', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'hero', '{"title":"Kai","subtitle":"Musician • Producer • Songwriter. Blending electronic beats with soul, jazz, and everything in between.","cta_text":"Listen Now","cta_link":"/music","background_url":""}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home' AND s.type = 'hero'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'portfolio', 1
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'portfolio', '{"title":"Latest Releases","items":[{"title":"Midnight Waves","description":"A 6-track EP blending lo-fi beats with ambient textures.","image_url":"","link":"#"},{"title":"City Lights","description":"Single featuring vocalist Luna Park.","image_url":"","link":"#"},{"title":"Echoes","description":"Studio album — 12 tracks of electronic soul.","image_url":"","link":"#"}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home' AND s.type = 'portfolio'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'events', 2
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'events_list', '{"title":"Upcoming Shows","events":[{"name":"Summer Sound Festival","date":"2025-07-15","venue":"Riverside Park Amphitheater","city":"Portland, OR","link":"#"},{"name":"Jazz & Beats Night","date":"2025-08-02","venue":"The Blue Note","city":"New York, NY","link":"#"},{"name":"Electronic Soul Tour","date":"2025-09-10","venue":"The Fillmore","city":"San Francisco, CA","link":"#"}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home' AND s.type = 'events'
ON CONFLICT DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'social', 3
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'social_links', '{"title":"Follow Kai","links":[{"platform":"spotify","url":"https://spotify.com","label":"Spotify"},{"platform":"instagram","url":"https://instagram.com","label":"Instagram"},{"platform":"youtube","url":"https://youtube.com","label":"YouTube"},{"platform":"soundcloud","url":"https://soundcloud.com","label":"SoundCloud"}]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'home' AND s.type = 'social'
ON CONFLICT DO NOTHING;

-- Music page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'music', 'Music', true, false
FROM tenants WHERE domain = 'kaimusic.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

-- Events page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'events', 'Events', true, false
FROM tenants WHERE domain = 'kaimusic.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

-- Bio page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'bio', 'About Kai', true, false
FROM tenants WHERE domain = 'kaimusic.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

-- Contact page
INSERT INTO pages (tenant_id, slug, title, is_published, is_homepage)
SELECT id, 'contact', 'Get in Touch', true, false
FROM tenants WHERE domain = 'kaimusic.localhost'
ON CONFLICT ON CONSTRAINT pages_tenant_id_slug_key DO NOTHING;

INSERT INTO sections (page_id, type, position)
SELECT p.id, 'contact', 0
FROM pages p JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'contact'
ON CONFLICT DO NOTHING;

INSERT INTO blocks (section_id, type, content, position)
SELECT s.id, 'contact_form', '{"title":"Book Me","subtitle":"For bookings, collaborations, or press inquiries — drop me a line.","fields":["name","email","message"]}', 0
FROM sections s JOIN pages p ON s.page_id = p.id JOIN tenants t ON p.tenant_id = t.id
WHERE t.domain = 'kaimusic.localhost' AND p.slug = 'contact' AND s.type = 'contact'
ON CONFLICT DO NOTHING;

-- ===================================================================
-- FEATURE FLAG DEFAULTS for each plan tier
-- ===================================================================

INSERT INTO feature_flag_defaults (plan_tier, key, default_enabled) VALUES
  ('starter', 'custom_domain', false),
  ('starter', 'analytics', false),
  ('starter', 'api_access', false),
  ('starter', 'custom_features', false),
  ('starter', 'white_label', false),
  ('growth', 'custom_domain', true),
  ('growth', 'analytics', true),
  ('growth', 'api_access', false),
  ('growth', 'custom_features', true),
  ('growth', 'white_label', false),
  ('pro', 'custom_domain', true),
  ('pro', 'analytics', true),
  ('pro', 'api_access', true),
  ('pro', 'custom_features', true),
  ('pro', 'white_label', true)
ON CONFLICT DO NOTHING;
