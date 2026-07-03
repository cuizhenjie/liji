import { z } from "zod";

import { sendAliyunNotifications } from "@/lib/liji/aliyun";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import type { Json } from "@/lib/liji/database.types";
import {
  createNotificationRetryLog,
  createNotificationRetryOpsAlert,
  isNotificationRetryDue,
  type NotificationRetryLog,
  type RetryableNotificationLog,
} from "@/lib/liji/notification-retry";
import { resolveNotificationRecipientPhone } from "@/lib/liji/notifications";
import { opsAlertRow } from "@/lib/liji/ops-alerts";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import { mapNotificationLog, mapPrivacy } from "@/lib/liji/supabase-mappers";
import type { PrivacySettings } from "@/lib/liji/types";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(row: Record<string, unknown>, key: string, fallback: number) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function mapRetryableNotificationLog(row: Record<string, unknown>): RetryableNotificationLog | null {
  const userId = text(row, "user_id");
  const log = mapNotificationLog(row);
  if (!userId) {
    return null;
  }

  return {
    ...log,
    userId,
    retryOfLogId: text(row, "retry_of_log_id"),
    retryCount: numberValue(row, "retry_count", 0),
    maxRetries: numberValue(row, "max_retries", 2),
    nextRetryAt: text(row, "next_retry_at"),
    stoppedAt: text(row, "stopped_at"),
    stopReason: text(row, "stop_reason"),
  };
}

function retryLogRow(userId: string, log: NotificationRetryLog) {
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
    raw_provider_receipt: (log.rawProviderReceipt ?? {}) as Json,
    retry_of_log_id: log.retryOfLogId,
    retry_count: log.retryCount,
    max_retries: log.maxRetries,
    next_retry_at: log.nextRetryAt ?? null,
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

async function insertRetryAlert(
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  log: RetryableNotificationLog,
  message: string,
  now: Date
) {
  const { error } = await client
    .from("ops_alerts")
    .insert(opsAlertRow(createNotificationRetryOpsAlert({ log, message, now })));
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

async function runSupabaseNotificationRetries(limit: number) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const now = new Date();
  const { data, error } = await client
    .from("notification_logs")
    .select("*")
    .eq("status", "failed")
    .in("channel", ["sms", "voice"])
    .in("provider", ["aliyun_sms", "aliyun_voice"])
    .is("stopped_at", null)
    .order("sent_at", { ascending: true })
    .limit(limit * 2);
  if (error) {
    throw new Error(error.message);
  }

  const privacyCache = new Map<string, PrivacySettings>();
  const processed = [];

  for (const row of data ?? []) {
    if (processed.length >= limit) {
      break;
    }

    const original = mapRetryableNotificationLog(row as Record<string, unknown>);
    if (!original || !isNotificationRetryDue(original, now)) {
      continue;
    }

    if (original.retryCount >= original.maxRetries) {
      const { error: exhaustedUpdateError } = await client
        .from("notification_logs")
        .update({
          stopped_at: now.toISOString(),
          stop_reason: "max_retries_exhausted",
        })
        .eq("id", original.id);
      if (exhaustedUpdateError) {
        throw new Error(exhaustedUpdateError.message);
      }
      await insertRetryAlert(client, original, "短信/语音通知已达到最大重试次数。", now);
      processed.push({
        logId: original.id,
        status: "exhausted",
        retryCount: original.retryCount,
      });
      continue;
    }

    const privacy = await privacyForUser(client, original.userId, privacyCache);
    const allowed =
      original.channel === "sms" ? privacy.smsEnabled : privacy.voiceCallEnabled;
    const recipientPhone = resolveNotificationRecipientPhone(privacy);
    if (!allowed || !recipientPhone) {
      const stopReason = !allowed ? "privacy_channel_disabled" : "missing_recipient_phone";
      const { error: stopError } = await client
        .from("notification_logs")
        .update({
          stopped_at: now.toISOString(),
          stop_reason: stopReason,
        })
        .eq("id", original.id);
      if (stopError) {
        throw new Error(stopError.message);
      }

      processed.push({
        logId: original.id,
        status: "stopped",
        stopReason,
      });
      continue;
    }

    const deliveries = await sendAliyunNotifications({
      logs: [original],
      title: original.title,
      recipientPhone,
      templateParams: { title: original.title },
    });
    const retryLog = createNotificationRetryLog({
      original,
      delivery: deliveries[0],
      now,
    });
    const { error: insertError } = await client
      .from("notification_logs")
      .insert(retryLogRow(original.userId, retryLog));
    if (insertError) {
      throw new Error(insertError.message);
    }

    const { error: updateError } = await client
      .from("notification_logs")
      .update({
        stopped_at: now.toISOString(),
        stop_reason: `retry_submitted:${retryLog.id}`,
      })
      .eq("id", original.id);
    if (updateError) {
      throw new Error(updateError.message);
    }

    if (retryLog.status === "failed" && retryLog.retryCount >= retryLog.maxRetries) {
      const exhaustedLog: RetryableNotificationLog = {
        ...retryLog,
        userId: original.userId,
      };
      const { error: stopRetryError } = await client
        .from("notification_logs")
        .update({
          stopped_at: now.toISOString(),
          stop_reason: "max_retries_exhausted",
        })
        .eq("id", retryLog.id);
      if (stopRetryError) {
        throw new Error(stopRetryError.message);
      }
      await insertRetryAlert(client, exhaustedLog, retryLog.providerMessage, now);
    }

    processed.push({
      logId: original.id,
      retryLogId: retryLog.id,
      status: retryLog.status,
      providerStatus: retryLog.providerStatus,
      retryCount: retryLog.retryCount,
      nextRetryAt: retryLog.nextRetryAt,
    });
  }

  return processed;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const processed = await runSupabaseNotificationRetries(body.limit);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [{
      logId: "demo-failed-sms",
      retryLogId: "demo-retry-sms",
      status: "failed",
      providerStatus: "unknown",
      retryCount: 1,
      nextRetryAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    }],
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const processed = await runSupabaseNotificationRetries(20);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，通知失败重试 worker 处于 demo 模式。",
  });
}
