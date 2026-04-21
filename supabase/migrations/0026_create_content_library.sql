-- =============================================
-- CONTENT LIBRARY: Generic content tables
-- =============================================
-- Each table stores reusable content records belonging to a tenant.
-- Block renderers can reference these records by ID to avoid
-- duplicate data entry. Table names are generic (no tenant prefix).

-- ── Team members ──────────────────────────────────────────────────────

create table if not exists public.team_members (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  name text not null,
  role text,
  bio text,
  image_id integer references public.media(id) on delete set null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_team_members_tenant on public.team_members(tenant_id);

-- ── Testimonials ──────────────────────────────────────────────────────

create table if not exists public.testimonials (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  name text not null,
  role text,
  content text not null,
  avatar_id integer references public.media(id) on delete set null,
  avatar_url text,
  rating integer check (rating >= 1 and rating <= 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_testimonials_tenant on public.testimonials(tenant_id);

-- ── Portfolio items ───────────────────────────────────────────────────

create table if not exists public.portfolio_items (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  image_id integer references public.media(id) on delete set null,
  image_url text,
  link text,
  category text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_portfolio_items_tenant on public.portfolio_items(tenant_id);

-- ── Blog posts ────────────────────────────────────────────────────────

create table if not exists public.blog_posts (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  title text not null,
  excerpt text,
  body text,
  image_id integer references public.media(id) on delete set null,
  image_url text,
  author text,
  slug text,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blog_posts_tenant on public.blog_posts(tenant_id);
create unique index idx_blog_posts_slug on public.blog_posts(tenant_id, slug) where slug is not null;

-- ── Content events (avoids clash with analytics `events` table) ──────

create table if not exists public.content_events (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  date date not null,
  venue text,
  city text,
  ticket_url text,
  image_id integer references public.media(id) on delete set null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_content_events_tenant on public.content_events(tenant_id);

-- ── RLS policies ──────────────────────────────────────────────────────

alter table public.team_members enable row level security;
alter table public.testimonials enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.blog_posts enable row level security;
alter table public.content_events enable row level security;

-- Public read access (for front-end rendering)
create policy "Public can read active team_members"
  on public.team_members for select using (is_active = true);
create policy "Public can read active testimonials"
  on public.testimonials for select using (is_active = true);
create policy "Public can read active portfolio_items"
  on public.portfolio_items for select using (is_active = true);
create policy "Public can read published blog_posts"
  on public.blog_posts for select using (is_published = true);
create policy "Public can read active content_events"
  on public.content_events for select using (is_active = true);

-- Member read access (admin pages can see all records)
create policy "Members can read all team_members"
  on public.team_members for select using (public.is_member_of(tenant_id));
create policy "Members can read all testimonials"
  on public.testimonials for select using (public.is_member_of(tenant_id));
create policy "Members can read all portfolio_items"
  on public.portfolio_items for select using (public.is_member_of(tenant_id));
create policy "Members can read all blog_posts"
  on public.blog_posts for select using (public.is_member_of(tenant_id));
create policy "Members can read all content_events"
  on public.content_events for select using (public.is_member_of(tenant_id));

-- Member write access (editors+)
create policy "Members can manage team_members"
  on public.team_members for all using (public.is_member_of(tenant_id));
create policy "Members can manage testimonials"
  on public.testimonials for all using (public.is_member_of(tenant_id));
create policy "Members can manage portfolio_items"
  on public.portfolio_items for all using (public.is_member_of(tenant_id));
create policy "Members can manage blog_posts"
  on public.blog_posts for all using (public.is_member_of(tenant_id));
create policy "Members can manage content_events"
  on public.content_events for all using (public.is_member_of(tenant_id));

-- Platform admin policies (service role bypasses RLS, but for completeness)
create policy "Platform admins can manage team_members"
  on public.team_members for all using (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
create policy "Platform admins can manage testimonials"
  on public.testimonials for all using (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
create policy "Platform admins can manage portfolio_items"
  on public.portfolio_items for all using (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
create policy "Platform admins can manage blog_posts"
  on public.blog_posts for all using (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
create policy "Platform admins can manage content_events"
  on public.content_events for all using (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );
