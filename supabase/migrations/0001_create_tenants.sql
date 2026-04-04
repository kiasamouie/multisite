-- Tenants table
create table public.tenants (
  id serial primary key,
  name text not null,
  domain text unique not null,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'pro')),
  stripe_customer_id text,
  from_email text,
  admin_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();
