import { z } from "zod";

import {
  applyAiMemoryBatchAction,
  type AiMemoryBatchAction,
} from "@/lib/liji/memory-review";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import { mapAiMemory } from "@/lib/liji/supabase-mappers";

const requestSchema = z.object({
  action: z.enum(["review", "ignore", "delete", "reembed"]),
  memoryIds: z.array(z.string().min(1)).min(1).max(100),
  contentById: z.record(z.string(), z.string().trim().min(1)).optional(),
});

async function resolveMemoryAlerts(params: {
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
  userId: string;
  memoryIds: string[];
  now: Date;
}) {
  if (params.memoryIds.length === 0) {
    return 0;
  }

  const { data, error } = await params.supabase
    .from("ops_alerts")
    .update({
      status: "resolved",
      resolved_at: params.now.toISOString(),
    })
    .eq("user_id", params.userId)
    .eq("source", "ai_memory_review")
    .eq("entity_table", "ai_memories")
    .in("entity_id", params.memoryIds)
    .eq("status", "open")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

function demoBatch(action: AiMemoryBatchAction, memoryIds: string[]) {
  const memories = demoWorkspace.aiMemories.filter((memory) => memoryIds.includes(memory.id));

  return {
    source: "demo",
    persisted: false,
    action,
    requested: memoryIds.length,
    matched: memories.length,
    updated: action === "delete" ? 0 : memories.length,
    deleted: action === "delete" ? memories.length : 0,
    resolvedAlerts: 0,
    outcomes: memories.map((memory) => ({
      id: memory.id,
      status: action === "delete" ? "deleted" : "updated",
      reviewStatus: action === "delete" ? undefined : "healthy",
    })),
  };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  if (!supabase) {
    return Response.json(demoBatch(body.action, body.memoryIds));
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("ai_memories")
    .select("*")
    .eq("user_id", auth.user.id)
    .in("id", body.memoryIds);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const matchedRows = rows ?? [];
  const outcomes = [];

  if (body.action === "delete") {
    const ids = matchedRows
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string");
    if (ids.length > 0) {
      const { error: deleteError } = await supabase
        .from("ai_memories")
        .delete()
        .eq("user_id", auth.user.id)
        .in("id", ids);
      if (deleteError) {
        return Response.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const resolvedAlerts = await resolveMemoryAlerts({
      supabase,
      userId: auth.user.id,
      memoryIds: ids,
      now,
    });

    return Response.json({
      source: "supabase",
      persisted: true,
      action: body.action,
      requested: body.memoryIds.length,
      matched: ids.length,
      updated: 0,
      deleted: ids.length,
      resolvedAlerts,
      outcomes: ids.map((id) => ({ id, status: "deleted" })),
    });
  }

  for (const row of matchedRows) {
    const memory = mapAiMemory(row as Record<string, unknown>);
    const result = applyAiMemoryBatchAction(memory, {
      action: body.action,
      content: body.contentById?.[memory.id],
      now,
    });
    const { error: updateError } = await supabase
      .from("ai_memories")
      .update({
        content: result.memory.content,
        source: result.memory.source,
        confidence: result.memory.confidence,
        review_status: result.memory.reviewStatus ?? "healthy",
        reviewed_at: result.memory.reviewedAt,
        corrected_at: result.memory.correctedAt ?? row.corrected_at,
        embedding: result.embeddingInvalidated ? null : row.embedding,
        last_embedded_at: result.embeddingInvalidated ? null : result.memory.lastEmbeddedAt,
      })
      .eq("user_id", auth.user.id)
      .eq("id", memory.id);
    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    outcomes.push({
      id: memory.id,
      status: "updated",
      reviewStatus: result.memory.reviewStatus,
      contentChanged: result.contentChanged,
      embeddingInvalidated: result.embeddingInvalidated,
    });
  }

  const resolvedAlerts = await resolveMemoryAlerts({
    supabase,
    userId: auth.user.id,
    memoryIds: outcomes.map((item) => item.id),
    now,
  });

  return Response.json({
    source: "supabase",
    persisted: true,
    action: body.action,
    requested: body.memoryIds.length,
    matched: matchedRows.length,
    updated: outcomes.length,
    deleted: 0,
    resolvedAlerts,
    outcomes,
  });
}
