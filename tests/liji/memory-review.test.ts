import { describe, expect, it } from "vitest";

import {
  applyAiMemoryBatchAction,
  applyReviewedAiMemory,
  reviewAiMemory,
  reviewWorkspaceAiMemory,
} from "../../src/lib/liji/memory-review";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("AI memory review", () => {
  it("marks reviewed memories healthy and user-verified", () => {
    const reviewed = reviewAiMemory(
      {
        id: "m-1",
        contactId: "c-client",
        content: "周明不吃香菜",
        source: "ai",
        confidence: 0.62,
        reviewStatus: "stale",
      },
      {
        content: "周明不吃香菜，偏好安静包间。",
        now: new Date("2026-07-03T10:00:00+08:00"),
      }
    );

    expect(reviewed.content).toBe("周明不吃香菜，偏好安静包间。");
    expect(reviewed.source).toBe("manual");
    expect(reviewed.confidence).toBe(1);
    expect(reviewed.reviewStatus).toBe("healthy");
    expect(reviewed.correctedAt).toBe("2026-07-03T02:00:00.000Z");
    expect(reviewed.reviewedAt).toBe(reviewed.correctedAt);
  });

  it("applies reviewed memories to workspace health", () => {
    const reviewed = reviewAiMemory(demoWorkspace.aiMemories[0], {
      now: new Date("2026-07-03T10:00:00+08:00"),
    });
    const workspace = applyReviewedAiMemory(demoWorkspace, reviewed);

    expect(workspace.aiMemories[0].reviewStatus).toBe("healthy");
    expect(workspace.aiMemories[0].correctedAt).toBeDefined();
    expect(workspace.contacts.find((contact) => contact.id === "c-client")?.aiMemoryHealth)
      .toBeGreaterThan(demoWorkspace.contacts[1].aiMemoryHealth);
  });

  it("returns unchanged workspace when memory is missing", () => {
    const reviewed = reviewWorkspaceAiMemory(demoWorkspace, "missing");

    expect(reviewed.memory).toBeUndefined();
    expect(reviewed.workspace).toBe(demoWorkspace);
  });

  it("supports batch ignore and reembed state transitions", () => {
    const staleMemory = {
      ...demoWorkspace.aiMemories[0],
      embedding: [0.1, 0.2],
      lastEmbeddedAt: "2026-07-01T00:00:00.000Z",
      reviewStatus: "stale" as const,
    };
    const ignored = applyAiMemoryBatchAction(staleMemory, {
      action: "ignore",
      now: new Date("2026-07-03T10:00:00+08:00"),
    });
    const reembed = applyAiMemoryBatchAction(staleMemory, {
      action: "reembed",
      now: new Date("2026-07-03T10:00:00+08:00"),
    });

    expect(ignored.memory.reviewStatus).toBe("healthy");
    expect(ignored.embeddingInvalidated).toBe(false);
    expect(reembed.memory.embedding).toBeUndefined();
    expect(reembed.memory.lastEmbeddedAt).toBeUndefined();
    expect(reembed.embeddingInvalidated).toBe(true);
  });
});
