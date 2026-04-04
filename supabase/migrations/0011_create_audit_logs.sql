-- Audit logs (insert-only)
create table public.audit_logs (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id integer,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_audit_logs_tenant on public.audit_logs(tenant_id);
create index idx_audit_logs_created on public.audit_logs(created_at);

-- Prevent updates and deletes on audit logs
create or replace function public.prevent_audit_modification()
returns trigger as $$
begin
  raise exception 'Audit logs are immutable';
end;
$$ language plpgsql;

create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_modification();

create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_modification();
