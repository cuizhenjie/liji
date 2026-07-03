import type { CalendarEvent, NotificationLog, PrivacySettings, ReminderLevel } from "./types";
import { createUuid } from "./ids";
import { channelsForLevel, shouldEscalateLevelOne } from "./reminders";

export type NotificationProviderName = "mock" | "aliyun";

export type NotificationDeliveryRequest = {
  title: string;
  level: ReminderLevel;
  eventId?: string;
  acknowledged?: boolean;
  lastSentAt?: string;
  now?: Date;
};

export type NotificationDeliveryResult = {
  provider: NotificationProviderName;
  logs: NotificationLog[];
  escalated: boolean;
};

function providerMessage(provider: NotificationProviderName, channel: NotificationLog["channel"]) {
  if (provider === "aliyun") {
    return channel === "voice" ? "Aliyun VMS 队列已创建。" : "Aliyun SMS 队列已创建。";
  }

  return channel === "voice"
    ? "MockVoice 已排队，等待用户确认后停止重试。"
    : channel === "sms"
      ? "MockSMS 已发送，真实服务可替换为阿里云/腾讯云适配器。"
      : "Web Push 已发送或写入站内提醒。";
}

function logProvider(provider: NotificationProviderName, channel: NotificationLog["channel"]): NotificationLog["provider"] {
  if (channel === "push") return "web_push";
  if (provider === "aliyun" && channel === "sms") return "aliyun_sms";
  if (provider === "aliyun" && channel === "voice") return "aliyun_voice";
  return "mock";
}

function initialProviderStatus(provider: NotificationProviderName, channel: NotificationLog["channel"]): NotificationLog["providerStatus"] {
  if (provider === "aliyun" && (channel === "sms" || channel === "voice")) {
    return "submitted";
  }

  return "not_applicable";
}

export function selectNotificationProvider(
  env: Record<string, string | undefined> = process.env
): NotificationProviderName {
  return env.ALIYUN_ACCESS_KEY_ID && env.ALIYUN_ACCESS_KEY_SECRET ? "aliyun" : "mock";
}

export function createNotificationDelivery(
  request: NotificationDeliveryRequest,
  provider = selectNotificationProvider()
): NotificationDeliveryResult {
  const now = request.now ?? new Date("2026-07-01T09:00:00+08:00");
  const escalated = shouldEscalateLevelOne({
    level: request.level,
    acknowledgedAt: request.acknowledged ? now.toISOString() : undefined,
    lastSentAt: request.lastSentAt,
    now,
  });
  const channels = channelsForLevel(request.level, request.acknowledged);

  return {
    provider,
    escalated,
    logs: channels.map((channel) => ({
      id: createUuid(),
      eventId: request.eventId,
      title: request.title,
      channel,
      status: channel === "voice" || escalated ? "escalated" : "queued",
      level: request.level,
      sentAt: now.toISOString(),
      providerMessage: providerMessage(provider, channel),
      provider: logProvider(provider, channel),
      providerStatus: initialProviderStatus(provider, channel),
    })),
  };
}

export function filterNotificationLogsByPrivacy(
  logs: NotificationLog[],
  privacy: Pick<PrivacySettings, "smsEnabled" | "voiceCallEnabled">
) {
  return logs.filter((log) => {
    if (log.channel === "sms") return privacy.smsEnabled;
    if (log.channel === "voice") return privacy.voiceCallEnabled;
    return true;
  });
}

export function resolveNotificationRecipientPhone(
  privacy: Pick<PrivacySettings, "notificationPhone">,
  fallbackPhone?: string
) {
  return privacy.notificationPhone?.trim() || fallbackPhone;
}

export function createNotificationDeliveryForEvent(event: CalendarEvent, now = new Date("2026-07-01T09:00:00+08:00")) {
  return createNotificationDelivery({
    eventId: event.id,
    title: event.title,
    level: event.reminderLevel,
    acknowledged: event.status === "confirmed",
    now,
  });
}
