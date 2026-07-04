import { buildLevelTwoRecommendationCards } from "@/lib/liji/level2-recommendations";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const horizonDays = Number(url.searchParams.get("horizonDays") ?? 15);
  const now = url.searchParams.get("now")
    ? new Date(url.searchParams.get("now")!)
    : new Date();
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const repository = new SupabaseWorkspaceRepository(supabase);
      const workspace = await repository.getWorkspace(data.user.id);

      return Response.json({
        source: "supabase",
        cards: buildLevelTwoRecommendationCards({
          data: workspace,
          now,
          horizonDays: Number.isFinite(horizonDays) ? horizonDays : 15,
        }),
      });
    }
  }

  return Response.json({
    source: "demo",
    cards: buildLevelTwoRecommendationCards({
      data: demoWorkspace,
      now,
      horizonDays: Number.isFinite(horizonDays) ? horizonDays : 15,
    }),
  });
}
