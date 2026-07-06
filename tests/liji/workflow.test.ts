import { describe, expect, it } from "vitest";

import { parseNaturalLanguageInput } from "../../src/lib/liji/parser";
import { buildPreferenceSuggestions } from "../../src/lib/liji/preference-suggestions";
import { demoContacts, demoWorkspace } from "../../src/lib/liji/sample-data";
import {
  acknowledgeEvent,
  acknowledgeNotificationLog,
  applyConfirmedCaptures,
  archiveCapture,
  archiveCaptures,
  applyConfirmedCapture,
  applyPreferenceSuggestion,
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

  it("confirms voice ledger captures into daily transactions", () => {
    const capture = parseNaturalLanguageInput("今天吃饭花了125元", demoContacts, undefined, "voice");
    const confirmed = applyConfirmedCapture({ ...demoWorkspace, captures: [capture] }, capture);

    expect(confirmed.captures[0].status).toBe("confirmed");
    expect(confirmed.transactions[0]).toMatchObject({
      title: "餐饮消费",
      amountCny: 125,
      category: "daily",
      source: "ai",
    });
  });

  it("batch confirms high-confidence captures and archives low-confidence captures", () => {
    const birthday = parseNaturalLanguageInput("下周五是女儿5岁生日，预算2000元", demoContacts);
    const bill = parseNaturalLanguageInput("明天房贷扣款12800元", demoContacts);
    const memory = parseNaturalLanguageInput("周明下次宴请不吃香菜", demoContacts);
    const workspace = {
      ...demoWorkspace,
      captures: [birthday, bill, memory],
    };
    const confirmed = applyConfirmedCaptures(workspace, [birthday, bill]);
    const archivedOne = archiveCapture(confirmed, memory.id);
    const archivedMany = archiveCaptures(workspace, [memory.id]);

    expect(confirmed.captures.filter((capture) => capture.status === "confirmed")).toHaveLength(2);
    expect(confirmed.events[0].title).toContain("生日");
    expect(confirmed.recurringBills[0].title).toBe("房贷扣款");
    expect(archivedOne.captures.find((capture) => capture.id === memory.id)?.status).toBe("archived");
    expect(archivedMany.captures.find((capture) => capture.id === memory.id)?.status).toBe("archived");
  });

  it("acknowledges events and notification logs", () => {
    const eventId = demoWorkspace.events[1].id;
    const acknowledgedEvent = acknowledgeEvent(demoWorkspace, eventId);
    const logId = acknowledgedEvent.notificationLogs[0].id;
    const acknowledgedLog = acknowledgeNotificationLog(acknowledgedEvent, logId);

    expect(acknowledgedEvent.events.find((event) => event.id === eventId)?.status).toBe("confirmed");
    expect(acknowledgedLog.notificationLogs[0].status).toBe("confirmed");
  });

  it("applies a reviewed AI memory suggestion into the VIP preference matrix", () => {
    const [suggestion] = buildPreferenceSuggestions(demoWorkspace);
    const next = applyPreferenceSuggestion(demoWorkspace, suggestion);
    const contact = next.contacts.find((item) => item.id === suggestion.contactId);
    const memory = next.aiMemories.find((item) => item.id === suggestion.memoryId);

    expect(contact?.preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "food",
          label: "安静包间",
          source: "ai",
        }),
      ])
    );
    expect(memory?.reviewStatus).toBe("healthy");
    expect(memory?.reviewedAt).toBe("2026-07-01T01:00:00.000Z");
  });
});
