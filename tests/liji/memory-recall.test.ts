import { describe, expect, it } from "vitest";

import {
  cosineSimilarity,
  recallAiMemories,
  recallAiMemoriesByEmbedding,
  recallAiMemoriesHybrid,
} from "../../src/lib/liji/memory-recall";
import { demoContacts, demoWorkspace } from "../../src/lib/liji/sample-data";

describe("AI memory recall", () => {
  it("recalls memories by contact and preference keywords", () => {
    const results = recallAiMemories({
      query: "周明 香菜 包间",
      memories: demoWorkspace.aiMemories,
      contacts: demoContacts,
    });

    expect(results[0].memory.content).toContain("周明");
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].reasons.length).toBeGreaterThan(0);
  });

  it("returns no memories for empty queries", () => {
    expect(
      recallAiMemories({
        query: " ",
        memories: demoWorkspace.aiMemories,
        contacts: demoContacts,
      })
    ).toEqual([]);
  });

  it("recalls memories by embedding similarity before lexical fallback", () => {
    const memories = [
      { ...demoWorkspace.aiMemories[0], id: "m-vector-a", embedding: [1, 0, 0] },
      { ...demoWorkspace.aiMemories[1], id: "m-vector-b", embedding: [0, 1, 0] },
    ];

    const results = recallAiMemoriesByEmbedding({
      queryEmbedding: [0.99, 0.01, 0],
      memories,
      contacts: demoContacts,
    });

    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(results[0].memory.id).toBe("m-vector-a");
    expect(results[0].provider).toBe("embedding");
  });

  it("uses lexical recall when no embeddings are available", () => {
    const results = recallAiMemoriesHybrid({
      query: "周明 香菜",
      queryEmbedding: [1, 0, 0],
      memories: demoWorkspace.aiMemories,
      contacts: demoContacts,
    });

    expect(results[0].provider).toBe("lexical");
  });
});
