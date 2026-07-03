alter table public.privacy_settings
  add column if not exists notification_phone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'privacy_settings_notification_phone_length'
  ) then
    alter table public.privacy_settings
      add constraint privacy_settings_notification_phone_length
      check (notification_phone is null or char_length(notification_phone) <= 32);
  end if;
end $$;
