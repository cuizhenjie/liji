import { z } from "zod";

import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { env } from "@/lib/liji/env";
import { configuredFulfillmentProviderSyncConfigs, normalizeFulfillmentProviderOrders, signFulfillmentProviderSyncRequest } from "@/lib/liji/fulfillment-provider-sync";
import { fulfillmentOrderUpdatePatch, normalizeSettlementStatus } from "@/lib/liji/fulfillment-reconciliation";
import { createUuid } from "@/lib/liji/ids";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import type { Json } from "@/lib/liji/database.types";
import type { FulfillmentProvider } from "@/lib/liji/fulfillment";

const requestSchema = z.object({
  providers: z.array(z.enum(["jd", "taobao", "meituan", "ctrip", "tongcheng"])).optional(),
  since: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(200),
});

function demoProviderPayload(period = "2026-07") {
  return [
    {
      order_id: "jd-demo-1",
      status: "settled",
      liji_plan_id: "p-demo",
      amount_cny: 1299,
      commission_cny: 38.97,
      settlement_status: "settled",
      settlement_period: period,
    },
    {
      order_id: "meituan-demo-1",
      status: "refund",
      amount_cny: 298,
      refund_fee: 298,
      settlement_status: "reversed",
      settlement_period: period,
    },
  ];
}

async function fetchProviderOrders(params: {
  provider: FulfillmentProvider;
  endpoint: string;
  secret?: string;
  since?: string;
  limit: number;
}) {
  const url = new URL(params.endpoint);
  if (params.since) url.searchParams.set("since", params.since);
  url.searchParams.set("limit", String(params.limit));
  const timestamp = new Date().toISOString();
  const headers: Record<string, string> = {
    "x-liji-provider": params.provider,
    "x-liji-timestamp": timestamp,
  };
  if (params.secret) {
    headers["x-liji-signature"] = signFulfillmentProviderSyncRequest({
      provider: params.provider,
      timestamp,
      secret: params.secret,
    });
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${params.provider} order sync failed: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

async function resolvePlanUserId(client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, planId?: string) {
  if (!planId) return null;

  const { data, error } = await client
    .from("plans")
    .select("user_id")
    .eq("id", planId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return typeof data?.user_id === "string" ? data.user_id : null;
}

async function runSupabaseProviderSync(body: z.infer<typeof requestSchema>) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const configs = configuredFulfillmentProviderSyncConfigs()
    .filter((config) => !body.providers || body.providers.includes(config.provider));
  const imported = [];
  const errors = [];

  for (const config of configs) {
    if (!config.endpoint) continue;

    try {
      const payload = await fetchProviderOrders({
        provider: config.provider,
        endpoint: config.endpoint,
        secret: config.secret,
        since: body.since,
        limit: body.limit,
      });
      const orders = normalizeFulfillmentProviderOrders({
        provider: config.provider,
        payload,
        now: new Date(),
      });

      for (const order of orders) {
        const userId = await resolvePlanUserId(client, order.planId);
        const id = createUuid();
        const { error } = await client.from("fulfillment_order_updates").insert({
          id,
          user_id: userId,
          plan_id: order.planId,
          plan_item_id: order.planItemId,
          provider: order.provider,
          external_order_id: order.externalOrderId,
          status: order.status,
          amount_cny: order.amountCny,
          ...fulfillmentOrderUpdatePatch({
            commissionCny: order.commissionCny,
            refundedAmountCny: order.refundedAmountCny,
            settlementStatus: normalizeSettlementStatus(order.settlementStatus, order.status),
            settlementPeriod: order.settlementPeriod,
          }),
          raw_payload: order.rawPayload as Json,
          received_at: order.receivedAt,
        });
        if (error) {
          throw new Error(error.message);
        }

        imported.push({
          id,
          provider: order.provider,
          externalOrderId: order.externalOrderId,
          userId,
        });
      }
    } catch (error) {
      errors.push({
        provider: config.provider,
        message: error instanceof Error ? error.message : "unknown provider sync error",
      });
    }
  }

  return {
    configuredProviders: configs.map((config) => config.provider),
    imported,
    errors,
  };
}

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = request.method === "GET"
    ? requestSchema.parse({
        providers: new URL(request.url).searchParams.get("providers")?.split(",").filter(Boolean),
        since: new URL(request.url).searchParams.get("since") ?? undefined,
        limit: Number(new URL(request.url).searchParams.get("limit") ?? 200),
      })
    : requestSchema.parse(await request.json().catch(() => ({})));
  if (!env.CRON_SECRET && createSupabaseServiceClient()) {
    return Response.json({
      error: "CRON_SECRET is required for fulfillment provider sync",
    }, { status: 401 });
  }

  const result = await runSupabaseProviderSync(body);
  if (result) {
    return Response.json({ source: "supabase", ...result });
  }

  const demoOrders = [
    ...normalizeFulfillmentProviderOrders({ provider: "jd", payload: demoProviderPayload() }),
    ...normalizeFulfillmentProviderOrders({ provider: "meituan", payload: demoProviderPayload() }),
  ];

  return Response.json({
    source: "demo",
    configuredProviders: [],
    imported: demoOrders.map((order) => ({
      provider: order.provider,
      externalOrderId: order.externalOrderId,
      settlementStatus: order.settlementStatus,
    })),
    errors: [],
    message: "未配置 Supabase service role 或平台订单 API，返回归一化 demo 拉单结果。",
  });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
