-- Add sort_order column to pages for drag-to-reorder support
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill existing rows: per-tenant ROW_NUMBER ordered by created_at
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.pages
  WHERE sort_order IS NULL
)
UPDATE public.pages p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

-- Index for ordered listings per tenant
CREATE INDEX IF NOT EXISTS idx_pages_tenant_sort_order
  ON public.pages (tenant_id, sort_order);
