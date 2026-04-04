-- Fix RLS policies on media_page_associations
-- The original policies used a complex join that silently filtered all rows.
-- Replace with simple single-join policies checking media.tenant_id directly.

drop policy if exists "Members can read media-page associations" on public.media_page_associations;
drop policy if exists "Members can manage media-page associations" on public.media_page_associations;

-- Simple read: user must be a member of the tenant that owns the media
create policy "Members can read media-page associations"
  on public.media_page_associations for select
  using (
    exists (
      select 1 from public.media
      where media.id = media_page_associations.media_id
      and public.is_member_of(media.tenant_id)
    )
  );

-- Simple write: same check
create policy "Members can manage media-page associations"
  on public.media_page_associations for all
  using (
    exists (
      select 1 from public.media
      where media.id = media_page_associations.media_id
      and public.is_member_of(media.tenant_id)
    )
  );
