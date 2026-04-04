-- Add platform admin RLS policy for media_page_associations.
-- Previously missing from 0017_platform_admin_rls.sql, which caused
-- platform admins to receive empty arrays for nested association queries
-- via the browser Supabase client.

drop policy if exists "Platform admins can manage media-page associations" on public.media_page_associations;
create policy "Platform admins can manage media-page associations"
  on public.media_page_associations for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
