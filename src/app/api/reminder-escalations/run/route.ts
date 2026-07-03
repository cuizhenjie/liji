import { z } from "zod";

import { sendAliyunNotifications } from "@/lib/liji/aliyun";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import type { Json } from "@/lib/liji/database.types";
import { filterNotificationLogsByPrivacy } from "@/lib/liji/notifications";
import {
  createEscalationOpsAlert,
  createEscalationDeliveryLogs,
  isEscalationJobDue,
  mergeExternalDeliveryResults,
  summarizeEscalationJobStatus,
  type ReminderEscalationJobRecord,
} from "@/lib/liji/reminder-escalation-worker";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import { mapPrivacy } from "@/lib/liji/supabase-mappers";
import type { NotificationLog, PrivacySettings } from "@/lib/liji/types";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function numberValue(row: Record<string, unknown>, key: string, fallback = 0) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return fallback;
}

function stringArray(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapJob(row: Record<string, unknown>): ReminderEscalationJobRecord | null {
  const id = text(row, "id");
  const userId = text(row, "user_id");
  const title = text(row, "title");
  const status = text(row, "status");
  const triggerAt = text(row, "trigger_at");
  const lastSentAt = text(row, "last_sent_at");
  const channels = stringArray(row, "channels").filter(
    (channel): channel is "sms" | "voice" => channel === "sms" || channel === "voice"
  );

  if (
    !id ||
    !userId ||
    !title ||
    !triggerAt ||
    !lastSentAt ||
    channels.length === 0 ||
    !(status === "scheduled" || status === "due" || status === "sent" || status === "cancelled" || status === "failed")
  ) {
    return null;
  }

  return {
    id,
    userId,
    eventId: text(row, "event_id"),
    title,
    channels,
    status,
    triggerAt,
    nextAttemptAt: text(row, "next_attempt_at"),
    lastSentAt,
    acknowledgedAt: text(row, "acknowledged_at"),
    attemptCount: numberValue(row, "attempt_count"),
    maxAttempts: numberValue(row, "max_attempts", 3),
    lastError: text(row, "last_error"),
    providerMessage: text(row, "provider_message"),
  };
}

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
    provider: log.provider,
    provider_request_id: log.providerRequestId,
    provider_receipt_id: log.providerReceiptId,
    provider_status: log.providerStatus,
    receipt_checked_at: log.receiptCheckedAt,
    raw_provider_receipt: log.rawProviderReceipt,
  };
}

function opsAlertRow(alert: ReturnType<typeof createEscalationOpsAlert>) {
  return {
    user_id: alert.userId,
    severity: alert.severity,
    source: alert.source,
    title: alert.title,
    message: alert.message,
    entity_table: alert.entityTable,
    entity_id: alert.entityId,
    metadata: alert.metadata as Json,
    created_at: alert.createdAt,
  };
}

async function privacyForUser(
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  userId: string,
  cache: Map<string, PrivacySettings>
) {
  const cached = cache.get(userId);
  if (cached) {
    return cached;
  }

  const { data, error } = await client
    .from("privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  const privacy = mapPrivacy(data);
  cache.set(userId, privacy);
  return privacy;
}

async function runSupabaseEscalationJobs(limit: number) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const now = new Date();
  const { data, error } = await client
    .from("reminder_escalation_jobs")
    .select("*")
    .in("status", ["scheduled", "due", "failed"])
    .lte("trigger_at", now.toISOString())
    .is("acknowledged_at", null)
    .order("trigger_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const privacyCache = new Map<string, PrivacySettings>();
  const processed = [];

  for (const row of data ?? []) {
    const job = mapJob(row as Record<string, unknown>);
    if (!job || !isEscalationJobDue(job, now)) {
      continue;
    }

    const privacy = await privacyForUser(client, job.userId, privacyCache);
    const rawLogs = createEscalationDeliveryLogs(job, now);
    const allowedLogs = filterNotificationLogsByPrivacy(rawLogs, privacy);
    const deliveries = await sendAliyunNotifications({
      logs: allowedLogs,
      title: job.title,
      templateParams: { title: job.title },
    });
    const logs = mergeExternalDeliveryResults(allowedLogs, deliveries);
    const summary = summarizeEscalationJobStatus({
      logs,
      deliveries,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      now,
    });
    const nextAttemptCount = job.attemptCount + 1;

    if (logs.length > 0) {
      const { error: insertError } = await client
        .from("notification_logs")
        .insert(logs.map((log) => notificationLogRow(job.userId, log)));
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    const { error: updateError } = await client
      .from("reminder_escalation_jobs")
      .update({
        status: summary.status,
        attempt_count: nextAttemptCount,
        next_attempt_at: "nextAttemptAt" in summary ? summary.nextAttemptAt : null,
        last_error: summary.status === "failed" || summary.status === "due" ? summary.providerMessage : null,
        provider_message: summary.providerMessage,
        updated_at: now.toISOString(),
      })
      .eq("id", job.id);
    if (updateError) {
      throw new Error(updateError.message);
    }

    if ("exhausted" in summary && summary.exhausted) {
      const alert = createEscalationOpsAlert({
        job: { ...job, attemptCount: nextAttemptCount },
        message: summary.providerMessage,
        now,
      });
      const { error: alertError } = await client.from("ops_alerts").insert(opsAlertRow(alert));
      if (alertError) {
        throw new Error(alertError.message);
      }
    }

    processed.push({
      jobId: job.id,
      status: summary.status,
      channels: logs.map((log) => log.channel),
      deliveries,
      providerMessage: summary.providerMessage,
      nextAttemptAt: "nextAttemptAt" in summary ? summary.nextAttemptAt : null,
    });
  }

  return processed;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const processed = await runSupabaseEscalationJobs(body.limit);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，升级 worker 处于 demo 模式。",
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const processed = await runSupabaseEscalationJobs(20);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，升级 worker 处于 demo 模式。",
  });
}
