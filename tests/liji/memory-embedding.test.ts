import { describe, expect, it, vi } from "vitest";

import { enrichWorkspaceAiMemoryEmbeddings } from "../../src/lib/liji/memory-embedding";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("AI memory embedding workflow", () => {
  it("does not call cloud embedding without user authorization", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const result = await enrichWorkspaceAiMemoryEmbeddings({
      workspace: {
        ...demoWorkspace,
        privacy: { ...demoWorkspace.privacy, cloudModelEnabled: false },
      },
      fetcher,
      apiKey: "test-key",
    });

    expect(result.outcomes).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("embeds memories without existing vectors when authorized", async () => {
    const embedding = Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0));
    const fetcher = vi.fn(async () =>
      Response.json({
        data: [{ embedding }],
        usage: { total_tokens: 12 },
      })
    ) as unknown as typeof fetch;

    const result = await enrichWorkspaceAiMemoryEmbeddings({
      workspace: {
        ...demoWorkspace,
        privacy: { ...demoWorkspace.privacy, cloudModelEnabled: true },
      },
      fetcher,
      apiKey: "test-key",
    });

    expect(result.outcomes[0].status).toBe("embedded");
    expect(result.workspace.aiMemories[0].embedding).toHaveLength(1536);
  });
});
