-- Feature flag defaults (per plan tier — reference only, actual defaults computed in code)
create table public.feature_flag_defaults (
  id serial primary key,
  plan_tier text not null check (plan_tier in ('starter', 'growth', 'pro')),
  key text not null,
  default_enabled boolean not null default true,
  unique(plan_tier, key)
);

-- Seed defaults from plan configs
insert into public.feature_flag_defaults (plan_tier, key, default_enabled) values
  ('starter', 'basic_pages', true),
  ('starter', 'contact_form', true),
  ('starter', 'media_upload', true),
  ('starter', 'custom_domain', false),
  ('starter', 'analytics', false),
  ('starter', 'blog', false),
  ('starter', 'seo_tools', false),
  ('starter', 'advanced_analytics', false),
  ('starter', 'api_access', false),
  ('starter', 'white_label', false),
  ('starter', 'priority_support', false),
  ('starter', 'integrations', false),

  ('growth', 'basic_pages', true),
  ('growth', 'contact_form', true),
  ('growth', 'media_upload', true),
  ('growth', 'custom_domain', true),
  ('growth', 'analytics', true),
  ('growth', 'blog', true),
  ('growth', 'seo_tools', true),
  ('growth', 'advanced_analytics', false),
  ('growth', 'api_access', false),
  ('growth', 'white_label', false),
  ('growth', 'priority_support', false),
  ('growth', 'integrations', false),

  ('pro', 'basic_pages', true),
  ('pro', 'contact_form', true),
  ('pro', 'media_upload', true),
  ('pro', 'custom_domain', true),
  ('pro', 'analytics', true),
  ('pro', 'blog', true),
  ('pro', 'seo_tools', true),
  ('pro', 'advanced_analytics', true),
  ('pro', 'api_access', true),
  ('pro', 'white_label', true),
  ('pro', 'priority_support', true),
  ('pro', 'integrations', true);
