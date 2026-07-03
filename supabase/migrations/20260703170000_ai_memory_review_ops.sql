create policy "ops alerts update own rows" on public.ops_alerts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
