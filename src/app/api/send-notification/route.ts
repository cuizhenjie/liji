import { z } from "zod";

import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { sendAliyunNotifications } from "@/lib/liji/aliyun";
import {
  createNotificationDelivery,
  filterNotificationLogsByPrivacy,
} from "@/lib/liji/notifications";
import { mergeExternalDeliveryResults } from "@/lib/liji/reminder-escalation-worker";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";
import { mapPrivacy } from "@/lib/liji/supabase-mappers";
import {
  createLevelOneEscalationJob,
  planLevelOneEscalation,
  type ReminderEscalationJob,
} from "@/lib/liji/reminders";
import type { NotificationLog } from "@/lib/liji/types";
import {
  sendWebPushNotifications,
  type StoredPushSubscription,
} from "@/lib/liji/web-push-server";

const requestSchema = z.object({
  title: z.string(),
  level: z.enum(["level_1", "level_2", "level_3"]),
  eventId: z.string().optional(),
  acknowledged: z.boolean().default(false),
  lastSentAt: z.string().optional(),
  recipientPhone: z.string().optional(),
  templateParams: z.record(z.string(), z.string()).optional(),
});

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

function escalationJobRow(userId: string, job: ReminderEscalationJob) {
  return {
    id: job.id,
    user_id: userId,
    event_id: job.eventId,
    title: job.title,
    channels: job.channels,
    status: job.status,
    trigger_at: job.triggerAt,
    last_sent_at: job.lastSentAt,
    acknowledged_at: job.acknowledgedAt,
    attempt_count: job.attemptCount,
    provider_message: job.providerMessage,
  };
}

function mapPushSubscription(row: Record<string, unknown>): StoredPushSubscription | null {
  const endpoint = row.endpoint;
  const p256dh = row.p256dh;
  const auth = row.auth;

  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return null;
  }

  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const now = new Date();
  const delivery = createNotificationDelivery({ ...body, now });
  const escalationPlan = planLevelOneEscalation({
    level: body.level,
    acknowledgedAt: body.acknowledged ? now.toISOString() : undefined,
    lastSentAt: body.lastSentAt,
    now,
  });
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const { data: privacyRow, error: privacyError } = await supabase
      .from("privacy_settings")
      .select("*")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (privacyError) {
      return Response.json({ error: privacyError.message }, { status: 500 });
    }

    const privacy = mapPrivacy(privacyRow);
    const baseLogs = filterNotificationLogsByPrivacy(delivery.logs, privacy);
    const externalDelivery =
      delivery.provider === "aliyun"
        ? await sendAliyunNotifications({
            logs: baseLogs,
            title: body.title,
            recipientPhone: body.recipientPhone,
            templateParams: body.templateParams,
          })
        : [];
    const logs = mergeExternalDeliveryResults(baseLogs, externalDelivery);
    const { error } = await supabase
      .from("notification_logs")
      .insert(logs.map((log) => notificationLogRow(data.user.id, log)));

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    const pushLog = logs.find((log) => log.channel === "push");
    const escalationJob = pushLog
      ? createLevelOneEscalationJob({
          eventId: body.eventId,
          title: body.title,
          level: body.level,
          lastSentAt: pushLog.sentAt,
          acknowledgedAt: body.acknowledged ? now.toISOString() : undefined,
          now,
        })
      : null;

    if (escalationJob) {
      const { error: jobError } = await supabase
        .from("reminder_escalation_jobs")
        .upsert(escalationJobRow(data.user.id, escalationJob), {
          onConflict: "user_id,event_id,trigger_at",
          ignoreDuplicates: true,
        });
      if (jobError) {
        return Response.json({ error: jobError.message }, { status: 500 });
      }
    }

    const auditPersistence = await persistAuditLog(
      createAuditLogEntry({
        userId: data.user.id,
        action: "notify",
        entityTable: "notification_logs",
        metadata: {
          title: body.title,
          level: body.level,
          channels: logs.map((log) => log.channel),
          provider: delivery.provider,
          privacy: {
            smsEnabled: privacy.smsEnabled,
            voiceCallEnabled: privacy.voiceCallEnabled,
            webPushEnabled: privacy.webPushEnabled,
          },
        },
      }),
      createSupabaseServiceClient()
    );

    const shouldSendPush = privacy.webPushEnabled && logs.some((log) => log.channel === "push");
    const pushDelivery = shouldSendPush
      ? await supabase
          .from("web_push_subscriptions")
          .select("endpoint,p256dh,auth")
          .eq("user_id", data.user.id)
          .eq("enabled", true)
          .then(async ({ data: subscriptions, error: subscriptionError }) => {
            if (subscriptionError) {
              return {
                status: "failed" as const,
                attempted: 0,
                sent: 0,
                failed: 0,
                error: subscriptionError.message,
              };
            }

            return sendWebPushNotifications({
              subscriptions: (subscriptions ?? [])
                .map((row) => mapPushSubscription(row))
                .filter((subscription): subscription is StoredPushSubscription => Boolean(subscription)),
              title: body.title,
              body: "请打开礼记确认该提醒。",
              url: "/",
            });
          })
      : null;
    return Response.json({
      provider: delivery.provider,
      title: body.title,
      channels: logs.map((log) => log.channel),
      logs,
      escalated: delivery.escalated,
      status: logs.some((log) => log.status === "escalated") ? "escalated" : "queued",
      pushDelivery,
      externalDelivery,
      escalationPlan,
      escalationJob,
      auditPersistence,
      source: "supabase",
    });
  }

  const pushLog = delivery.logs.find((log) => log.channel === "push");
  const escalationJob = pushLog
    ? createLevelOneEscalationJob({
        eventId: body.eventId,
        title: body.title,
        level: body.level,
        lastSentAt: pushLog.sentAt,
        acknowledgedAt: body.acknowledged ? now.toISOString() : undefined,
        now,
      })
    : null;

  return Response.json({
    provider: delivery.provider,
    title: body.title,
    channels: delivery.logs.map((log) => log.channel),
    logs: delivery.logs,
    escalated: delivery.escalated,
    status: delivery.logs.some((log) => log.status === "escalated") ? "escalated" : "queued",
    message: "MVP 使用 mock provider；配置 Supabase 登录后会写入投递日志。",
    externalDelivery: [],
    escalationPlan,
    escalationJob,
    source: "demo",
  });
}
