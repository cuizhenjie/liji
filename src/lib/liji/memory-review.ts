import type { AiMemory, WorkspaceData } from "./types";

export type AiMemoryBatchAction = "review" | "ignore" | "reembed" | "delete";

export function reviewAiMemory(
  memory: AiMemory,
  params: {
    content?: string;
    now?: Date;
  } = {}
): AiMemory {
  const reviewedAt = (params.now ?? new Date()).toISOString();
  const content = (params.content ?? memory.content).trim();

  return {
    ...memory,
    content,
    source: "manual",
    confidence: 1,
    reviewStatus: "healthy",
    reviewedAt,
    correctedAt: reviewedAt,
  };
}

export function applyAiMemoryBatchAction(
  memory: AiMemory,
  params: {
    action: Exclude<AiMemoryBatchAction, "delete">;
    content?: string;
    now?: Date;
  }
): {
  memory: AiMemory;
  contentChanged: boolean;
  embeddingInvalidated: boolean;
} {
  const reviewedAt = (params.now ?? new Date()).toISOString();

  if (params.action === "review") {
    const reviewed = reviewAiMemory(memory, {
      content: params.content,
      now: params.now,
    });
    const contentChanged = reviewed.content !== memory.content;

    return {
      memory: {
        ...reviewed,
        embedding: contentChanged ? undefined : reviewed.embedding,
        lastEmbeddedAt: contentChanged ? undefined : reviewed.lastEmbeddedAt,
      },
      contentChanged,
      embeddingInvalidated: contentChanged,
    };
  }

  if (params.action === "reembed") {
    return {
      memory: {
        ...memory,
        embedding: undefined,
        reviewStatus: "healthy",
        reviewedAt,
        lastEmbeddedAt: undefined,
      },
      contentChanged: false,
      embeddingInvalidated: true,
    };
  }

  return {
    memory: {
      ...memory,
      reviewStatus: "healthy",
      reviewedAt,
    },
    contentChanged: false,
    embeddingInvalidated: false,
  };
}

export function applyReviewedAiMemory(
  workspace: WorkspaceData,
  reviewedMemory: AiMemory
): WorkspaceData {
  return {
    ...workspace,
    aiMemories: workspace.aiMemories.map((memory) =>
      memory.id === reviewedMemory.id ? reviewedMemory : memory
    ),
    contacts: workspace.contacts.map((contact) =>
      reviewedMemory.contactId && contact.id === reviewedMemory.contactId
        ? { ...contact, aiMemoryHealth: Math.min(100, contact.aiMemoryHealth + 4) }
        : contact
    ),
  };
}

export function reviewWorkspaceAiMemory(
  workspace: WorkspaceData,
  memoryId: string,
  params: {
    content?: string;
    now?: Date;
  } = {}
): {
  workspace: WorkspaceData;
  memory?: AiMemory;
} {
  const memory = workspace.aiMemories.find((item) => item.id === memoryId);
  if (!memory) {
    return { workspace };
  }

  const reviewedMemory = reviewAiMemory(memory, params);
  return {
    workspace: applyReviewedAiMemory(workspace, reviewedMemory),
    memory: reviewedMemory,
  };
}
