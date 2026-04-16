-- Backfill template pages that have 0 sections with default content.
-- This handles tenants provisioned before the sections+blocks provisioning was added.
-- Each template page gets a single "default" section with a hero block.
-- For richer content, re-provision by calling syncTenantPlan().

DO $$
DECLARE
  page_row RECORD;
  new_section_id INT;
BEGIN
  FOR page_row IN
    SELECT p.id, p.feature_key, p.slug
    FROM pages p
    WHERE p.page_type = 'template'
      AND NOT EXISTS (
        SELECT 1 FROM sections s WHERE s.page_id = p.id
      )
  LOOP
    -- Insert a default section
    INSERT INTO sections (page_id, type, position)
    VALUES (page_row.id, 'default', 0)
    RETURNING id INTO new_section_id;

    -- Insert a hero block with the page title as content
    INSERT INTO blocks (section_id, type, content, position)
    VALUES (
      new_section_id,
      'hero',
      jsonb_build_object(
        'title', COALESCE(
          CASE page_row.slug
            WHEN 'home' THEN 'Welcome to Our Business'
            WHEN 'about' THEN 'About Us'
            WHEN 'contact' THEN 'Get in Touch'
            WHEN 'gallery' THEN 'Our Gallery'
            WHEN 'blog' THEN 'Our Blog'
            WHEN 'faq' THEN 'Frequently Asked Questions'
            WHEN 'pricing' THEN 'Our Pricing'
            WHEN 'services' THEN 'Our Services'
            WHEN 'portfolio' THEN 'Our Portfolio'
            WHEN 'team' THEN 'Our Team'
            WHEN 'events' THEN 'Upcoming Events'
            WHEN 'reviews' THEN 'Customer Reviews'
            ELSE 'Welcome'
          END
        ),
        'subtitle', 'This page is being set up. Check back soon for content.'
      ),
      0
    );
  END LOOP;
END
$$;
