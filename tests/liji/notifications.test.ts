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
    expect(delivery.logs.map((log) => log.provider)).toEqual(["web_push", "mock", "mock"]);
    expect(delivery.logs.every((log) => log.providerStatus === "not_applicable")).toBe(true);
  });

  it("marks Aliyun sms and voice logs as submitted before receipt polling", () => {
    const delivery = createNotificationDelivery({
      title: "客户宴请",
      level: "level_1",
      eventId: "e-1",
    }, "aliyun");

    expect(delivery.logs.map((log) => log.provider)).toEqual([
      "web_push",
      "aliyun_sms",
      "aliyun_voice",
    ]);
    expect(delivery.logs.map((log) => log.providerStatus)).toEqual([
      "not_applicable",
      "submitted",
      "submitted",
    ]);
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
