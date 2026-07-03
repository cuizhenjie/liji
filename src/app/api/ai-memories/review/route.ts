import { z } from "zod";

import { reviewAiMemory } from "@/lib/liji/memory-review";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import { mapAiMemory } from "@/lib/liji/supabase-mappers";

const requestSchema = z.object({
  memoryId: z.string().min(1),
  content: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  if (!supabase) {
    const memory = demoWorkspace.aiMemories.find((item) => item.id === body.memoryId);
    if (!memory) {
      return Response.json({ error: "memory not found" }, { status: 404 });
    }

    return Response.json({
      source: "demo",
      persisted: false,
      resolvedAlerts: 0,
      memory: reviewAiMemory(memory, { content: body.content, now }),
    });
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("ai_memories")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("id", body.memoryId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return Response.json({ error: "memory not found" }, { status: 404 });
  }

  const currentMemory = mapAiMemory(row);
  const reviewedMemory = reviewAiMemory(currentMemory, { content: body.content, now });
  const contentChanged = reviewedMemory.content !== currentMemory.content;
  const { error: updateError } = await supabase
    .from("ai_memories")
    .update({
      content: reviewedMemory.content,
      source: reviewedMemory.source,
      confidence: reviewedMemory.confidence,
      review_status: reviewedMemory.reviewStatus,
      reviewed_at: reviewedMemory.reviewedAt,
      corrected_at: reviewedMemory.correctedAt,
      embedding: contentChanged ? null : row.embedding,
      last_embedded_at: contentChanged ? null : reviewedMemory.lastEmbeddedAt,
    })
    .eq("user_id", auth.user.id)
    .eq("id", reviewedMemory.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const { data: alerts, error: alertError } = await supabase
    .from("ops_alerts")
    .update({
      status: "resolved",
      resolved_at: now.toISOString(),
    })
    .eq("user_id", auth.user.id)
    .eq("source", "ai_memory_review")
    .eq("entity_table", "ai_memories")
    .eq("entity_id", reviewedMemory.id)
    .eq("status", "open")
    .select("id");

  if (alertError) {
    return Response.json({ error: alertError.message }, { status: 500 });
  }

  return Response.json({
    source: "supabase",
    persisted: true,
    resolvedAlerts: alerts?.length ?? 0,
    memory: reviewedMemory,
  });
}
