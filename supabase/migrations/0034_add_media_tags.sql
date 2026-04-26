-- Add tags column to media table for flexible media tagging/filtering
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- GIN index for efficient array containment queries (e.g. @>, &&)
CREATE INDEX IF NOT EXISTS idx_media_tags ON public.media USING GIN (tags);
