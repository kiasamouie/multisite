-- Memberships (links auth.users to tenants)
create table public.memberships (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor')),
  created_at timestamptz not null default now(),
  unique(user_id, tenant_id)
);

create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_tenant on public.memberships(tenant_id);
