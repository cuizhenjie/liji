import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { filterNotificationLogsByPrivacy } from "@/lib/liji/notifications";
import { runReminderScan } from "@/lib/liji/reminders";
import { demoEvents } from "@/lib/liji/sample-data";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import { mapEvent, mapPrivacy } from "@/lib/liji/supabase-mappers";
import type { PrivacySettings } from "@/lib/liji/types";
import type { NotificationLog } from "@/lib/liji/types";

function notificationLogRow(userId: string, log: NotificationLog) {
  return {
    id: log.id,
    user_id: userId,
    event_id: log.eventId,
    title: log.title,
    channel: log.channel,
    status: log.status,
    level: log.level,
    sent_at: log.sentAt,
    acknowledged_at: log.acknowledgedAt,
    provider_message: log.providerMessage,
  };
}

async function runSupabaseReminderScan() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }
  const client = supabase;

  const { data, error } = await client
    .from("events")
    .select("*")
    .neq("status", "done");

  if (error) {
    throw new Error(error.message);
  }

  const now = new Date();
  const privacyCache = new Map<string, PrivacySettings>();
  async function privacyForUser(userId: string) {
    const cached = privacyCache.get(userId);
    if (cached) {
      return cached;
    }

    const { data: privacyRow, error: privacyError } = await client
      .from("privacy_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (privacyError) {
      throw new Error(privacyError.message);
    }

    const privacy = mapPrivacy(privacyRow);
    privacyCache.set(userId, privacy);
    return privacy;
  }

  const logsWithUsers = [];
  for (const row of data ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    if (!userId) {
      continue;
    }

    const privacy = await privacyForUser(userId);
    const logs = filterNotificationLogsByPrivacy(runReminderScan([mapEvent(row)], now), privacy);
    logsWithUsers.push(...logs.map((log) => ({ userId, log })));
  }

  if (logsWithUsers.length > 0) {
    const { error: insertError } = await supabase
      .from("notification_logs")
      .insert(logsWithUsers.map(({ userId, log }) => notificationLogRow(userId, log)));

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return logsWithUsers.map(({ log }) => log);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const supabaseLogs = await runSupabaseReminderScan();
  if (supabaseLogs) {
    return Response.json({
      logs: supabaseLogs,
      source: "supabase",
    });
  }

  return Response.json({
    logs: runReminderScan(demoEvents, new Date()),
    source: "demo",
  });
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const supabaseLogs = await runSupabaseReminderScan();
  if (supabaseLogs) {
    return Response.json({
      logs: supabaseLogs,
      source: "supabase",
    });
  }

  return Response.json({
    logs: runReminderScan(demoEvents, new Date()),
    source: "demo",
  });
}
