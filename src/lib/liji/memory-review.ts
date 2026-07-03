import type { AiMemory, WorkspaceData } from "./types";

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
