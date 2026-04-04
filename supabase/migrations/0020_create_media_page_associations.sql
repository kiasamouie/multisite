-- Create media_page_associations junction table for many-to-many relationship
-- Allows flexible media-to-page associations across all page types

create table public.media_page_associations (
  id serial primary key,
  media_id integer not null references public.media(id) on delete cascade,
  page_id integer not null references public.pages(id) on delete cascade,
  usage_type text default 'general', -- 'hero', 'gallery', 'thumbnail', 'general', etc.
  position integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(media_id, page_id) -- Prevent duplicate associations
);

-- Indexes for common queries
create index idx_media_page_associations_media on public.media_page_associations(media_id);
create index idx_media_page_associations_page on public.media_page_associations(page_id);
create index idx_media_page_associations_usage on public.media_page_associations(usage_type);

-- Trigger to update updated_at timestamp
create trigger media_page_associations_updated_at
  before update on public.media_page_associations
  for each row execute function public.set_updated_at();

-- =============================================
-- RLS POLICIES for media_page_associations
-- =============================================
alter table public.media_page_associations enable row level security;

-- Members can read associations for pages in their tenants
create policy "Members can read media-page associations"
  on public.media_page_associations for select
  using (
    exists (
      select 1 from public.media
      join public.pages on pages.id = media_page_associations.page_id
      where media.id = media_page_associations.media_id
      and media.tenant_id = pages.tenant_id
      and public.is_member_of(media.tenant_id)
    )
  );

-- Members can manage associations for their tenant's media and pages
create policy "Members can manage media-page associations"
  on public.media_page_associations for all
  using (
    exists (
      select 1 from public.media
      join public.pages on pages.id = media_page_associations.page_id
      where media.id = media_page_associations.media_id
      and media.tenant_id = pages.tenant_id
      and public.is_member_of(media.tenant_id)
    )
  );
