import { z } from "zod";

import { buildEntitlementReport } from "@/lib/liji/entitlements";
import { demoWorkspace } from "@/lib/liji/sample-data";

const requestSchema = z.object({
  planId: z.enum(["free", "pro", "executive"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const planId = url.searchParams.get("planId") ?? process.env.LIJI_BILLING_PLAN;
  const parsed = requestSchema.safeParse({ planId });

  return Response.json(buildEntitlementReport({
    data: demoWorkspace,
    planId: parsed.success ? parsed.data.planId : process.env.LIJI_BILLING_PLAN,
  }));
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));

  return Response.json(buildEntitlementReport({
    data: demoWorkspace,
    planId: body.planId ?? process.env.LIJI_BILLING_PLAN,
  }));
}
