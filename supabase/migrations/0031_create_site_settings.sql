-- =============================================
-- SITE SETTINGS
-- =============================================
-- Per-tenant, namespaced site settings stored as JSONB.
-- Each tenant has at most one row per namespace. Common namespaces:
--   theme        — palette, fonts, dark/light mode preference for the public site
--   navigation   — smooth-scroll toggle, default homepage behaviour, etc.
--   header       — site header configuration (slot items, nav pages)
--   footer       — site footer configuration (slot items)
--   seo          — meta defaults, robots, sitemap toggles
--   advanced     — custom CSS, custom head HTML, redirect rules
-- New namespaces can be added without a schema change.

CREATE TABLE IF NOT EXISTS public.site_settings (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  namespace    TEXT    NOT NULL,
  value        JSONB   NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, namespace)
);

CREATE INDEX IF NOT EXISTS idx_site_settings_tenant_ns
  ON public.site_settings (tenant_id, namespace);

-- Reuse the existing updated_at trigger function from migration 0010.
DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- RLS — tenant members manage their own row;
-- platform admins bypass.
-- =============================================
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read site settings" ON public.site_settings;
CREATE POLICY "Members can read site settings"
  ON public.site_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = site_settings.tenant_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can write site settings" ON public.site_settings;
CREATE POLICY "Members can write site settings"
  ON public.site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = site_settings.tenant_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = site_settings.tenant_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Platform admins can manage site settings" ON public.site_settings;
CREATE POLICY "Platform admins can manage site settings"
  ON public.site_settings FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
