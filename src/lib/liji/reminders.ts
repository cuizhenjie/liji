import { addDays, differenceInMinutes, isBefore, parseISO, startOfDay } from "date-fns";

import { createUuid } from "./ids";
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
  const windowStart = startOfDay(now);
  const windowEnd = addDays(windowStart, 16);

  return events
    .filter((event) => event.status !== "done" && event.status !== "confirmed")
    .filter((event) => {
      const eventDate = parseISO(`${event.date}T00:00:00`);
      return !isBefore(eventDate, windowStart) && isBefore(eventDate, windowEnd);
    })
    .flatMap((event) => {
      const channels = channelsForLevel(event.reminderLevel);
      return channels.map<NotificationLog>((channel) => ({
        id: createUuid(),
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
