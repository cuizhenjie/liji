import { z } from "zod";

import {
  applyCpsFinanceApprovalAction,
  buildCpsPayoutBatch,
  createCpsFinanceApprovalQueue,
  type CpsFinanceApprovalAction,
} from "@/lib/liji/commercial-ops";
import {
  createFulfillmentDiscrepancies,
  reconcileFulfillmentOrders,
} from "@/lib/liji/fulfillment-reconciliation";

const requestSchema = z.object({
  approvalId: z.string().min(1),
  action: z.enum(["approve_payout", "hold_for_evidence", "reject_payout", "mark_paid"]),
  note: z.string().trim().optional(),
});

function demoFinanceQueue() {
  const now = new Date("2026-07-04T10:00:00.000Z");
  const summary = reconcileFulfillmentOrders([
    {
      id: "demo-cps-paid",
      userId: "demo-user",
      planId: "p-demo",
      planItemId: "pi-demo",
      provider: "jd",
      externalOrderId: "jd-paid-1",
      status: "fulfilled",
      amountCny: 1200,
      commissionCny: 36,
      settlementStatus: "settled",
      settlementPeriod: "2026-07",
      receivedAt: "2026-07-04T08:00:00.000Z",
      rawPayload: {},
    },
    {
      id: "demo-cps-missing",
      userId: "demo-user",
      provider: "taobao",
      externalOrderId: "tb-missing-1",
      status: "fulfilled",
      amountCny: 880,
      commissionCny: 0,
      settlementStatus: "settled",
      settlementPeriod: "2026-07",
      receivedAt: "2026-07-04T09:00:00.000Z",
      rawPayload: {},
    },
  ], now);
  const discrepancies = createFulfillmentDiscrepancies(summary, now);
  const approvals = createCpsFinanceApprovalQueue({
    summary,
    discrepancies,
    now,
  });

  return {
    summary,
    discrepancies,
    approvals,
    payout: buildCpsPayoutBatch(approvals, now),
  };
}

export async function GET() {
  return Response.json({
    source: "demo",
    ...demoFinanceQueue(),
  });
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const queue = demoFinanceQueue();
  const item = queue.approvals.find((approval) => approval.id === body.approvalId) ?? queue.approvals[0];
  const approval = applyCpsFinanceApprovalAction({
    item,
    action: body.action as CpsFinanceApprovalAction,
    note: body.note,
    now: new Date("2026-07-04T10:30:00.000Z"),
  });
  const approvals = queue.approvals.map((candidate) =>
    candidate.id === approval.id ? approval : candidate
  );

  return Response.json({
    source: "demo",
    approval,
    payout: buildCpsPayoutBatch(approvals, new Date("2026-07-04T10:30:00.000Z")),
  });
}
