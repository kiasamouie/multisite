-- =============================================
-- PLATFORM ADMIN RLS POLICIES
-- =============================================
-- Platform admins (super_admin / platform_admin) should have full access
-- to all tables. Because platform_admins has RLS enabled with no public
-- policies, we need a SECURITY DEFINER function to check membership.

create or replace function public.is_platform_admin()
returns boolean as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$ language sql security definer stable;

-- =============================================
-- TENANTS — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage tenants" on public.tenants;
create policy "Platform admins can manage tenants"
  on public.tenants for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- MEMBERSHIPS — platform admins can do everything
-- (needed to bootstrap the first member of a new tenant)
-- =============================================
drop policy if exists "Platform admins can manage memberships" on public.memberships;
create policy "Platform admins can manage memberships"
  on public.memberships for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- PAGES — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage pages" on public.pages;
create policy "Platform admins can manage pages"
  on public.pages for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- SECTIONS — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage sections" on public.sections;
create policy "Platform admins can manage sections"
  on public.sections for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- BLOCKS — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage blocks" on public.blocks;
create policy "Platform admins can manage blocks"
  on public.blocks for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- MEDIA — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage media" on public.media;
create policy "Platform admins can manage media"
  on public.media for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- SUBSCRIPTIONS — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage subscriptions" on public.subscriptions;
create policy "Platform admins can manage subscriptions"
  on public.subscriptions for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- FEATURE FLAGS — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage feature flags" on public.feature_flags;
create policy "Platform admins can manage feature flags"
  on public.feature_flags for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- FEATURE FLAG DEFAULTS — platform admins can manage
-- =============================================
drop policy if exists "Platform admins can manage feature flag defaults" on public.feature_flag_defaults;
create policy "Platform admins can manage feature flag defaults"
  on public.feature_flag_defaults for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- EVENTS — platform admins can read all events
-- =============================================
drop policy if exists "Platform admins can manage events" on public.events;
create policy "Platform admins can manage events"
  on public.events for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- TENANT INTEGRATIONS — platform admins can do everything
-- =============================================
drop policy if exists "Platform admins can manage tenant integrations" on public.tenant_integrations;
create policy "Platform admins can manage tenant integrations"
  on public.tenant_integrations for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================
-- AUDIT LOGS — platform admins can read all
-- =============================================
drop policy if exists "Platform admins can manage audit logs" on public.audit_logs;
create policy "Platform admins can manage audit logs"
  on public.audit_logs for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
