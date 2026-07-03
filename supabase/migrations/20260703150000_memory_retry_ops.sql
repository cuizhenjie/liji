alter table public.reminder_escalation_jobs
  add column if not exists next_attempt_at timestamptz,
  add column if not exists max_attempts int not null default 3,
  add column if not exists last_error text;

create table public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  source text not null,
  title text not null,
  message text not null,
  entity_table text,
  entity_id text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

alter table public.ops_alerts enable row level security;

create policy "ops alerts own rows" on public.ops_alerts
  for select using (auth.uid() = user_id);

create index if not exists idx_ops_alerts_user_status
  on public.ops_alerts(user_id, status, created_at desc);

create unique index if not exists idx_ops_alerts_open_entity
  on public.ops_alerts(source, entity_table, entity_id)
  where status = 'open' and entity_table is not null and entity_id is not null;

create index if not exists idx_reminder_escalation_jobs_next_attempt
  on public.reminder_escalation_jobs(status, next_attempt_at, trigger_at);

alter table public.ai_memories
  add column if not exists review_status text not null default 'healthy'
    check (review_status in ('healthy', 'review_required', 'stale')),
  add column if not exists reviewed_at timestamptz,
  add column if not exists last_embedded_at timestamptz;

create index if not exists idx_ai_memories_review_status
  on public.ai_memories(user_id, review_status, created_at desc);
