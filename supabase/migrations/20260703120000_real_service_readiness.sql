alter type public.integration_provider add value if not exists 'aliyun_ocr';
alter type public.integration_provider add value if not exists 'aliyun_asr';

create table public.capture_extraction_jobs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  capture_id uuid references public.capture_items(id) on delete set null,
  source_type text not null check (source_type in ('voice', 'screenshot', 'chat', 'bill')),
  job_type text not null check (job_type in ('ocr', 'asr')),
  provider text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  file_name text,
  mime_type text,
  content_hash text not null,
  extracted_text text,
  error_message text,
  raw_result jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.reminder_escalation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  channels text[] not null default array['sms', 'voice'],
  status text not null default 'scheduled' check (status in ('scheduled', 'due', 'sent', 'cancelled', 'failed')),
  trigger_at timestamptz not null,
  last_sent_at timestamptz not null,
  acknowledged_at timestamptz,
  attempt_count int not null default 0,
  provider_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, trigger_at)
);

alter table public.capture_extraction_jobs enable row level security;
alter table public.reminder_escalation_jobs enable row level security;

create policy "capture extraction jobs own rows" on public.capture_extraction_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminder escalation jobs own rows" on public.reminder_escalation_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_capture_extraction_jobs_user_status
  on public.capture_extraction_jobs(user_id, status, queued_at desc);

create index if not exists idx_reminder_escalation_jobs_due
  on public.reminder_escalation_jobs(user_id, status, trigger_at)
  where status in ('scheduled', 'due');

create index if not exists idx_ai_memories_embedding_cosine
  on public.ai_memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100)
  where embedding is not null;

create or replace function public.match_ai_memories(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  contact_id uuid,
  content text,
  source text,
  confidence numeric,
  corrected_at timestamptz,
  embedding vector(1536),
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ai_memories.id,
    ai_memories.contact_id,
    ai_memories.content,
    ai_memories.source,
    ai_memories.confidence,
    ai_memories.corrected_at,
    ai_memories.embedding,
    1 - (ai_memories.embedding <=> query_embedding) as similarity
  from public.ai_memories
  where ai_memories.user_id = auth.uid()
    and ai_memories.embedding is not null
  order by ai_memories.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

grant execute on function public.match_ai_memories(vector, int) to authenticated;
