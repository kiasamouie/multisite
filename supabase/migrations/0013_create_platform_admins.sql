-- Platform admins: users who manage the entire platform (not tenant-scoped)
-- Only accessible via service_role key — no public RLS policies
create table public.platform_admins (
  id serial primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'platform_admin' check (role in ('super_admin', 'platform_admin')),
  created_at timestamptz not null default now()
);

create index idx_platform_admins_user on public.platform_admins(user_id);

-- Enable RLS but grant no public access — only service_role bypasses this
alter table public.platform_admins enable row level security;
