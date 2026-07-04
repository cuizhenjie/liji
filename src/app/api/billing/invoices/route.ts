import { z } from "zod";

import { createBillingInvoiceRequest } from "@/lib/liji/commercial-ops";

const requestSchema = z.object({
  planId: z.enum(["free", "pro", "executive"]).optional(),
  amountCny: z.number().positive(),
  buyerTitle: z.string().trim().min(1),
  taxId: z.string().trim().optional(),
  email: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const invoice = createBillingInvoiceRequest({
    ...body,
    provider: process.env.LIJI_INVOICE_PROVIDER,
  });

  return Response.json({
    source: "demo",
    invoice,
  });
}
