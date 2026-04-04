-- Media table
create table public.media (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  url text not null,
  filename text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_media_tenant on public.media(tenant_id);
