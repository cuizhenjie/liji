import { differenceInMinutes, isBefore, parseISO } from "date-fns";
import { nanoid } from "nanoid";

import type { CalendarEvent, NotificationLog, ReminderLevel } from "./types";

export function channelsForLevel(level: ReminderLevel, acknowledged = false) {
  if (level === "level_1" && !acknowledged) {
    return ["push", "sms", "voice"] as const;
  }
  if (level === "level_2") {
    return ["push", "sms"] as const;
  }
  return ["push"] as const;
}

export function shouldEscalateLevelOne(params: {
  level: ReminderLevel;
  acknowledgedAt?: string;
  lastSentAt?: string;
  now: Date;
}) {
  if (params.level !== "level_1" || params.acknowledgedAt || !params.lastSentAt) {
    return false;
  }

  return differenceInMinutes(params.now, parseISO(params.lastSentAt)) >= 15;
}

export function runReminderScan(
  events: CalendarEvent[],
  now = new Date("2026-07-01T09:00:00+08:00")
): NotificationLog[] {
  return events
    .filter((event) => event.status !== "done")
    .filter((event) => isBefore(parseISO(`${event.date}T23:59:59`), new Date(now.getTime() + 1000 * 60 * 60 * 24 * 16)))
    .flatMap((event) => {
      const channels = channelsForLevel(event.reminderLevel);
      return channels.map<NotificationLog>((channel) => ({
        id: nanoid(10),
        eventId: event.id,
        title: event.title,
        channel,
        status: channel === "voice" ? "escalated" : "sent",
        level: event.reminderLevel,
        sentAt: now.toISOString(),
        providerMessage:
          channel === "voice"
            ? "MockVoice 已排队，等待用户确认后停止重试。"
            : channel === "sms"
              ? "MockSMS 已发送，真实服务可替换为阿里云/腾讯云适配器。"
              : "Web Push 已发送或写入站内提醒。",
      }));
    });
}
