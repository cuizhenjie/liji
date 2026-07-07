import { describe, expect, it } from "vitest";

import { buildCalendarAgenda } from "../../src/lib/liji/calendar-agenda";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { acknowledgeEvent, setPlanStatus } from "../../src/lib/liji/workflow";

describe("calendar agenda", () => {
  it("turns calendar rows into prioritized execution actions", () => {
    const agenda = buildCalendarAgenda({
      contacts: demoWorkspace.contacts,
      events: demoWorkspace.events,
      plans: demoWorkspace.plans,
    });

    expect(agenda[0]).toMatchObject({
      title: "周明客户宴请",
      status: "urgent",
      assetState: "待沉淀提醒资产",
      cta: "确认红线提醒",
      action: {
        kind: "confirm_event",
        eventId: "e-client-dinner",
      },
    });
    expect(agenda.find((item) => item.eventId === "e-daughter-birthday")).toMatchObject({
      status: "action",
      assetState: "待沉淀履约资产",
      cta: "确认生日方案",
      action: {
        kind: "confirm_plan",
      },
    });
    expect(agenda.find((item) => item.eventId === "e-mortgage")).toMatchObject({
      status: "done",
      assetState: "账单提醒已沉淀",
      cta: "查看账单",
    });
  });

  it("marks a confirmed reminder and settled plan as completed assets", () => {
    const acknowledged = acknowledgeEvent(demoWorkspace, "e-client-dinner");
    const confirmed = setPlanStatus(acknowledged, acknowledged.plans[0].id, "confirmed");
    const agenda = buildCalendarAgenda({
      contacts: confirmed.contacts,
      events: confirmed.events,
      plans: confirmed.plans,
    });

    expect(agenda.find((item) => item.eventId === "e-client-dinner")).toMatchObject({
      status: "done",
      assetState: "日程资产已沉淀",
    });
    expect(agenda.find((item) => item.eventId === "e-daughter-birthday")).toMatchObject({
      status: "done",
      assetState: "履约资产已沉淀",
    });
  });
});
