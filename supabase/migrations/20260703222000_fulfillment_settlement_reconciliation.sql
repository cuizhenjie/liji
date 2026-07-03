alter table public.fulfillment_order_updates
  add column if not exists commission_cny numeric(12,2),
  add column if not exists refunded_amount_cny numeric(12,2),
  add column if not exists settlement_status text not null default 'not_applicable'
    check (settlement_status in ('pending', 'eligible', 'settled', 'reversed', 'disputed', 'not_applicable')),
  add column if not exists settlement_period text,
  add column if not exists reconciled_at timestamptz;

create index if not exists idx_fulfillment_order_updates_reconcile
  on public.fulfillment_order_updates(user_id, provider, external_order_id, received_at desc);

create index if not exists idx_fulfillment_order_updates_settlement
  on public.fulfillment_order_updates(settlement_status, settlement_period, received_at desc);

create table if not exists public.fulfillment_reconciliation_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  summary jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  unique (user_id, period)
);

alter table public.fulfillment_reconciliation_reports enable row level security;

create policy "fulfillment reconciliation reports own rows"
  on public.fulfillment_reconciliation_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_fulfillment_reconciliation_reports_user_period
  on public.fulfillment_reconciliation_reports(user_id, period desc);
