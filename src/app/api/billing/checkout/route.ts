import { z } from "zod";

import { createBillingCheckoutIntent } from "@/lib/liji/commercial-ops";

const requestSchema = z.object({
  planId: z.enum(["free", "pro", "executive"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const checkout = createBillingCheckoutIntent({
    planId: body.planId,
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
    provider: process.env.LIJI_BILLING_PROVIDER,
    checkoutBaseUrl: process.env.LIJI_BILLING_CHECKOUT_URL,
  });

  return Response.json({
    source: "demo",
    checkout,
  });
}
