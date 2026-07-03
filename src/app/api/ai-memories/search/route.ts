import { z } from "zod";

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  createOpenAIEmbedding,
  embeddingToVectorLiteral,
} from "@/lib/liji/embeddings";
import { recallAiMemories, recallAiMemoriesHybrid } from "@/lib/liji/memory-recall";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";
import { mapAiMemory, mapPrivacy } from "@/lib/liji/supabase-mappers";
import type { MemoryRecallResult } from "@/lib/liji/memory-recall";

const requestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: privacyRow, error: privacyError } = await supabase
        .from("privacy_settings")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (privacyError) {
        return Response.json({ error: privacyError.message }, { status: 500 });
      }

      const privacy = mapPrivacy(privacyRow);
      const embedding = privacy.cloudModelEnabled
        ? await createOpenAIEmbedding({ text: body.query })
        : null;

      if (
        embedding?.status === "ready" &&
        embedding.embedding &&
        embedding.embedding.length === DEFAULT_EMBEDDING_DIMENSIONS
      ) {
        const { data: rows, error: rpcError } = await supabase.rpc("match_ai_memories", {
          query_embedding: embeddingToVectorLiteral(embedding.embedding),
          match_count: body.limit ?? 5,
        });

        if (!rpcError && Array.isArray(rows) && rows.length > 0) {
          const results = rows.map((row) => {
            const record = row as Record<string, unknown>;
            return {
              memory: mapAiMemory(record),
              score: Number(record.similarity ?? 0),
              reasons: [`pgvector 相似度 ${Number(record.similarity ?? 0).toFixed(3)}`],
              stale: false,
              provider: "embedding",
            } satisfies MemoryRecallResult;
          });

          return Response.json({
            source: "supabase",
            recallProvider: "pgvector",
            embedding: {
              provider: embedding.provider,
              model: embedding.model,
              dimensions: embedding.dimensions,
              tokenUsage: embedding.tokenUsage,
            },
            results,
          });
        }
      }

      const workspace = await new SupabaseWorkspaceRepository(supabase).getWorkspace(data.user.id);

      return Response.json({
        source: "supabase",
        recallProvider: embedding?.status === "ready" ? "embedding-fallback" : "lexical",
        embedding: embedding
          ? {
              provider: embedding.provider,
              status: embedding.status,
              model: embedding.model,
              dimensions: embedding.dimensions,
              message: embedding.message,
            }
          : null,
        results: recallAiMemoriesHybrid({
          query: body.query,
          queryEmbedding: embedding?.embedding,
          limit: body.limit,
          memories: workspace.aiMemories,
          contacts: workspace.contacts,
        }),
      });
    }
  }

  return Response.json({
    source: "demo",
    recallProvider: "lexical",
    results: recallAiMemories({
      query: body.query,
      limit: body.limit,
      memories: demoWorkspace.aiMemories,
      contacts: demoWorkspace.contacts,
    }),
  });
}
