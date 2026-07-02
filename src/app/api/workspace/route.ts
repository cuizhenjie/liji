import { DemoWorkspaceRepository, SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { createSupabaseServerClient, ensureUserProfile } from "@/lib/liji/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({
      workspace: await new DemoWorkspaceRepository().getWorkspace("demo-user"),
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
    workspace: await repository.getWorkspace(data.user.id),
    source: "supabase",
  });
}
