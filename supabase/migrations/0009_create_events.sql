-- Events table (for tracking and analytics)
create table public.events (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_events_tenant on public.events(tenant_id);
create index idx_events_type on public.events(tenant_id, event_type);
create index idx_events_created on public.events(created_at);
