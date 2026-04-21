-- Fix page template feature_key values that referenced non-existent flag keys.
-- 'about_page' → 'basic_pages' (available on all plans)
-- 'pricing_table' → 'analytics' (growth/pro)
-- 'documentation' → 'seo_tools' (growth/pro)
UPDATE public.pages
  SET feature_key = 'basic_pages'
  WHERE feature_key = 'about_page'
    AND page_type = 'template';

UPDATE public.pages
  SET feature_key = 'analytics'
  WHERE feature_key = 'pricing_table'
    AND page_type = 'template';

UPDATE public.pages
  SET feature_key = 'seo_tools'
  WHERE feature_key = 'documentation'
    AND page_type = 'template';
