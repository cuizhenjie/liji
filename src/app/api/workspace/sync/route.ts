import { z } from "zod";

import { DemoWorkspaceRepository, SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { createSupabaseServerClient, ensureUserProfile } from "@/lib/liji/supabase-server";
import type { WorkspaceData } from "@/lib/liji/types";

const workspaceShapeSchema = z.object({
  contacts: z.array(z.unknown()),
  events: z.array(z.unknown()),
  budgets: z.array(z.unknown()),
  plans: z.array(z.unknown()),
  captures: z.array(z.unknown()),
  transactions: z.array(z.unknown()),
  recurringBills: z.array(z.unknown()),
  notificationLogs: z.array(z.unknown()),
  aiMemories: z.array(z.unknown()),
  privacy: z.object({}).passthrough(),
  insight: z.object({}).passthrough(),
});

const requestSchema = z.object({
  workspace: workspaceShapeSchema,
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());
  const workspace = body.workspace as WorkspaceData;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      sync: await new DemoWorkspaceRepository().syncWorkspace("demo-user", workspace),
      source: "demo",
    });
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  await ensureUserProfile(supabase, data.user);
  const repository = new SupabaseWorkspaceRepository(supabase);

  return Response.json({
    sync: await repository.syncWorkspace(data.user.id, workspace),
    source: "supabase",
  });
}
