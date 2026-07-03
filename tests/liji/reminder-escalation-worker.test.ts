import { describe, expect, it } from "vitest";

import {
  createEscalationOpsAlert,
  createEscalationDeliveryLogs,
  isEscalationJobDue,
  mergeExternalDeliveryResults,
  planEscalationRetry,
  summarizeEscalationJobStatus,
} from "../../src/lib/liji/reminder-escalation-worker";

const job = {
  id: "job-1",
  userId: "user-1",
  eventId: "event-1",
  title: "客户宴请",
  channels: ["sms", "voice"] as Array<"sms" | "voice">,
  status: "scheduled" as const,
  triggerAt: "2026-07-01T09:15:00+08:00",
  lastSentAt: "2026-07-01T09:00:00+08:00",
  attemptCount: 0,
  maxAttempts: 3,
};

describe("reminder escalation worker", () => {
  it("detects due escalation jobs", () => {
    expect(isEscalationJobDue(job, new Date("2026-07-01T09:14:00+08:00"))).toBe(false);
    expect(isEscalationJobDue(job, new Date("2026-07-01T09:15:00+08:00"))).toBe(true);
  });

  it("creates delivery logs for sms and voice", () => {
    const logs = createEscalationDeliveryLogs(job, new Date("2026-07-01T09:15:00+08:00"));

    expect(logs.map((log) => log.channel)).toEqual(["sms", "voice"]);
    expect(logs.every((log) => log.status === "escalated")).toBe(true);
  });

  it("merges external provider delivery results into logs", () => {
    const logs = createEscalationDeliveryLogs(job);
    const merged = mergeExternalDeliveryResults(logs, [
      { channel: "sms", status: "sent", providerMessage: "SMS sent" },
      { channel: "voice", status: "failed", providerMessage: "Voice failed" },
    ]);

    expect(merged.map((log) => log.status)).toEqual(["sent", "failed"]);
    expect(summarizeEscalationJobStatus({ logs: merged, deliveries: [
      { channel: "sms", status: "sent", providerMessage: "SMS sent" },
      { channel: "voice", status: "failed", providerMessage: "Voice failed" },
    ] }).status).toBe("due");
  });

  it("plans retry backoff and creates ops alerts when exhausted", () => {
    const retry = planEscalationRetry({
      attemptCount: 1,
      maxAttempts: 3,
      now: new Date("2026-07-01T09:15:00+08:00"),
    });
    const exhausted = planEscalationRetry({
      attemptCount: 2,
      maxAttempts: 3,
      now: new Date("2026-07-01T09:15:00+08:00"),
    });
    const alert = createEscalationOpsAlert({
      job: { ...job, attemptCount: 3 },
      message: "voice failed",
      now: new Date("2026-07-01T09:15:00+08:00"),
    });

    expect(retry.exhausted).toBe(false);
    expect(retry.nextAttemptAt).toBe("2026-07-01T01:25:00.000Z");
    expect(exhausted.exhausted).toBe(true);
    expect(alert.severity).toBe("critical");
  });
});
