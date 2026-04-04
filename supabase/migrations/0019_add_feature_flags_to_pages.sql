-- Add feature flag integration and page configuration to pages table
-- This links pages to feature flags and allows storing page-specific config

ALTER TABLE public.pages ADD COLUMN feature_key text;
ALTER TABLE public.pages ADD COLUMN page_config jsonb DEFAULT '{}';
ALTER TABLE public.pages ADD COLUMN page_type text DEFAULT 'custom';

-- Unique partial index: one feature template per tenant
-- (custom pages can have feature_key = null, multiple custom pages allowed)
CREATE UNIQUE INDEX idx_unique_feature_per_tenant 
  ON public.pages(tenant_id, feature_key) 
  WHERE feature_key IS NOT NULL AND page_type = 'template';

-- Index for fast lookups by feature
CREATE INDEX idx_pages_feature_key ON public.pages(tenant_id, feature_key) WHERE feature_key IS NOT NULL;

-- Index for finding visible pages
CREATE INDEX idx_pages_visible ON public.pages(tenant_id, is_published, page_type);

-- Comment for documentation
COMMENT ON COLUMN public.pages.feature_key IS 'Links page to a feature flag key when page_type=''template''';
COMMENT ON COLUMN public.pages.page_config IS 'Stores page-specific configuration as JSONB (form endpoints, colors, text, blocks layout, etc.)';
COMMENT ON COLUMN public.pages.page_type IS 'Distinguishes between feature-based templates, custom bespoke pages, and core system pages';
