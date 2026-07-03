import { describe, expect, it } from "vitest";

import {
  createEscalationDeliveryLogs,
  isEscalationJobDue,
  mergeExternalDeliveryResults,
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
    ] }).status).toBe("failed");
  });
});
