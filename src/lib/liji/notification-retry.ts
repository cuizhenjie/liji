import type { AliyunDeliveryResult } from "./aliyun";
import { createUuid } from "./ids";
import type { NotificationLog } from "./types";

export type RetryableNotificationLog = NotificationLog & {
  userId: string;
  retryOfLogId?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  stoppedAt?: string;
  stopReason?: string;
};

export type NotificationRetryLog = NotificationLog & {
  retryOfLogId: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
};

export function isNotificationRetryDue(
  log: RetryableNotificationLog,
  now = new Date()
) {
  if (
    log.stoppedAt ||
    log.acknowledgedAt ||
    log.status !== "failed" ||
    (log.channel !== "sms" && log.channel !== "voice") ||
    (log.provider !== "aliyun_sms" && log.provider !== "aliyun_voice")
  ) {
    return false;
  }

  return !log.nextRetryAt || new Date(log.nextRetryAt).getTime() <= now.getTime();
}

export function planNotificationRetry(params: {
  retryCount: number;
  maxRetries: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  if (params.retryCount >= params.maxRetries) {
    return {
      exhausted: true,
      delayMinutes: 0,
      nextRetryAt: undefined,
    };
  }

  const delayMinutes = Math.min(60, 10 * 2 ** Math.max(0, params.retryCount));
  return {
    exhausted: false,
    delayMinutes,
    nextRetryAt: new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
  };
}

export function createNotificationRetryLog(params: {
  original: RetryableNotificationLog;
  delivery?: AliyunDeliveryResult;
  now?: Date;
}): NotificationRetryLog {
  const now = params.now ?? new Date();
  const retryCount = params.original.retryCount + 1;
  const failed = !params.delivery || params.delivery.status !== "sent";
  const next = failed
    ? planNotificationRetry({
      retryCount,
      maxRetries: params.original.maxRetries,
      now,
    })
    : null;

  return {
    id: createUuid(),
    eventId: params.original.eventId,
    title: params.original.title,
    channel: params.original.channel,
    status: failed ? "failed" : "sent",
    level: params.original.level,
    sentAt: now.toISOString(),
    acknowledgedAt: undefined,
    providerMessage: params.delivery?.providerMessage ?? "外部通知重试未返回 provider 结果。",
    provider: params.delivery?.provider ?? params.original.provider,
    providerRequestId: params.delivery?.requestId,
    providerReceiptId: params.delivery?.receiptId,
    providerStatus: params.delivery?.providerStatus ?? "unknown",
    rawProviderReceipt: {},
    retryOfLogId: params.original.id,
    retryCount,
    maxRetries: params.original.maxRetries,
    nextRetryAt: next?.exhausted ? undefined : next?.nextRetryAt,
  };
}

export function createNotificationRetryOpsAlert(params: {
  log: RetryableNotificationLog;
  message?: string;
  now?: Date;
}) {
  return {
    userId: params.log.userId,
    severity: "critical" as const,
    source: "notification_retry",
    title: `通知重试失败：${params.log.title}`,
    message: params.message ?? "短信/语音通知多次失败，请人工确认号码、模板和供应商状态。",
    entityTable: "notification_logs",
    entityId: params.log.id,
    metadata: {
      eventId: params.log.eventId,
      channel: params.log.channel,
      provider: params.log.provider,
      retryCount: params.log.retryCount,
      maxRetries: params.log.maxRetries,
      providerStatus: params.log.providerStatus,
    },
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}
