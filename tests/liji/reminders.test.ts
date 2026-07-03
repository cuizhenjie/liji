import { describe, expect, it } from "vitest";

import {
  channelsForLevel,
  createEscalationJobsFromLogs,
  createLevelOneEscalationJob,
  planLevelOneEscalation,
  runReminderScan,
  shouldEscalateLevelOne,
} from "../../src/lib/liji/reminders";
import { demoEvents } from "../../src/lib/liji/sample-data";

describe("failsafe reminders", () => {
  it("uses redundant channels for unacknowledged level one reminders", () => {
    expect(channelsForLevel("level_1")).toEqual(["push", "sms", "voice"]);
    expect(channelsForLevel("level_2")).toEqual(["push", "sms"]);
  });

  it("escalates level one reminders after 15 minutes", () => {
    expect(
      shouldEscalateLevelOne({
        level: "level_1",
        lastSentAt: "2026-07-01T09:00:00+08:00",
        now: new Date("2026-07-01T09:15:00+08:00"),
      })
    ).toBe(true);
  });

  it("plans level one escalation windows", () => {
    const waiting = planLevelOneEscalation({
      level: "level_1",
      lastSentAt: "2026-07-01T09:00:00+08:00",
      now: new Date("2026-07-01T09:10:00+08:00"),
    });
    const due = planLevelOneEscalation({
      level: "level_1",
      lastSentAt: "2026-07-01T09:00:00+08:00",
      now: new Date("2026-07-01T09:16:00+08:00"),
    });

    expect(waiting.status).toBe("waiting_ack");
    expect(due.status).toBe("due");
    expect(due.channels).toEqual(["sms", "voice"]);
  });

  it("creates notification logs for upcoming events", () => {
    const logs = runReminderScan(demoEvents);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((log) => log.channel === "voice")).toBe(true);
  });

  it("creates level one escalation jobs from first push logs", () => {
    const logs = runReminderScan(demoEvents, new Date("2026-07-01T09:00:00+08:00"));
    const jobs = createEscalationJobsFromLogs({
      logs,
      now: new Date("2026-07-01T09:01:00+08:00"),
    });

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].channels).toEqual(["sms", "voice"]);
    expect(jobs[0].status).toBe("scheduled");
  });

  it("marks level one escalation job due after the confirmation window", () => {
    const job = createLevelOneEscalationJob({
      title: "客户宴请",
      level: "level_1",
      lastSentAt: "2026-07-01T09:00:00+08:00",
      now: new Date("2026-07-01T09:20:00+08:00"),
    });

    expect(job?.status).toBe("due");
  });

  it("does not create logs for stale scheduled events", () => {
    const logs = runReminderScan(
      [
        {
          id: "e-stale",
          title: "过期事项",
          date: "2026-06-01",
          calendarType: "solar",
          reminderLevel: "level_1",
          status: "scheduled",
          source: "manual",
        },
      ],
      new Date("2026-07-01T09:00:00+08:00")
    );

    expect(logs).toEqual([]);
  });

  it("does not create logs for acknowledged events", () => {
    const logs = runReminderScan([
      {
        id: "e-confirmed",
        title: "已确认事项",
        date: "2026-07-02",
        calendarType: "solar",
        reminderLevel: "level_1",
        status: "confirmed",
        source: "manual",
      },
    ]);

    expect(logs).toEqual([]);
  });
});
