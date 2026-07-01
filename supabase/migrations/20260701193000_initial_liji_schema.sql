create extension if not exists "pgcrypto";
create extension if not exists "vector";

create type public.calendar_type as enum ('solar', 'lunar');
create type public.reminder_level as enum ('level_1', 'level_2', 'level_3');
create type public.capture_status as enum ('pending', 'confirmed', 'rejected', 'archived');
create type public.plan_scenario as enum ('festival', 'travel');
create type public.plan_status as enum ('draft', 'pending_confirmation', 'confirmed', 'bookmarked');
create type public.notification_channel as enum ('push', 'sms', 'voice');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  default_timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text not null,
  labels text[] not null default '{}',
  birthday date,
  calendar_type public.calendar_type not null default 'solar',
  preferences jsonb not null default '[]'::jsonb,
  compliance jsonb not null default '{}'::jsonb,
  ai_memory_health int not null default 80 check (ai_memory_health between 0 and 100),
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  risk_tags text[] not null default '{}',
  gift_limit_cny numeric(12,2),
  hospitality_limit_cny numeric(12,2),
  policy_note text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  event_date date not null,
  end_date date,
  location text,
  calendar_type public.calendar_type not null default 'solar',
  rrule text,
  reminder_level public.reminder_level not null default 'level_3',
  status text not null default 'scheduled',
  budget_cny numeric(12,2),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  level public.reminder_level not null,
  scheduled_at timestamptz not null,
  acknowledged_at timestamptz,
  escalation_after_minutes int not null default 15,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  category text not null check (category in ('fixed', 'relationship', 'travel', 'elastic')),
  total_cny numeric(12,2) not null,
  spent_cny numeric(12,2) not null default 0,
  period text not null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  scenario public.plan_scenario not null,
  title text not null,
  budget_cny numeric(12,2) not null,
  status public.plan_status not null default 'pending_confirmation',
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  title text not null,
  category text not null,
  amount_cny numeric(12,2) not null,
  rationale text not null,
  provider text not null,
  url text,
  created_at timestamptz not null default now()
);

create table public.capture_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null,
  masked_text text not null,
  status public.capture_status not null default 'pending',
  parsed jsonb not null default '{}'::jsonb,
  pii_tokens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  amount_cny numeric(12,2) not null,
  category text not null check (category in ('fixed', 'relationship', 'travel', 'daily')),
  occurred_at date not null,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount_cny numeric(12,2) not null,
  due_day int not null check (due_day between 1 and 31),
  account_label text not null,
  reminder_level public.reminder_level not null default 'level_2',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  channel public.notification_channel not null,
  status text not null check (status in ('queued', 'sent', 'confirmed', 'escalated', 'failed')),
  level public.reminder_level not null,
  sent_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  provider_message text not null default '',
  created_at timestamptz not null default now()
);

create table public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  content text not null,
  source text not null check (source in ('manual', 'ai')),
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  embedding vector(1536),
  corrected_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pii_masking boolean not null default true,
  cloud_model_enabled boolean not null default false,
  web_push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  voice_call_enabled boolean not null default false,
  third_party_links_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.events enable row level security;
alter table public.reminders enable row level security;
alter table public.budgets enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.capture_items enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.notification_logs enable row level security;
alter table public.ai_memories enable row level security;
alter table public.privacy_settings enable row level security;

create policy "profiles own rows" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "privacy own rows" on public.privacy_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contacts own rows" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "compliance own or system rows" on public.compliance_rules
  for select using (is_system or auth.uid() = user_id);
create policy "compliance mutate own rows" on public.compliance_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "events own rows" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders own rows" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets own rows" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plans own rows" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan items own rows" on public.plan_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "capture own rows" on public.capture_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions own rows" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring bills own rows" on public.recurring_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification logs own rows" on public.notification_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai memories own rows" on public.ai_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.compliance_rules (
  label,
  risk_tags,
  gift_limit_cny,
  hospitality_limit_cny,
  policy_note,
  is_system
) values
  ('公职人员/国企高管', array['公职人员', '国企高管'], 200, 500, '礼品建议不超过 200 元，宴请建议不超过 500 元。', true),
  ('重要客户', array['重要客户'], 500, 800, '保留预算、发票与审批记录，避免现金和储值卡。', true);
