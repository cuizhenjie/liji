import { getReadinessChecks, summarizeReadiness } from "@/lib/liji/health";

export async function GET() {
  const checks = getReadinessChecks();
  const summary = summarizeReadiness(checks);

  return Response.json({
    status: summary.productionReady ? "ready" : "degraded",
    summary,
    checks,
  });
}
