import { addDays, addMinutes, differenceInMinutes, isBefore, parseISO, startOfDay } from "date-fns";

import { createUuid } from "./ids";
import type { CalendarEvent, NotificationLog, ReminderLevel } from "./types";

export type ReminderEscalationJob = {
  id: string;
  eventId?: string;
  title: string;
  level: "level_1";
  channels: Array<"sms" | "voice">;
  status: "scheduled" | "due" | "sent" | "cancelled" | "failed";
  triggerAt: string;
  lastSentAt: string;
  acknowledgedAt?: string;
  attemptCount: number;
  providerMessage: string;
};

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

export function planLevelOneEscalation(params: {
  level: ReminderLevel;
  acknowledgedAt?: string;
  lastSentAt?: string;
  now: Date;
}) {
  if (params.level !== "level_1") {
    return {
      status: "not_required" as const,
      channels: [] as Array<"sms" | "voice">,
      reason: "非 Level 1 事件无需语音升级。",
    };
  }

  if (params.acknowledgedAt) {
    return {
      status: "stopped" as const,
      channels: [] as Array<"sms" | "voice">,
      reason: "用户已确认，停止升级。",
    };
  }

  if (!params.lastSentAt) {
    return {
      status: "waiting_first_push" as const,
      channels: [] as Array<"sms" | "voice">,
      reason: "等待首次 Push 投递后开始 15 分钟计时。",
    };
  }

  const dueAt = addMinutes(parseISO(params.lastSentAt), 15);
  if (isBefore(params.now, dueAt)) {
    return {
      status: "waiting_ack" as const,
      channels: [] as Array<"sms" | "voice">,
      dueAt: dueAt.toISOString(),
      reason: "仍在 15 分钟确认窗口内。",
    };
  }

  return {
    status: "due" as const,
    channels: ["sms", "voice"] as const,
    dueAt: dueAt.toISOString(),
    reason: "确认窗口已过，进入短信与语音升级。",
  };
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

export function createLevelOneEscalationJob(params: {
  eventId?: string;
  title: string;
  level: ReminderLevel;
  lastSentAt: string;
  acknowledgedAt?: string;
  now?: Date;
}): ReminderEscalationJob | null {
  if (params.level !== "level_1" || params.acknowledgedAt) {
    return null;
  }

  const triggerAt = addMinutes(parseISO(params.lastSentAt), 15);
  const now = params.now ?? new Date();

  return {
    id: createUuid(),
    eventId: params.eventId,
    title: params.title,
    level: "level_1",
    channels: ["sms", "voice"],
    status: isBefore(now, triggerAt) ? "scheduled" : "due",
    triggerAt: triggerAt.toISOString(),
    lastSentAt: params.lastSentAt,
    acknowledgedAt: params.acknowledgedAt,
    attemptCount: 0,
    providerMessage: "Level 1 Push 未确认时，将在 15 分钟后升级短信和语音。",
  };
}

export function createEscalationJobsFromLogs(params: {
  logs: NotificationLog[];
  now?: Date;
}): ReminderEscalationJob[] {
  const now = params.now ?? new Date();
  const firstPushByEvent = new Map<string, NotificationLog>();

  for (const log of params.logs) {
    if (log.level !== "level_1" || log.channel !== "push" || log.acknowledgedAt) {
      continue;
    }

    const key = log.eventId ?? log.title;
    if (!firstPushByEvent.has(key)) {
      firstPushByEvent.set(key, log);
    }
  }

  return Array.from(firstPushByEvent.values())
    .map((log) =>
      createLevelOneEscalationJob({
        eventId: log.eventId,
        title: log.title,
        level: log.level,
        lastSentAt: log.sentAt,
        acknowledgedAt: log.acknowledgedAt,
        now,
      })
    )
    .filter((job): job is ReminderEscalationJob => Boolean(job));
}
