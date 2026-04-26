-- Platform-level settings (super admin only)
-- Namespaced JSONB config table with no tenant_id (global to the platform).

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id         SERIAL PRIMARY KEY,
  namespace  TEXT        NOT NULL UNIQUE,
  value      JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reuse the existing updated_at trigger function
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read or write platform settings
CREATE POLICY "Platform admins can manage platform settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING  (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Seed default values so reads always find a row
INSERT INTO public.platform_settings (namespace, value) VALUES
  ('general',  '{"platformName":"Multisite","supportEmail":"","description":""}'),
  ('security', '{"allowPublicSignup":true,"requireEmailVerification":false}'),
  ('plans',    '{"trialDays":14,"defaultPlan":"starter"}')
ON CONFLICT (namespace) DO NOTHING;
