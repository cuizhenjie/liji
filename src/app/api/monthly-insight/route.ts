import { demoEvents, demoTransactions, demoWorkspace } from "@/lib/liji/sample-data";
import { generateMonthlyInsight, previousMonthPeriod } from "@/lib/liji/insights";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";

export async function GET(request?: Request) {
  const period = request
    ? new URL(request.url).searchParams.get("period") ?? previousMonthPeriod()
    : previousMonthPeriod();
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const repository = new SupabaseWorkspaceRepository(supabase);
      const workspace = await repository.getWorkspace(data.user.id);

      return Response.json({
        insight: generateMonthlyInsight({
          period,
          transactions: workspace.transactions,
          recurringBills: workspace.recurringBills,
          nextMonthEvents: workspace.events,
        }),
        source: "supabase",
      });
    }
  }

  return Response.json({
    insight: generateMonthlyInsight({
      period,
      transactions: demoTransactions,
      recurringBills: demoWorkspace.recurringBills,
      nextMonthEvents: demoEvents,
    }),
    source: "demo",
  });
}
