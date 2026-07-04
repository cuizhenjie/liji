import { z } from "zod";

import {
  applyFulfillmentDiscrepancyAction,
  createFulfillmentDiscrepancies,
  reconcileFulfillmentOrders,
  type FulfillmentDiscrepancyAction,
} from "@/lib/liji/fulfillment-reconciliation";

const requestSchema = z.object({
  discrepancyId: z.string().min(1),
  action: z.enum([
    "approve_manual_adjustment",
    "reject_provider_record",
    "request_provider_evidence",
    "mark_resolved",
  ]),
  note: z.string().optional(),
});

function demoDiscrepancies() {
  const summary = reconcileFulfillmentOrders([
    {
      id: "demo-disputed",
      userId: "demo-user",
      provider: "jd",
      externalOrderId: "jd-risk-1",
      status: "failed",
      amountCny: 1299,
      commissionCny: 0,
      settlementStatus: "disputed",
      settlementPeriod: "2026-07",
      receivedAt: "2026-07-04T08:00:00.000Z",
      rawPayload: {},
    },
    {
      id: "demo-refund",
      userId: "demo-user",
      planId: "p-demo",
      provider: "meituan",
      externalOrderId: "mt-refund-1",
      status: "refunded",
      amountCny: 480,
      refundedAmountCny: 480,
      settlementStatus: "reversed",
      settlementPeriod: "2026-07",
      receivedAt: "2026-07-04T09:00:00.000Z",
      rawPayload: {},
    },
  ], new Date("2026-07-04T10:00:00.000Z"));

  return createFulfillmentDiscrepancies(summary, new Date("2026-07-04T10:00:00.000Z"));
}

export async function GET() {
  return Response.json({
    source: "demo",
    discrepancies: demoDiscrepancies(),
  });
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const discrepancies = demoDiscrepancies();
  const discrepancy = discrepancies.find((item) => item.id === body.discrepancyId) ?? discrepancies[0];
  const updated = applyFulfillmentDiscrepancyAction({
    discrepancy,
    action: body.action as FulfillmentDiscrepancyAction,
    note: body.note,
    now: new Date("2026-07-04T10:30:00.000Z"),
  });

  return Response.json({
    source: "demo",
    discrepancy: updated,
  });
}
