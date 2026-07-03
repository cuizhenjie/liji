import type { AiMemory, Contact } from "./types";

export type MemoryRecallResult = {
  memory: AiMemory;
  contactName?: string;
  score: number;
  reasons: string[];
  stale: boolean;
  provider?: "lexical" | "embedding";
};

function cjkBigrams(text: string) {
  const chars = Array.from(text.replace(/[^\u4e00-\u9fa5]/gu, ""));
  const tokens = new Set<string>();
  for (let index = 0; index < chars.length - 1; index += 1) {
    tokens.add(`${chars[index]}${chars[index + 1]}`);
  }
  return tokens;
}

function tokensFor(text: string) {
  const tokens = new Set<string>();
  for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    tokens.add(token);
  }
  for (const token of cjkBigrams(text)) {
    tokens.add(token);
  }
  return tokens;
}

function daysSince(dateText: string | undefined, now: Date) {
  if (!dateText) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function buildMemoryEmbeddingInput(memory: AiMemory, contact?: Contact) {
  return [
    contact ? `联系人：${contact.name}，关系：${contact.relation}` : "",
    `记忆：${memory.content}`,
    `来源：${memory.source}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function recallAiMemoriesByEmbedding(params: {
  queryEmbedding: number[];
  memories: AiMemory[];
  contacts?: Contact[];
  limit?: number;
  now?: Date;
}): MemoryRecallResult[] {
  const now = params.now ?? new Date();

  return params.memories
    .filter((memory) => memory.embedding && memory.embedding.length === params.queryEmbedding.length)
    .map((memory) => {
      const contact = params.contacts?.find((item) => item.id === memory.contactId);
      const similarity = cosineSimilarity(params.queryEmbedding, memory.embedding ?? []);
      const correctionBoost = memory.correctedAt ? 0.03 : 0;
      const confidenceBoost = memory.confidence * 0.04;
      const score = similarity + correctionBoost + confidenceBoost;

      return {
        memory,
        contactName: contact?.name,
        score: Number(score.toFixed(4)),
        reasons: [
          `语义相似度 ${similarity.toFixed(3)}`,
          ...(memory.correctedAt ? ["用户已校准"] : []),
        ],
        stale: !memory.correctedAt && daysSince(memory.correctedAt, now) > 180 && memory.confidence < 0.75,
        provider: "embedding" as const,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, params.limit ?? 5);
}

export function recallAiMemories(params: {
  query: string;
  memories: AiMemory[];
  contacts?: Contact[];
  limit?: number;
  now?: Date;
}): MemoryRecallResult[] {
  const queryTokens = tokensFor(params.query);
  const now = params.now ?? new Date();

  if (queryTokens.size === 0) {
    return [];
  }

  return params.memories
    .map((memory) => {
      const contact = params.contacts?.find((item) => item.id === memory.contactId);
      const memoryTokens = tokensFor(`${memory.content} ${contact?.name ?? ""} ${contact?.relation ?? ""}`);
      const overlap = Array.from(queryTokens).filter((token) => memoryTokens.has(token));
      const correctedBoost = memory.correctedAt ? 0.25 : 0;
      const confidenceBoost = memory.confidence * 0.35;
      const contactBoost =
        contact && (params.query.includes(contact.name) || params.query.includes(contact.relation)) ? 0.3 : 0;
      const score = overlap.length / queryTokens.size + correctedBoost + confidenceBoost + contactBoost;
      const stale = !memory.correctedAt && daysSince(memory.correctedAt, now) > 180 && memory.confidence < 0.75;

      return {
        memory,
        contactName: contact?.name,
        score: Number(score.toFixed(4)),
        reasons: [
          ...overlap.map((token) => `命中 ${token}`),
          ...(memory.correctedAt ? ["用户已校准"] : []),
          ...(contactBoost > 0 ? ["匹配联系人"] : []),
        ],
        stale,
        provider: "lexical" as const,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, params.limit ?? 5);
}

export function recallAiMemoriesHybrid(params: {
  query: string;
  queryEmbedding?: number[];
  memories: AiMemory[];
  contacts?: Contact[];
  limit?: number;
  now?: Date;
}) {
  const embeddingResults = params.queryEmbedding
    ? recallAiMemoriesByEmbedding({
        queryEmbedding: params.queryEmbedding,
        memories: params.memories,
        contacts: params.contacts,
        limit: params.limit,
        now: params.now,
      })
    : [];

  if (embeddingResults.length > 0) {
    return embeddingResults;
  }

  return recallAiMemories({
    query: params.query,
    memories: params.memories,
    contacts: params.contacts,
    limit: params.limit,
    now: params.now,
  });
}
