import { isBefore, parseISO } from "date-fns";

import type { AliyunDeliveryResult, AliyunReceiptResult } from "./aliyun";
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
  nextAttemptAt?: string;
  lastSentAt: string;
  acknowledgedAt?: string;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  providerMessage?: string;
};

export function isEscalationJobDue(job: ReminderEscalationJobRecord, now = new Date()) {
  if (job.acknowledgedAt || job.status === "sent" || job.status === "cancelled") {
    return false;
  }

  const threshold = job.nextAttemptAt ?? job.triggerAt;
  return !isBefore(now, parseISO(threshold));
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
      provider: result.provider,
      providerRequestId: result.requestId,
      providerReceiptId: result.receiptId,
      providerStatus: result.providerStatus,
    };
  });
}

export function applyReceiptResultsToLogs(
  logs: NotificationLog[],
  receipts: AliyunReceiptResult[]
): NotificationLog[] {
  return logs.map((log) => {
    const receipt = receipts.find((item) => item.logId === log.id);
    if (!receipt) {
      return log;
    }

    return {
      ...log,
      status: receipt.providerStatus === "failed" ? "failed" as const : log.status,
      providerRequestId: receipt.requestId ?? log.providerRequestId,
      providerStatus: receipt.providerStatus,
      receiptCheckedAt: receipt.checkedAt,
      rawProviderReceipt: receipt.rawResult,
      providerMessage: receipt.providerMessage,
    };
  });
}

export function summarizeEscalationJobStatus(params: {
  logs: NotificationLog[];
  deliveries: AliyunDeliveryResult[];
  attemptCount?: number;
  maxAttempts?: number;
  now?: Date;
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
  const nextAttempt = planEscalationRetry({
    attemptCount: params.attemptCount ?? 0,
    maxAttempts: params.maxAttempts ?? 3,
    now: params.now,
  });

  return {
    status: nextAttempt.exhausted ? "failed" as const : "due" as const,
    providerMessage: failure?.providerMessage ?? "短信或语音升级失败。",
    nextAttemptAt: nextAttempt.nextAttemptAt,
    exhausted: nextAttempt.exhausted,
  };
}

export function planEscalationRetry(params: {
  attemptCount: number;
  maxAttempts: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const nextAttemptNumber = params.attemptCount + 1;
  if (nextAttemptNumber >= params.maxAttempts) {
    return {
      exhausted: true,
      nextAttemptAt: undefined,
      delayMinutes: 0,
    };
  }

  const delayMinutes = Math.min(30, 5 * 2 ** Math.max(0, params.attemptCount));
  return {
    exhausted: false,
    delayMinutes,
    nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
  };
}

export function createEscalationOpsAlert(params: {
  job: ReminderEscalationJobRecord;
  message: string;
  now?: Date;
}) {
  return {
    userId: params.job.userId,
    severity: "critical" as const,
    source: "reminder_escalation",
    title: `Level 1 升级失败：${params.job.title}`,
    message: params.message,
    entityTable: "reminder_escalation_jobs",
    entityId: params.job.id,
    metadata: {
      eventId: params.job.eventId,
      attemptCount: params.job.attemptCount,
      maxAttempts: params.job.maxAttempts,
    },
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}
