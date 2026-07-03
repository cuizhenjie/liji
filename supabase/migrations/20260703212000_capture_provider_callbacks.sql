alter table public.capture_extraction_jobs
  add column if not exists provider_request_id text,
  add column if not exists callback_received_at timestamptz,
  add column if not exists attempt_count int not null default 0,
  add column if not exists max_attempts int not null default 3,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_error text;

create index if not exists idx_capture_extraction_jobs_retry
  on public.capture_extraction_jobs(status, next_attempt_at, queued_at)
  where status in ('queued', 'failed');

create index if not exists idx_capture_extraction_jobs_provider_request
  on public.capture_extraction_jobs(provider, provider_request_id)
  where provider_request_id is not null;
