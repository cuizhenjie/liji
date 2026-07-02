export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "export"
  | "notify"
  | "fulfill"
  | "ai_parse";

export type AuditLogEntry = {
  id: string;
  userId?: string;
  action: AuditAction;
  entityTable: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditInsertClient = {
  from(table: string): {
    insert(row: {
      user_id: string | null;
      action: AuditAction;
      entity_table: string;
      entity_id?: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }): PromiseLike<{ error: { message?: string } | null }>;
  };
};

export function createAuditLogEntry(params: {
  userId?: string;
  action: AuditAction;
  entityTable: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  now?: Date;
}): AuditLogEntry {
  return {
    id: crypto.randomUUID?.() ?? `audit-${Date.now()}`,
    userId: params.userId,
    action: params.action,
    entityTable: params.entityTable,
    entityId: params.entityId,
    metadata: params.metadata ?? {},
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}

export async function persistAuditLog(
  entry: AuditLogEntry,
  client: AuditInsertClient | null
) {
  if (!client) {
    return { persisted: false, error: null };
  }

  const { error } = await client.from("audit_logs").insert({
    user_id: entry.userId ?? null,
    action: entry.action,
    entity_table: entry.entityTable,
    entity_id: entry.entityId,
    metadata: entry.metadata,
    created_at: entry.createdAt,
  });

  return { persisted: !error, error: error?.message ?? null };
}
