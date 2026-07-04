create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('free', 'pro', 'executive')),
  status text not null default 'active'
    check (status in ('trialing', 'active', 'past_due', 'cancelled', 'manual_review')),
  provider text not null default 'manual'
    check (provider in ('manual', 'stripe', 'wechat_pay', 'alipay')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.billing_subscriptions enable row level security;

create policy "billing subscriptions own rows"
  on public.billing_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.billing_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('free', 'pro', 'executive')),
  entitlement_key text not null,
  quantity numeric(12,2) not null default 0,
  included_quantity numeric(12,2) not null default 0,
  overage_quantity numeric(12,2) not null default 0,
  unit_cny numeric(12,2) not null default 0,
  amount_cny numeric(12,2) not null default 0,
  status text not null default 'included'
    check (status in ('included', 'billable', 'blocked', 'void')),
  source text not null default 'entitlement_meter',
  reference_table text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.billing_usage_ledger enable row level security;

create policy "billing usage ledger own rows"
  on public.billing_usage_ledger
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_billing_usage_ledger_user_period
  on public.billing_usage_ledger(user_id, occurred_at desc, entitlement_key);

create table if not exists public.billing_invoice_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text check (plan_id in ('free', 'pro', 'executive')),
  amount_cny numeric(12,2) not null check (amount_cny > 0),
  buyer_title text not null,
  tax_id text,
  email text,
  status text not null default 'queued'
    check (status in ('draft', 'queued', 'issued', 'rejected', 'cancelled')),
  provider text not null default 'manual'
    check (provider in ('manual', 'fapiao_api')),
  provider_invoice_id text,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  issued_at timestamptz
);

alter table public.billing_invoice_requests enable row level security;

create policy "billing invoice requests own rows"
  on public.billing_invoice_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_billing_invoice_requests_user_status
  on public.billing_invoice_requests(user_id, status, requested_at desc);

create table if not exists public.cps_finance_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null
    check (provider in ('jd', 'taobao', 'meituan', 'ctrip', 'tongcheng')),
  external_order_id text not null,
  settlement_period text,
  net_amount_cny numeric(12,2) not null default 0,
  commission_cny numeric(12,2) not null default 0,
  risk_flags text[] not null default '{}',
  required_evidence text[] not null default '{}',
  status text not null default 'pending_finance'
    check (status in ('pending_finance', 'approved', 'held', 'rejected', 'paid')),
  finance_note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider, external_order_id, settlement_period)
);

alter table public.cps_finance_approvals enable row level security;

create policy "cps finance approvals own rows"
  on public.cps_finance_approvals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_cps_finance_approvals_user_status
  on public.cps_finance_approvals(user_id, status, created_at desc);

create table if not exists public.ops_alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.ops_alerts(id) on delete cascade,
  action text not null
    check (action in ('created', 'acknowledged', 'resolved', 'reopened', 'assigned')),
  actor_role text not null default 'ops',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ops_alert_events enable row level security;

create policy "ops alert events own rows"
  on public.ops_alert_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_ops_alert_events_user_alert
  on public.ops_alert_events(user_id, alert_id, created_at desc);
