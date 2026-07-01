import { describe, expect, it } from "vitest";

import { parseNaturalLanguageInput } from "../../src/lib/liji/parser";
import { demoContacts, demoWorkspace } from "../../src/lib/liji/sample-data";
import {
  acknowledgeEvent,
  acknowledgeNotificationLog,
  applyConfirmedCapture,
  rejectCapture,
  setPlanStatus,
} from "../../src/lib/liji/workflow";

describe("business workflow", () => {
  it("confirms a birthday capture into an event", () => {
    const capture = parseNaturalLanguageInput("下周五是女儿5岁生日，预算2000元", demoContacts);
    const next = applyConfirmedCapture(
      { ...demoWorkspace, captures: [capture] },
      capture
    );

    expect(next.captures[0].status).toBe("confirmed");
    expect(next.events[0].title).toContain("生日");
    expect(next.events[0].budgetCny).toBe(2000);
  });

  it("does not duplicate business records when the same capture is confirmed twice", () => {
    const capture = parseNaturalLanguageInput("下周五是女儿5岁生日，预算2000元", demoContacts);
    const first = applyConfirmedCapture({ ...demoWorkspace, captures: [capture] }, capture);
    const second = applyConfirmedCapture(first, capture);

    expect(second.events).toHaveLength(first.events.length);
  });

  it("confirms bill and memory captures into their business buckets", () => {
    const bill = parseNaturalLanguageInput("明天房贷扣款12800元", demoContacts);
    const memory = parseNaturalLanguageInput("周明下次宴请不吃香菜", demoContacts);
    const withBill = applyConfirmedCapture({ ...demoWorkspace, captures: [bill] }, bill);
    const withMemory = applyConfirmedCapture({ ...withBill, captures: [memory] }, memory);

    expect(withBill.recurringBills[0].title).toBe("房贷扣款");
    expect(withMemory.aiMemories[0].content).toBe("周明下次宴请不吃香菜");
  });

  it("rejects captures and updates plan status", () => {
    const capture = parseNaturalLanguageInput("今天吃饭花了125元", demoContacts);
    const rejected = rejectCapture({ ...demoWorkspace, captures: [capture] }, capture.id);
    const confirmedPlan = setPlanStatus(demoWorkspace, demoWorkspace.plans[0].id, "confirmed");

    expect(rejected.captures[0].status).toBe("rejected");
    expect(confirmedPlan.plans[0].status).toBe("confirmed");
  });

  it("acknowledges events and notification logs", () => {
    const eventId = demoWorkspace.events[1].id;
    const acknowledgedEvent = acknowledgeEvent(demoWorkspace, eventId);
    const logId = acknowledgedEvent.notificationLogs[0].id;
    const acknowledgedLog = acknowledgeNotificationLog(acknowledgedEvent, logId);

    expect(acknowledgedEvent.events.find((event) => event.id === eventId)?.status).toBe("confirmed");
    expect(acknowledgedLog.notificationLogs[0].status).toBe("confirmed");
  });
});
