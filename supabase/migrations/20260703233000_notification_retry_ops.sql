alter table public.notification_logs
  add column if not exists retry_of_log_id uuid references public.notification_logs(id) on delete set null,
  add column if not exists retry_count int not null default 0 check (retry_count >= 0),
  add column if not exists max_retries int not null default 2 check (max_retries between 0 and 10),
  add column if not exists next_retry_at timestamptz,
  add column if not exists stopped_at timestamptz,
  add column if not exists stop_reason text;

create index if not exists idx_notification_logs_retry_due
  on public.notification_logs(status, next_retry_at, sent_at)
  where channel in ('sms', 'voice') and stopped_at is null;

create index if not exists idx_notification_logs_retry_parent
  on public.notification_logs(retry_of_log_id)
  where retry_of_log_id is not null;
