import { describe, expect, it, vi } from "vitest";

import {
  createOpenAIEmbedding,
  embeddingToVectorLiteral,
  normalizeEmbeddingText,
} from "../../src/lib/liji/embeddings";

describe("OpenAI embedding adapter", () => {
  it("normalizes long whitespace-heavy input", () => {
    expect(normalizeEmbeddingText("  周明\n\n不吃香菜   ")).toBe("周明 不吃香菜");
  });

  it("skips cloud embedding when api key is missing", async () => {
    const result = await createOpenAIEmbedding({
      text: "周明不吃香菜",
      apiKey: "",
    });

    expect(result.status).toBe("disabled");
  });

  it("parses successful embedding responses", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { total_tokens: 8 },
      })
    ) as unknown as typeof fetch;

    const result = await createOpenAIEmbedding({
      text: "周明不吃香菜",
      apiKey: "test-key",
      dimensions: 3,
      fetcher,
    });

    expect(result.status).toBe("ready");
    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.tokenUsage).toBe(8);
    expect(embeddingToVectorLiteral([0.123456789])).toBe("[0.12345679]");
  });
});
