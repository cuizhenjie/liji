import { differenceInCalendarDays, parseISO } from "date-fns";

import {
  enrichWorkspaceAiMemoryEmbeddings,
  type MemoryEmbeddingOutcome,
} from "./memory-embedding";
import type { AiMemory, WorkspaceData } from "./types";

export type MemoryReviewDecision = {
  id: string;
  status: "healthy" | "review_required" | "stale";
  confidence: number;
  reason: string;
};

function validDate(value: string | undefined) {
  if (!value) return undefined;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function referenceDate(memory: AiMemory) {
  return validDate(memory.correctedAt) ?? validDate(memory.reviewedAt) ?? validDate(memory.createdAt);
}

export function evaluateAiMemoryForReview(memory: AiMemory, now = new Date()): MemoryReviewDecision {
  const reference = referenceDate(memory);
  const ageDays = reference ? Math.max(0, differenceInCalendarDays(now, reference)) : 365;
  const decay = memory.correctedAt ? 0 : Math.min(0.35, Math.floor(ageDays / 90) * 0.08);
  const confidence = Number(Math.max(0, memory.confidence - decay).toFixed(3));

  if (!memory.correctedAt && ageDays >= 240 && confidence < 0.7) {
    return {
      id: memory.id,
      status: "stale",
      confidence,
      reason: `未校准 AI 记忆已超过 ${ageDays} 天且置信度偏低。`,
    };
  }

  if (!memory.correctedAt && (ageDays >= 120 || confidence < 0.75)) {
    return {
      id: memory.id,
      status: "review_required",
      confidence,
      reason: `AI 记忆需要用户复核，年龄 ${ageDays} 天，置信度 ${confidence}。`,
    };
  }

  return {
    id: memory.id,
    status: "healthy",
    confidence,
    reason: memory.correctedAt ? "用户已校准，保持健康。" : "记忆仍在健康窗口内。",
  };
}

export async function maintainWorkspaceAiMemories(params: {
  workspace: WorkspaceData;
  now?: Date;
  embedMissing?: boolean;
  fetcher?: typeof fetch;
  apiKey?: string;
}): Promise<{
  workspace: WorkspaceData;
  reviews: MemoryReviewDecision[];
  embeddings: MemoryEmbeddingOutcome[];
}> {
  const now = params.now ?? new Date();
  const reviews = params.workspace.aiMemories.map((memory) => evaluateAiMemoryForReview(memory, now));
  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  const aiMemories = params.workspace.aiMemories.map((memory) => {
    const review = reviewById.get(memory.id);
    return {
      ...memory,
      confidence: review?.confidence ?? memory.confidence,
      reviewStatus: review?.status ?? memory.reviewStatus ?? "healthy",
      reviewedAt: now.toISOString(),
    };
  });

  const reviewedWorkspace = {
    ...params.workspace,
    aiMemories,
  };

  if (!params.embedMissing) {
    return { workspace: reviewedWorkspace, reviews, embeddings: [] };
  }

  const enriched = await enrichWorkspaceAiMemoryEmbeddings({
    workspace: reviewedWorkspace,
    fetcher: params.fetcher,
    apiKey: params.apiKey,
  });

  return {
    workspace: {
      ...enriched.workspace,
      aiMemories: enriched.workspace.aiMemories.map((memory) =>
        memory.embedding && memory.embedding.length > 0
          ? { ...memory, lastEmbeddedAt: now.toISOString() }
          : memory
      ),
    },
    reviews,
    embeddings: enriched.outcomes,
  };
}
