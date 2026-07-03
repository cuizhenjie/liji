import { z } from "zod";

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  createOpenAIEmbedding,
  embeddingToVectorLiteral,
} from "@/lib/liji/embeddings";
import { buildMemoryEmbeddingInput } from "@/lib/liji/memory-recall";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import { mapAiMemory, mapContact, mapPrivacy } from "@/lib/liji/supabase-mappers";

const requestSchema = z.object({
  memoryIds: z.array(z.string()).max(50).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return Response.json({
      source: "demo",
      provider: "disabled",
      embedded: 0,
      skipped: demoWorkspace.aiMemories.length,
      message: "未配置 Supabase，demo 模式不写入 AI 记忆 embedding。",
    });
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const { data: privacyRow, error: privacyError } = await supabase
    .from("privacy_settings")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (privacyError) {
    return Response.json({ error: privacyError.message }, { status: 500 });
  }

  const privacy = mapPrivacy(privacyRow);
  if (!privacy.cloudModelEnabled) {
    return Response.json({
      source: "supabase",
      provider: "disabled",
      embedded: 0,
      skipped: 0,
      message: "用户未授权云端模型调用，未生成 embedding。",
    });
  }

  let query = supabase
    .from("ai_memories")
    .select("*, contacts(*)")
    .eq("user_id", auth.user.id)
    .limit(body.limit);

  if (body.memoryIds?.length) {
    query = query.in("id", body.memoryIds);
  } else {
    query = query.is("embedding", null);
  }

  const { data: rows, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const outcomes = [];
  for (const row of rows ?? []) {
    const record = row as Record<string, unknown>;
    const memory = mapAiMemory(record);
    const contactRow = record.contacts;
    const contact =
      typeof contactRow === "object" && contactRow !== null
        ? mapContact(contactRow as Record<string, unknown>)
        : undefined;
    const embedding = await createOpenAIEmbedding({
      text: buildMemoryEmbeddingInput(memory, contact),
    });

    if (
      embedding.status === "ready" &&
      embedding.embedding &&
      embedding.embedding.length === DEFAULT_EMBEDDING_DIMENSIONS
    ) {
      const { error: updateError } = await supabase
        .from("ai_memories")
        .update({ embedding: embeddingToVectorLiteral(embedding.embedding) })
        .eq("user_id", auth.user.id)
        .eq("id", memory.id);

      outcomes.push({
        id: memory.id,
        status: updateError ? "failed" : "embedded",
        message: updateError?.message ?? embedding.message,
        dimensions: embedding.dimensions,
        tokenUsage: embedding.tokenUsage,
      });
    } else {
      outcomes.push({
        id: memory.id,
        status: embedding.status === "ready" ? "failed" : embedding.status,
        message:
          embedding.status === "ready"
            ? `embedding 维度 ${embedding.dimensions} 与 ai_memories.embedding vector(${DEFAULT_EMBEDDING_DIMENSIONS}) 不匹配。`
            : embedding.message,
      });
    }
  }

  return Response.json({
    source: "supabase",
    provider: "openai",
    embedded: outcomes.filter((item) => item.status === "embedded").length,
    skipped: Math.max(0, body.limit - outcomes.length),
    outcomes,
  });
}
