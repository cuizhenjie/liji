import { describe, expect, it } from "vitest";

import { parseNaturalLanguageInput } from "../../src/lib/liji/parser";
import { demoContacts } from "../../src/lib/liji/sample-data";

describe("natural language parser", () => {
  it("parses birthday input into a pending event capture", () => {
    const capture = parseNaturalLanguageInput("下周五是女儿5岁生日，预算2000元", demoContacts);

    expect(capture.status).toBe("pending");
    expect(capture.parsed.intent).toBe("event");
    expect(capture.parsed.date).toBe("2026-07-10");
    expect(capture.parsed.budgetCny).toBe(2000);
    expect(capture.parsed.frequency).toBe("RRULE:FREQ=YEARLY");
  });

  it("parses travel input into a level one capture", () => {
    const capture = parseNaturalLanguageInput("下周三去广州，周五回，每日限额2400", demoContacts);

    expect(capture.parsed.intent).toBe("travel");
    expect(capture.parsed.date).toBe("2026-07-08");
    expect(capture.parsed.endDate).toBe("2026-07-10");
    expect(capture.parsed.reminderLevel).toBe("level_1");
  });

  it("keeps business hospitality in the event confirmation flow", () => {
    const capture = parseNaturalLanguageInput(
      "周明下周三在广州天河客户宴请，预算500元，不吃香菜，需要Level 1提醒",
      demoContacts,
      undefined,
      "chat"
    );

    expect(capture.parsed.intent).toBe("event");
    expect(capture.parsed.title).toBe("周明客户宴请");
    expect(capture.parsed.targetName).toBe("周明");
    expect(capture.parsed.budgetCny).toBe(500);
    expect(capture.parsed.reminderLevel).toBe("level_1");
    expect(capture.sourceType).toBe("chat");
  });

  it("parses voice ledger input into a daily transaction capture", () => {
    const capture = parseNaturalLanguageInput(
      "今天吃饭花了125元",
      demoContacts,
      undefined,
      "voice"
    );

    expect(capture.sourceType).toBe("voice");
    expect(capture.parsed.intent).toBe("transaction");
    expect(capture.parsed.title).toBe("餐饮消费");
    expect(capture.parsed.amountCny).toBe(125);
    expect(capture.parsed.notes).toContain("记账流水");
  });
});
