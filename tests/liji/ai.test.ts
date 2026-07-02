import { afterEach, describe, expect, it, vi } from "vitest";

import { parseInputWithProvider } from "../../src/lib/liji/ai";
import { demoContacts } from "../../src/lib/liji/sample-data";

describe("AI parsing provider", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_MODEL = originalModel;
    vi.restoreAllMocks();
  });

  it("normalizes non-text sources and falls back to local rules without a key", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await parseInputWithProvider({
      text: "下周五是女儿5岁生日\n预算2000元",
      contacts: demoContacts,
      source: "screenshot",
      allowCloudModel: true,
    });

    expect(result.provider).toBe("local-rules");
    expect(result.capture.rawText).toContain("；");
    expect(result.capture.parsed.intent).toBe("event");
  });

  it("uses structured cloud output when an OpenAI key is configured", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "test-model";
    const fetcher = vi.fn(async () =>
      Response.json({
        output_text: JSON.stringify({
          parsed: {
            intent: "bill",
            title: "房贷扣款",
            targetName: null,
            relation: null,
            date: "2026-07-02",
            endDate: null,
            amountCny: 12800,
            budgetCny: null,
            location: null,
            reminderLevel: "level_1",
            frequency: null,
            notes: "云端结构化解析",
            confidence: 0.91,
          },
        }),
      })
    );

    const result = await parseInputWithProvider({
      text: "明天房贷扣款12800元",
      contacts: demoContacts,
      source: "bill",
      allowCloudModel: true,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result.provider).toBe("openai");
    expect(result.capture.parsed.intent).toBe("bill");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({ method: "POST" })
    );
  });
});
