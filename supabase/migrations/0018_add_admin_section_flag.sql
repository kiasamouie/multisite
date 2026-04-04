-- Add admin_section flag to feature_flag_defaults
insert into public.feature_flag_defaults (plan_tier, key, default_enabled) values
  ('starter', 'admin_section', false),
  ('growth', 'admin_section', true),
  ('pro', 'admin_section', true);
