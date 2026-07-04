import { z } from "zod";

import { buildWorkspaceBillingUsageLedger } from "@/lib/liji/commercial-ops";
import { demoWorkspace } from "@/lib/liji/sample-data";

const requestSchema = z.object({
  planId: z.enum(["free", "pro", "executive"]).optional(),
});

function ledgerForPlan(planId?: string) {
  return buildWorkspaceBillingUsageLedger({
    data: demoWorkspace,
    planId: planId ?? process.env.LIJI_BILLING_PLAN,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = requestSchema.safeParse({
    planId: url.searchParams.get("planId") ?? process.env.LIJI_BILLING_PLAN,
  });
  const result = ledgerForPlan(parsed.success ? parsed.data.planId : undefined);

  return Response.json({
    source: "demo",
    ...result,
  });
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const result = ledgerForPlan(body.planId);

  return Response.json({
    source: "demo",
    ...result,
  });
}
