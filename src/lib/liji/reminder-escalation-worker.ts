import { isBefore, parseISO } from "date-fns";

import type { AliyunDeliveryResult } from "./aliyun";
import { createUuid } from "./ids";
import type { NotificationLog } from "./types";

export type ReminderEscalationJobRecord = {
  id: string;
  userId: string;
  eventId?: string;
  title: string;
  channels: Array<"sms" | "voice">;
  status: "scheduled" | "due" | "sent" | "cancelled" | "failed";
  triggerAt: string;
  lastSentAt: string;
  acknowledgedAt?: string;
  attemptCount: number;
  providerMessage?: string;
};

export function isEscalationJobDue(job: ReminderEscalationJobRecord, now = new Date()) {
  if (job.acknowledgedAt || job.status === "sent" || job.status === "cancelled") {
    return false;
  }

  return !isBefore(now, parseISO(job.triggerAt));
}

export function createEscalationDeliveryLogs(
  job: ReminderEscalationJobRecord,
  now = new Date()
): NotificationLog[] {
  return job.channels.map((channel) => ({
    id: createUuid(),
    eventId: job.eventId,
    title: job.title,
    channel,
    status: "escalated",
    level: "level_1",
    sentAt: now.toISOString(),
    providerMessage: `Level 1 未确认，升级 ${channel === "sms" ? "短信" : "语音"} 通知。`,
  }));
}

export function mergeExternalDeliveryResults(
  logs: NotificationLog[],
  results: AliyunDeliveryResult[]
): NotificationLog[] {
  return logs.map((log) => {
    const result = results.find((item) => item.channel === log.channel);
    if (!result) {
      return log;
    }

    return {
      ...log,
      status: result.status === "sent" ? "sent" as const : "failed" as const,
      providerMessage: result.providerMessage,
    };
  });
}

export function summarizeEscalationJobStatus(params: {
  logs: NotificationLog[];
  deliveries: AliyunDeliveryResult[];
}) {
  if (params.logs.length === 0) {
    return {
      status: "cancelled" as const,
      providerMessage: "用户隐私授权已关闭短信和语音，升级任务取消。",
    };
  }

  if (params.deliveries.length === 0) {
    return {
      status: "sent" as const,
      providerMessage: "已生成升级通知日志，等待 provider 回执。",
    };
  }

  if (params.deliveries.every((item) => item.status === "sent")) {
    return {
      status: "sent" as const,
      providerMessage: "短信与语音升级均已提交。",
    };
  }

  const failure = params.deliveries.find((item) => item.status !== "sent");
  return {
    status: "failed" as const,
    providerMessage: failure?.providerMessage ?? "短信或语音升级失败。",
  };
}
