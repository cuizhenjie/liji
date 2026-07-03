alter table public.capture_extraction_jobs
  add column if not exists input_uri text;

create index if not exists idx_capture_extraction_jobs_provider_status
  on public.capture_extraction_jobs(provider, status, queued_at desc);
