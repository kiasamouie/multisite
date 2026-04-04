-- Feature flags (per-tenant overrides)
create table public.feature_flags (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, key)
);

create index idx_feature_flags_tenant on public.feature_flags(tenant_id);

create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();
