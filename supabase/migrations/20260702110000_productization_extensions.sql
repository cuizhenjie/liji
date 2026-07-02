create type public.integration_provider as enum ('jd', 'taobao', 'meituan', 'ctrip', 'tongcheng', 'aliyun_sms', 'aliyun_voice', 'openai');
create type public.audit_action as enum ('create', 'update', 'delete', 'export', 'notify', 'fulfill', 'ai_parse');

alter table public.capture_items
  add column if not exists source_type text not null default 'text'
  check (source_type in ('text', 'voice', 'screenshot', 'chat', 'bill'));

create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider public.integration_provider not null,
  display_name text not null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fulfillment_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  plan_item_id uuid references public.plan_items(id) on delete set null,
  provider public.integration_provider not null,
  target_url text not null,
  tracking_params jsonb not null default '{}'::jsonb,
  clicked_at timestamptz not null default now()
);

create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  insight jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, period)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  entity_table text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.fulfillment_order_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  plan_item_id uuid references public.plan_items(id) on delete set null,
  provider public.integration_provider not null,
  external_order_id text not null,
  status text not null check (status in ('clicked', 'reserved', 'paid', 'fulfilled', 'cancelled', 'refunded', 'failed')),
  amount_cny numeric(12,2),
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

alter table public.web_push_subscriptions enable row level security;
alter table public.integration_accounts enable row level security;
alter table public.fulfillment_clicks enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.fulfillment_order_updates enable row level security;

create policy "web push own rows" on public.web_push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "integration own or system rows" on public.integration_accounts
  for select using (is_system or auth.uid() = user_id);
create policy "integration mutate own rows" on public.integration_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fulfillment clicks own rows" on public.fulfillment_clicks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "monthly reports own rows" on public.monthly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "audit logs own rows" on public.audit_logs
  for select using (auth.uid() = user_id);

create policy "fulfillment order updates own rows" on public.fulfillment_order_updates
  for select using (auth.uid() = user_id);

create index if not exists idx_contacts_user_updated on public.contacts(user_id, updated_at desc);
create index if not exists idx_events_user_date on public.events(user_id, event_date);
create index if not exists idx_notification_logs_user_event on public.notification_logs(user_id, event_id, sent_at desc);
create index if not exists idx_capture_items_user_status on public.capture_items(user_id, status, created_at desc);
create index if not exists idx_ai_memories_user_contact on public.ai_memories(user_id, contact_id, created_at desc);
create index if not exists idx_web_push_user_enabled on public.web_push_subscriptions(user_id) where enabled;
create index if not exists idx_fulfillment_clicks_user_plan on public.fulfillment_clicks(user_id, plan_id, clicked_at desc);
create index if not exists idx_fulfillment_order_updates_user_plan on public.fulfillment_order_updates(user_id, plan_id, received_at desc);
create index if not exists idx_monthly_reports_user_period on public.monthly_reports(user_id, period);

insert into public.integration_accounts (
  provider,
  display_name,
  config,
  is_system
) values
  ('jd', '京东联盟搜索跳转', '{"mode":"cps_link"}'::jsonb, true),
  ('meituan', '美团本地生活跳转', '{"mode":"search_link"}'::jsonb, true),
  ('ctrip', '携程商旅跳转', '{"mode":"search_link"}'::jsonb, true),
  ('aliyun_sms', '阿里云短信服务', '{"mode":"adapter"}'::jsonb, true),
  ('aliyun_voice', '阿里云语音服务', '{"mode":"adapter"}'::jsonb, true),
  ('openai', 'OpenAI 结构化解析', '{"mode":"responses_json_schema"}'::jsonb, true);
