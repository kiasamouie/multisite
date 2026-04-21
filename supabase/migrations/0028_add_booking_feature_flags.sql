-- =============================================
-- BOOKING SYSTEM: Feature flag defaults
-- =============================================
-- booking_system: Growth + Pro only
-- booking_reminders: Pro only (reserved for future cron-based 24h-before reminder)

INSERT INTO public.feature_flag_defaults (plan_tier, key, default_enabled) VALUES
  ('starter', 'booking_system',    false),
  ('growth',  'booking_system',    true),
  ('pro',     'booking_system',    true),
  ('starter', 'booking_reminders', false),
  ('growth',  'booking_reminders', false),
  ('pro',     'booking_reminders', true);
