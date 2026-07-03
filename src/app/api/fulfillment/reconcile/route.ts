import { z } from "zod";

import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import {
  mapFulfillmentOrderUpdateRow,
  reconcileFulfillmentOrders,
  reconciliationReportPayload,
} from "@/lib/liji/fulfillment-reconciliation";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(1000).default(500),
});

function currentPeriod(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

function periodBounds(period: string) {
  const start = new Date(`${period}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function demoSummary(period: string) {
  return reconcileFulfillmentOrders([
    {
      id: "demo-paid",
      userId: "demo-user",
      planId: "p-demo",
      planItemId: "pi-demo",
      provider: "jd",
      externalOrderId: "demo-order-1",
      status: "fulfilled",
      amountCny: 1200,
      commissionCny: 36,
      settlementStatus: "settled",
      settlementPeriod: period,
      receivedAt: `${period}-05T10:00:00.000Z`,
      rawPayload: {},
    },
    {
      id: "demo-refund",
      userId: "demo-user",
      planId: "p-demo",
      planItemId: "pi-demo-2",
      provider: "meituan",
      externalOrderId: "demo-order-2",
      status: "refunded",
      amountCny: 480,
      refundedAmountCny: 480,
      settlementStatus: "reversed",
      settlementPeriod: period,
      receivedAt: `${period}-08T10:00:00.000Z`,
      rawPayload: {},
    },
  ]);
}

async function runSupabaseReconciliation(params: {
  period: string;
  limit: number;
}) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const bounds = periodBounds(params.period);
  const { data, error } = await client
    .from("fulfillment_order_updates")
    .select("*")
    .not("user_id", "is", null)
    .gte("received_at", bounds.start)
    .lt("received_at", bounds.end)
    .order("received_at", { ascending: true })
    .limit(params.limit);
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const updates = rows
    .map(mapFulfillmentOrderUpdateRow)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const byUser = new Map<string, typeof updates>();
  for (const update of updates) {
    if (!update.userId) {
      continue;
    }
    byUser.set(update.userId, [...(byUser.get(update.userId) ?? []), update]);
  }

  const now = new Date();
  const reports = [];
  for (const [userId, userUpdates] of byUser) {
    const summary = reconcileFulfillmentOrders(userUpdates, now);
    const { error: reportError } = await client
      .from("fulfillment_reconciliation_reports")
      .upsert({
        user_id: userId,
        period: params.period,
        summary: reconciliationReportPayload(summary),
        generated_at: summary.generatedAt,
      }, { onConflict: "user_id,period" });
    if (reportError) {
      throw new Error(reportError.message);
    }

    reports.push({ userId, summary });
  }

  if (updates.length > 0) {
    const { error: updateError } = await client
      .from("fulfillment_order_updates")
      .update({ reconciled_at: now.toISOString() })
      .in("id", updates.map((item) => item.id));
    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return {
    period: params.period,
    scanned: rows.length,
    reconciled: updates.length,
    reports,
  };
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const period = body.period ?? currentPeriod();
  const result = await runSupabaseReconciliation({ period, limit: body.limit });
  if (result) {
    return Response.json({ source: "supabase", ...result });
  }

  return Response.json({
    source: "demo",
    period,
    scanned: 2,
    reconciled: 2,
    reports: [{ userId: "demo-user", summary: demoSummary(period) }],
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? currentPeriod();
  const limit = Number(url.searchParams.get("limit") ?? 500);
  const body = requestSchema.parse({
    period,
    limit: Number.isFinite(limit) ? limit : 500,
  });
  const result = await runSupabaseReconciliation({
    period: body.period ?? currentPeriod(),
    limit: body.limit,
  });
  if (result) {
    return Response.json({ source: "supabase", ...result });
  }

  return Response.json({
    source: "demo",
    period: body.period ?? currentPeriod(),
    scanned: 2,
    reconciled: 2,
    reports: [{ userId: "demo-user", summary: demoSummary(body.period ?? currentPeriod()) }],
  });
}
