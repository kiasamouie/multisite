-- Tenant integrations (encrypted config per integration)
create table public.tenant_integrations (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  integration_type text not null,
  config jsonb not null default '{}',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, integration_type)
);

create index idx_tenant_integrations_tenant on public.tenant_integrations(tenant_id);

create trigger tenant_integrations_updated_at
  before update on public.tenant_integrations
  for each row execute function public.set_updated_at();
