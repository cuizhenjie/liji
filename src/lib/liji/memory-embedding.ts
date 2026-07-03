import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  createOpenAIEmbedding,
  type CreateEmbeddingParams,
} from "./embeddings";
import { buildMemoryEmbeddingInput } from "./memory-recall";
import type { AiMemory, Contact, WorkspaceData } from "./types";

export type MemoryEmbeddingOutcome = {
  id: string;
  status: "embedded" | "skipped" | "failed" | "disabled" | "empty";
  message: string;
  dimensions?: number;
  tokenUsage?: number;
};

function shouldEmbedMemory(memory: AiMemory) {
  return !memory.embedding || memory.embedding.length === 0;
}

export async function embedAiMemory(params: {
  memory: AiMemory;
  contact?: Contact;
  fetcher?: typeof fetch;
  apiKey?: string;
  model?: string;
  dimensions?: number;
}) {
  return createOpenAIEmbedding({
    text: buildMemoryEmbeddingInput(params.memory, params.contact),
    fetcher: params.fetcher,
    apiKey: params.apiKey,
    model: params.model,
    dimensions: params.dimensions,
  } satisfies CreateEmbeddingParams);
}

export async function enrichWorkspaceAiMemoryEmbeddings(params: {
  workspace: WorkspaceData;
  fetcher?: typeof fetch;
  apiKey?: string;
  model?: string;
  dimensions?: number;
}): Promise<{ workspace: WorkspaceData; outcomes: MemoryEmbeddingOutcome[] }> {
  if (!params.workspace.privacy.cloudModelEnabled) {
    return { workspace: params.workspace, outcomes: [] };
  }

  const outcomes: MemoryEmbeddingOutcome[] = [];
  const contactsById = new Map(params.workspace.contacts.map((contact) => [contact.id, contact]));
  const aiMemories: AiMemory[] = [];

  for (const memory of params.workspace.aiMemories) {
    if (!shouldEmbedMemory(memory)) {
      aiMemories.push(memory);
      outcomes.push({
        id: memory.id,
        status: "skipped",
        message: "AI 记忆已有 embedding。",
        dimensions: memory.embedding?.length,
      });
      continue;
    }

    const embedding = await embedAiMemory({
      memory,
      contact: memory.contactId ? contactsById.get(memory.contactId) : undefined,
      fetcher: params.fetcher,
      apiKey: params.apiKey,
      model: params.model,
      dimensions: params.dimensions,
    });

    if (
      embedding.status === "ready" &&
      embedding.embedding &&
      embedding.embedding.length === DEFAULT_EMBEDDING_DIMENSIONS
    ) {
      aiMemories.push({ ...memory, embedding: embedding.embedding });
      outcomes.push({
        id: memory.id,
        status: "embedded",
        message: embedding.message,
        dimensions: embedding.dimensions,
        tokenUsage: embedding.tokenUsage,
      });
      continue;
    }

    aiMemories.push(memory);
    outcomes.push({
      id: memory.id,
      status: embedding.status === "ready" ? "failed" : embedding.status,
      message:
        embedding.status === "ready"
          ? `embedding 维度 ${embedding.dimensions} 与 ai_memories.embedding vector(${DEFAULT_EMBEDDING_DIMENSIONS}) 不匹配。`
          : embedding.message,
      dimensions: embedding.dimensions,
      tokenUsage: embedding.tokenUsage,
    });
  }

  return {
    workspace: {
      ...params.workspace,
      aiMemories,
    },
    outcomes,
  };
}
