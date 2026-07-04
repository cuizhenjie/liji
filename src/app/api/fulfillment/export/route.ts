import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { env } from "@/lib/liji/env";
import { buildFulfillmentFinanceCsv } from "@/lib/liji/fulfillment-provider-sync";
import {
  mapFulfillmentOrderUpdateRow,
  reconcileFulfillmentOrders,
} from "@/lib/liji/fulfillment-reconciliation";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

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

function csvResponse(csv: string, period: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="liji-fulfillment-${period}.csv"`,
    },
  });
}

function demoCsv(period: string) {
  const summary = reconcileFulfillmentOrders([
    {
      id: "demo-export-1",
      userId: "demo-user",
      provider: "jd",
      externalOrderId: "demo-order-1",
      status: "fulfilled",
      amountCny: 1299,
      commissionCny: 38.97,
      settlementStatus: "settled",
      settlementPeriod: period,
      receivedAt: `${period}-08T10:00:00.000Z`,
      rawPayload: {},
    },
    {
      id: "demo-export-2",
      userId: "demo-user",
      provider: "meituan",
      externalOrderId: "demo-order-2",
      status: "refunded",
      amountCny: 298,
      refundedAmountCny: 298,
      settlementStatus: "reversed",
      settlementPeriod: period,
      receivedAt: `${period}-09T10:00:00.000Z`,
      rawPayload: {},
    },
  ]);

  return buildFulfillmentFinanceCsv(summary);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? currentPeriod();
  const bounds = periodBounds(period);
  const client = createSupabaseServiceClient();
  if (!client) {
    return csvResponse(demoCsv(period), period);
  }
  if (!env.CRON_SECRET) {
    return Response.json({
      error: "CRON_SECRET is required for fulfillment finance exports",
    }, { status: 401 });
  }

  const { data, error } = await client
    .from("fulfillment_order_updates")
    .select("*")
    .gte("received_at", bounds.start)
    .lt("received_at", bounds.end)
    .order("received_at", { ascending: true })
    .limit(5000);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const updates = (data ?? [])
    .map((row) => mapFulfillmentOrderUpdateRow(row as Record<string, unknown>))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return csvResponse(buildFulfillmentFinanceCsv(reconcileFulfillmentOrders(updates)), period);
}
