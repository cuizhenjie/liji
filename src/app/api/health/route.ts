import { getP0ReadinessActions, getReadinessChecks, summarizeReadiness } from "@/lib/liji/health";

export async function GET() {
  const checks = getReadinessChecks();
  const summary = summarizeReadiness(checks);
  const p0Actions = getP0ReadinessActions(checks);

  return Response.json({
    status: summary.productionReady ? "ready" : "degraded",
    summary,
    checks,
    p0Actions,
  });
}
