-- Add slug column to tenants for dev-mode tenant switching
-- Slug is a short unique identifier (e.g. "kaimusic") separate from production domain

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill: derive slug from domain (take first segment before dots)
UPDATE tenants SET slug = split_part(domain, '.', 1) WHERE slug IS NULL;

-- Make it unique and not null going forward
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique_idx ON tenants (slug) WHERE slug IS NOT NULL;

-- Seed slugs for demo tenants
UPDATE tenants SET slug = 'platform' WHERE domain = 'localhost' AND slug IS NULL OR slug = 'localhost';
UPDATE tenants SET slug = 'proplumb' WHERE domain = 'proplumb.localhost' AND (slug IS NULL OR slug = 'proplumb');
UPDATE tenants SET slug = 'kaimusic' WHERE domain = 'kaimusic.localhost' AND (slug IS NULL OR slug = 'kaimusic');
