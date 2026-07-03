import type { Json } from "./database.types";

export type OpsAlert = {
  userId?: string;
  severity: "info" | "warning" | "critical";
  source: string;
  title: string;
  message: string;
  entityTable?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export function opsAlertRow(alert: OpsAlert) {
  return {
    user_id: alert.userId ?? null,
    severity: alert.severity,
    source: alert.source,
    title: alert.title,
    message: alert.message,
    entity_table: alert.entityTable,
    entity_id: alert.entityId,
    metadata: (alert.metadata ?? {}) as Json,
    created_at: alert.createdAt,
  };
}

export function createAiMemoryReviewAlert(params: {
  userId: string;
  memoryId: string;
  status: "review_required" | "stale";
  reason: string;
  now?: Date;
}) {
  return {
    userId: params.userId,
    severity: params.status === "stale" ? "warning" as const : "info" as const,
    source: "ai_memory_review",
    title: params.status === "stale" ? "AI 记忆已过期" : "AI 记忆需要复核",
    message: params.reason,
    entityTable: "ai_memories",
    entityId: params.memoryId,
    metadata: {
      reviewStatus: params.status,
    },
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}
