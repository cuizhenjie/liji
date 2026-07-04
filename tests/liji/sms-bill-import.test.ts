import { describe, expect, it } from "vitest";

import { importSmsBillMessages } from "../../src/lib/liji/sms-bill-import";
import { demoContacts } from "../../src/lib/liji/sample-data";

describe("sms bill import", () => {
  it("turns native bridge SMS messages into pending bill captures", async () => {
    const result = await importSmsBillMessages({
      contacts: demoContacts,
      messages: [
        {
          sender: "招商银行",
          text: "您尾号8621账户房贷扣款12800元，交易时间2026-07-02。",
          receivedAt: "2026-07-02T08:00:00+08:00",
        },
      ],
    });

    expect(result.skipped).toBe(0);
    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].sourceType).toBe("bill");
    expect(result.captures[0].status).toBe("pending");
    expect(result.captures[0].rawText).toContain("招商银行");
  });

  it("skips empty SMS messages", async () => {
    const result = await importSmsBillMessages({
      contacts: demoContacts,
      messages: [{ text: " " }],
    });

    expect(result.skipped).toBe(1);
    expect(result.captures).toEqual([]);
  });
});
