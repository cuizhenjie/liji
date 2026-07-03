import { describe, expect, it } from "vitest";

import {
  evaluateAiMemoryForReview,
  maintainWorkspaceAiMemories,
} from "../../src/lib/liji/memory-maintenance";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("AI memory maintenance", () => {
  it("marks old low confidence AI memories as stale", () => {
    const review = evaluateAiMemoryForReview(
      {
        id: "m-stale",
        content: "客户喜欢安静包间",
        source: "ai",
        confidence: 0.68,
        createdAt: "2025-01-01T00:00:00Z",
      },
      new Date("2026-07-01T00:00:00Z")
    );

    expect(review.status).toBe("stale");
    expect(review.confidence).toBeLessThan(0.68);
  });

  it("keeps corrected memories healthy", () => {
    const review = evaluateAiMemoryForReview(
      {
        id: "m-corrected",
        content: "客户不吃香菜",
        source: "manual",
        confidence: 0.92,
        correctedAt: "2025-01-01T00:00:00Z",
      },
      new Date("2026-07-01T00:00:00Z")
    );

    expect(review.status).toBe("healthy");
  });

  it("maintains workspace memories without embedding when disabled", async () => {
    const maintained = await maintainWorkspaceAiMemories({
      workspace: {
        ...demoWorkspace,
        aiMemories: [{
          ...demoWorkspace.aiMemories[0],
          correctedAt: undefined,
          confidence: 0.68,
          createdAt: "2025-01-01T00:00:00Z",
        }],
      },
      now: new Date("2026-07-01T00:00:00Z"),
      embedMissing: false,
    });

    expect(maintained.reviews[0].status).toBe("stale");
    expect(maintained.workspace.aiMemories[0].reviewStatus).toBe("stale");
    expect(maintained.embeddings).toEqual([]);
  });
});
