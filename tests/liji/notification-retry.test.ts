import { describe, expect, it } from "vitest";

import {
  createNotificationRetryLog,
  createNotificationRetryOpsAlert,
  isNotificationRetryDue,
  planNotificationRetry,
  type RetryableNotificationLog,
} from "../../src/lib/liji/notification-retry";

const failedLog: RetryableNotificationLog = {
  id: "log-1",
  userId: "user-1",
  eventId: "event-1",
  title: "客户宴请",
  channel: "sms",
  status: "failed",
  level: "level_1",
  sentAt: "2026-07-03T10:00:00.000Z",
  providerMessage: "carrier failed",
  provider: "aliyun_sms",
  providerStatus: "failed",
  retryCount: 0,
  maxRetries: 2,
};

describe("notification retry worker helpers", () => {
  it("detects retryable failed external notification logs", () => {
    expect(isNotificationRetryDue(failedLog, new Date("2026-07-03T10:05:00.000Z"))).toBe(true);
    expect(isNotificationRetryDue({
      ...failedLog,
      nextRetryAt: "2026-07-03T10:10:00.000Z",
    }, new Date("2026-07-03T10:05:00.000Z"))).toBe(false);
    expect(isNotificationRetryDue({ ...failedLog, stoppedAt: "2026-07-03T10:01:00.000Z" })).toBe(false);
    expect(isNotificationRetryDue({ ...failedLog, provider: "mock" })).toBe(false);
  });

  it("plans bounded retry backoff", () => {
    expect(planNotificationRetry({
      retryCount: 0,
      maxRetries: 2,
      now: new Date("2026-07-03T10:00:00.000Z"),
      delayMultiplier: 3,
    })).toMatchObject({
      exhausted: false,
      delayMinutes: 30,
      nextRetryAt: "2026-07-03T10:30:00.000Z",
    });
    expect(planNotificationRetry({
      retryCount: 0,
      maxRetries: 2,
      now: new Date("2026-07-03T10:00:00.000Z"),
    })).toMatchObject({
      exhausted: false,
      delayMinutes: 10,
      nextRetryAt: "2026-07-03T10:10:00.000Z",
    });
    expect(planNotificationRetry({
      retryCount: 2,
      maxRetries: 2,
      now: new Date("2026-07-03T10:00:00.000Z"),
    }).exhausted).toBe(true);
  });

  it("creates retry logs and ops alerts", () => {
    const retryLog = createNotificationRetryLog({
      original: failedLog,
      delivery: {
        channel: "sms",
        status: "failed",
        provider: "aliyun_sms",
        providerStatus: "failed",
        providerMessage: "template missing",
      },
      governance: {
        failureClass: "template_or_provider",
        retryAllowed: false,
        stopReason: "template_or_provider_error",
        alertSeverity: "critical",
        alertMessage: "模板异常",
        retryDelayMultiplier: 1,
      },
      now: new Date("2026-07-03T10:00:00.000Z"),
    });
    const alert = createNotificationRetryOpsAlert({
      log: { ...failedLog, retryCount: 2 },
      severity: "warning",
      governance: {
        failureClass: "rate_limited",
        retryAllowed: true,
        alertSeverity: "warning",
        alertMessage: "频控",
        retryDelayMultiplier: 3,
      },
      now: new Date("2026-07-03T10:00:00.000Z"),
    });

    expect(retryLog.retryOfLogId).toBe("log-1");
    expect(retryLog.retryCount).toBe(1);
    expect(retryLog.status).toBe("failed");
    expect(retryLog.nextRetryAt).toBe("2026-07-03T10:20:00.000Z");
    expect(alert).toMatchObject({
      source: "notification_retry",
      severity: "warning",
      entityTable: "notification_logs",
      entityId: "log-1",
    });
    expect(alert.metadata).toMatchObject({
      failureClass: "rate_limited",
    });
  });
});
