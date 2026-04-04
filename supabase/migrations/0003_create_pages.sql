-- Pages table
create table public.pages (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  title text not null,
  slug text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

create index idx_pages_tenant on public.pages(tenant_id);
create index idx_pages_slug on public.pages(tenant_id, slug);

create trigger pages_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();
