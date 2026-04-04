-- Subscriptions table
create table public.subscriptions (
  id serial primary key,
  tenant_id integer not null references public.tenants(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  status text not null default 'active',
  price_id text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_tenant on public.subscriptions(tenant_id);
create index idx_subscriptions_stripe on public.subscriptions(stripe_subscription_id);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
