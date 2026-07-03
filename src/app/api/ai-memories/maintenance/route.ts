import { z } from "zod";

import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import type { Json } from "@/lib/liji/database.types";
import { embeddingToVectorLiteral } from "@/lib/liji/embeddings";
import { maintainWorkspaceAiMemories } from "@/lib/liji/memory-maintenance";
import { createAiMemoryReviewAlert, opsAlertRow } from "@/lib/liji/ops-alerts";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  limitUsers: z.number().int().min(1).max(100).default(20),
  embedMissing: z.boolean().default(true),
});

async function hasOpenAlert(params: {
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  source: string;
  entityTable: string;
  entityId: string;
}) {
  const { data, error } = await params.client
    .from("ops_alerts")
    .select("id")
    .eq("source", params.source)
    .eq("entity_table", params.entityTable)
    .eq("entity_id", params.entityId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

async function runSupabaseMemoryMaintenance(params: {
  limitUsers: number;
  embedMissing: boolean;
}) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const { data: profiles, error } = await client
    .from("profiles")
    .select("id")
    .limit(params.limitUsers);
  if (error) {
    throw new Error(error.message);
  }

  const repository = new SupabaseWorkspaceRepository(client);
  const now = new Date();
  const processed = [];

  for (const profile of profiles ?? []) {
    const userId = typeof profile.id === "string" ? profile.id : "";
    if (!userId) {
      continue;
    }

    const workspace = await repository.getWorkspace(userId);
    const maintained = await maintainWorkspaceAiMemories({
      workspace,
      embedMissing: params.embedMissing,
      now,
    });

    for (const memory of maintained.workspace.aiMemories) {
      const { error: updateError } = await client
        .from("ai_memories")
        .update({
          confidence: memory.confidence,
          embedding: memory.embedding ? embeddingToVectorLiteral(memory.embedding) : undefined,
          review_status: memory.reviewStatus ?? "healthy",
          reviewed_at: memory.reviewedAt,
          last_embedded_at: memory.lastEmbeddedAt,
        })
        .eq("user_id", userId)
        .eq("id", memory.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    for (const review of maintained.reviews) {
      if (review.status === "healthy") {
        continue;
      }

      const exists = await hasOpenAlert({
        client,
        source: "ai_memory_review",
        entityTable: "ai_memories",
        entityId: review.id,
      });
      if (exists) {
        continue;
      }

      const alert = createAiMemoryReviewAlert({
        userId,
        memoryId: review.id,
        status: review.status,
        reason: review.reason,
        now,
      });
      const { error: alertError } = await client.from("ops_alerts").insert(opsAlertRow(alert));
      if (alertError) {
        throw new Error(alertError.message);
      }
    }

    processed.push({
      userId,
      reviews: maintained.reviews,
      embeddings: maintained.embeddings,
    });
  }

  return processed;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const processed = await runSupabaseMemoryMaintenance(body);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  const maintained = await maintainWorkspaceAiMemories({
    workspace: demoWorkspace,
    embedMissing: false,
    now: new Date(),
  });
  return Response.json({
    source: "demo",
    processed: [{
      userId: "demo-user",
      reviews: maintained.reviews,
      embeddings: [] as Json[],
    }],
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const processed = await runSupabaseMemoryMaintenance({
    limitUsers: 20,
    embedMissing: true,
  });
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  const maintained = await maintainWorkspaceAiMemories({
    workspace: demoWorkspace,
    embedMissing: false,
    now: new Date(),
  });
  return Response.json({
    source: "demo",
    processed: [{
      userId: "demo-user",
      reviews: maintained.reviews,
      embeddings: [] as Json[],
    }],
  });
}
