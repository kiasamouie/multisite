-- Backfill admin_section feature flag for existing tenants that don't have it yet.
-- growth and pro tenants get admin_section = true, starter gets false.
INSERT INTO public.feature_flags (tenant_id, key, enabled)
SELECT
  t.id,
  'admin_section',
  (t.plan IN ('growth', 'pro'))
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags ff
  WHERE ff.tenant_id = t.id AND ff.key = 'admin_section'
);
