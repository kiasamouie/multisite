-- Allow public (anon + authenticated) to read media-page associations
-- for published pages. This enables server-side public page rendering
-- to resolve attached media without requiring tenant membership.

drop policy if exists "Public can read associations for published pages" on public.media_page_associations;

create policy "Public can read associations for published pages"
  on public.media_page_associations for select
  using (
    exists (
      select 1 from public.pages
      where pages.id = media_page_associations.page_id
        and pages.is_published = true
    )
  );
