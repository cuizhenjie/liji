import { describe, expect, it } from "vitest";

import {
  channelsForLevel,
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

  it("creates notification logs for upcoming events", () => {
    const logs = runReminderScan(demoEvents);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((log) => log.channel === "voice")).toBe(true);
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
