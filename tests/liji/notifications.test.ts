import { describe, expect, it } from "vitest";

import {
  createNotificationDelivery,
  filterNotificationLogsByPrivacy,
  selectNotificationProvider,
} from "../../src/lib/liji/notifications";

describe("notification provider adapter", () => {
  it("selects mock provider without cloud credentials", () => {
    expect(selectNotificationProvider({})).toBe("mock");
  });

  it("creates level one delivery logs for all redundant channels", () => {
    const delivery = createNotificationDelivery({
      title: "客户宴请",
      level: "level_1",
      eventId: "e-1",
    }, "mock");

    expect(delivery.logs.map((log) => log.channel)).toEqual(["push", "sms", "voice"]);
    expect(delivery.logs.some((log) => log.status === "escalated")).toBe(true);
  });

  it("filters sms and voice logs when privacy settings disable them", () => {
    const delivery = createNotificationDelivery({
      title: "客户宴请",
      level: "level_1",
      eventId: "e-1",
    }, "mock");

    const logs = filterNotificationLogsByPrivacy(delivery.logs, {
      smsEnabled: false,
      voiceCallEnabled: false,
    });

    expect(logs.map((log) => log.channel)).toEqual(["push"]);
  });
});
