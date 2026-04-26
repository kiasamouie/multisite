-- =============================================
-- SECTION ANCHORS
-- =============================================
-- Optional per-section URL anchor slug. When set, the public renderer emits
-- `<section id="{anchor_slug}">` enabling deep-links like `/about#pricing`.
-- Uniqueness is only meaningful within a single page; enforced at the
-- application layer (we'd need a partial unique constraint per page which is
-- not strictly required for correctness — duplicates simply break that nav
-- link, not the page).

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS anchor_slug TEXT;

-- Optional kebab-case sanity check — empty string disallowed.
-- A NULL value (the common case) means "no anchor".
ALTER TABLE public.sections
  DROP CONSTRAINT IF EXISTS sections_anchor_slug_format;
ALTER TABLE public.sections
  ADD CONSTRAINT sections_anchor_slug_format
  CHECK (
    anchor_slug IS NULL
    OR (
      LENGTH(anchor_slug) BETWEEN 1 AND 64
      AND anchor_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sections_page_anchor
  ON public.sections (page_id, anchor_slug)
  WHERE anchor_slug IS NOT NULL;
