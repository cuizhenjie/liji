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
});
