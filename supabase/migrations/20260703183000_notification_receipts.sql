alter table public.notification_logs
  add column if not exists provider text not null default 'mock'
    check (provider in ('mock', 'web_push', 'aliyun_sms', 'aliyun_voice')),
  add column if not exists provider_request_id text,
  add column if not exists provider_receipt_id text,
  add column if not exists provider_status text not null default 'not_applicable'
    check (provider_status in ('not_applicable', 'submitted', 'pending', 'delivered', 'failed', 'unknown')),
  add column if not exists receipt_checked_at timestamptz,
  add column if not exists raw_provider_receipt jsonb not null default '{}'::jsonb;

create index if not exists idx_notification_logs_provider_receipt
  on public.notification_logs(provider, provider_receipt_id)
  where provider_receipt_id is not null;

create index if not exists idx_notification_logs_receipt_poll
  on public.notification_logs(provider_status, sent_at)
  where channel in ('sms', 'voice') and provider_receipt_id is not null;
