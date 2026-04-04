-- Add is_homepage flag to pages (only one homepage per tenant)
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS is_homepage BOOLEAN DEFAULT false;

-- Unique partial index: one homepage per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_one_homepage_per_tenant
  ON public.pages (tenant_id)
  WHERE is_homepage = true;

-- Add branding and nav_config JSONB columns to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS nav_config JSONB DEFAULT '{}';
