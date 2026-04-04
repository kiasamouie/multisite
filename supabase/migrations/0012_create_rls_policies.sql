-- =============================================
-- RLS POLICIES FOR ALL TABLES
-- =============================================
-- Strategy: Users can only access data for tenants they are members of.
-- Service role key (admin client) bypasses RLS entirely.

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.pages enable row level security;
alter table public.sections enable row level security;
alter table public.blocks enable row level security;
alter table public.media enable row level security;
alter table public.subscriptions enable row level security;
alter table public.feature_flags enable row level security;
alter table public.feature_flag_defaults enable row level security;
alter table public.events enable row level security;
alter table public.tenant_integrations enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: check if user is a member of a tenant
create or replace function public.is_member_of(p_tenant_id integer)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
    and tenant_id = p_tenant_id
  );
$$ language sql security definer stable;

-- Helper: check if user is owner/admin of a tenant
create or replace function public.is_admin_of(p_tenant_id integer)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
    and tenant_id = p_tenant_id
    and role in ('owner', 'admin')
  );
$$ language sql security definer stable;

-- =============================================
-- TENANTS
-- =============================================
-- Public: anyone can read tenant by domain (for page resolution)
create policy "Public can read tenant by domain"
  on public.tenants for select
  using (true);

-- Members can update their tenant
create policy "Admins can update tenant"
  on public.tenants for update
  using (public.is_admin_of(id));

-- =============================================
-- MEMBERSHIPS
-- =============================================
create policy "Users can read own memberships"
  on public.memberships for select
  using (user_id = auth.uid());

create policy "Owners can manage memberships"
  on public.memberships for all
  using (public.is_admin_of(tenant_id));

-- =============================================
-- PAGES
-- =============================================
-- Public: anyone can read published pages
create policy "Public can read published pages"
  on public.pages for select
  using (is_published = true);

-- Members can read all pages (including drafts)
create policy "Members can read all pages"
  on public.pages for select
  using (public.is_member_of(tenant_id));

-- Members can insert/update/delete pages
create policy "Members can manage pages"
  on public.pages for all
  using (public.is_member_of(tenant_id));

-- =============================================
-- SECTIONS
-- =============================================
-- Public: can read sections of published pages
create policy "Public can read sections"
  on public.sections for select
  using (
    exists (
      select 1 from public.pages
      where pages.id = sections.page_id
      and pages.is_published = true
    )
  );

-- Members can manage sections
create policy "Members can manage sections"
  on public.sections for all
  using (
    exists (
      select 1 from public.pages
      where pages.id = sections.page_id
      and public.is_member_of(pages.tenant_id)
    )
  );

-- =============================================
-- BLOCKS
-- =============================================
-- Public: can read blocks of published page sections
create policy "Public can read blocks"
  on public.blocks for select
  using (
    exists (
      select 1 from public.sections
      join public.pages on pages.id = sections.page_id
      where sections.id = blocks.section_id
      and pages.is_published = true
    )
  );

-- Members can manage blocks
create policy "Members can manage blocks"
  on public.blocks for all
  using (
    exists (
      select 1 from public.sections
      join public.pages on pages.id = sections.page_id
      where sections.id = blocks.section_id
      and public.is_member_of(pages.tenant_id)
    )
  );

-- =============================================
-- MEDIA
-- =============================================
create policy "Members can read media"
  on public.media for select
  using (public.is_member_of(tenant_id));

create policy "Members can manage media"
  on public.media for all
  using (public.is_member_of(tenant_id));

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
create policy "Members can read subscriptions"
  on public.subscriptions for select
  using (public.is_member_of(tenant_id));

-- Only service role can insert/update (webhook handler)

-- =============================================
-- FEATURE FLAGS
-- =============================================
create policy "Members can read feature flags"
  on public.feature_flags for select
  using (public.is_member_of(tenant_id));

create policy "Admins can manage feature flags"
  on public.feature_flags for all
  using (public.is_admin_of(tenant_id));

-- =============================================
-- FEATURE FLAG DEFAULTS
-- =============================================
-- Everyone can read defaults (public reference data)
create policy "Anyone can read feature flag defaults"
  on public.feature_flag_defaults for select
  using (true);

-- =============================================
-- EVENTS
-- =============================================
-- Members can read events
create policy "Members can read events"
  on public.events for select
  using (public.is_member_of(tenant_id));

-- Insert is done via service role (API routes)

-- =============================================
-- TENANT INTEGRATIONS
-- =============================================
create policy "Admins can read integrations"
  on public.tenant_integrations for select
  using (public.is_admin_of(tenant_id));

create policy "Admins can manage integrations"
  on public.tenant_integrations for all
  using (public.is_admin_of(tenant_id));

-- =============================================
-- AUDIT LOGS
-- =============================================
create policy "Admins can read audit logs"
  on public.audit_logs for select
  using (public.is_admin_of(tenant_id));

-- Insert is done via service role
