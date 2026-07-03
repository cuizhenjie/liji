import { z } from "zod";

import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { env } from "@/lib/liji/env";
import {
  verifyFulfillmentCallbackSignature,
} from "@/lib/liji/fulfillment-callback";
import {
  fulfillmentOrderUpdatePatch,
  normalizeSettlementStatus,
} from "@/lib/liji/fulfillment-reconciliation";
import { createUuid } from "@/lib/liji/ids";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

const callbackSchema = z.object({
  provider: z.enum(["jd", "taobao", "meituan", "ctrip", "tongcheng"]),
  externalOrderId: z.string().min(1),
  status: z.enum([
    "clicked",
    "reserved",
    "paid",
    "fulfilled",
    "cancelled",
    "refunded",
    "failed",
  ]),
  planId: z.string().optional(),
  planItemId: z.string().optional(),
  amountCny: z.number().nonnegative().optional(),
  commissionCny: z.number().nonnegative().optional(),
  refundedAmountCny: z.number().nonnegative().optional(),
  settlementStatus: z.enum([
    "pending",
    "eligible",
    "settled",
    "reversed",
    "disputed",
    "not_applicable",
  ]).optional(),
  settlementPeriod: z.string().optional(),
  occurredAt: z.string().optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-liji-signature");

  if (
    !verifyFulfillmentCallbackSignature({
      rawBody,
      secret: env.FULFILLMENT_CALLBACK_SECRET,
      signature,
    })
  ) {
    return Response.json({ error: "invalid callback signature" }, { status: 401 });
  }

  const body = callbackSchema.parse(JSON.parse(rawBody));
  const callback = {
    id: createUuid(),
    ...body,
    receivedAt: new Date().toISOString(),
  };
  const supabase = createSupabaseServiceClient();
  let persisted = false;
  let userId: string | null = null;

  if (supabase) {
    if (callback.planId) {
      const { data } = await supabase
        .from("plans")
        .select("user_id")
        .eq("id", callback.planId)
        .maybeSingle();
      userId = typeof data?.user_id === "string" ? data.user_id : null;
    }

    const { error } = await supabase.from("fulfillment_order_updates").insert({
      id: callback.id,
      user_id: userId,
      plan_id: callback.planId,
      plan_item_id: callback.planItemId,
      provider: callback.provider,
      external_order_id: callback.externalOrderId,
      status: callback.status,
      amount_cny: callback.amountCny,
      ...fulfillmentOrderUpdatePatch({
        commissionCny: callback.commissionCny,
        refundedAmountCny: callback.refundedAmountCny,
        settlementStatus: normalizeSettlementStatus(callback.settlementStatus, callback.status),
        settlementPeriod: callback.settlementPeriod,
      }),
      raw_payload: body,
      received_at: callback.receivedAt,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    persisted = true;
  }

  const audit = createAuditLogEntry({
    userId: userId ?? undefined,
    action: "fulfill",
    entityTable: "fulfillment_order_updates",
    entityId: callback.id,
    metadata: {
      provider: callback.provider,
      status: callback.status,
      externalOrderId: callback.externalOrderId,
      settlementStatus: normalizeSettlementStatus(callback.settlementStatus, callback.status),
    },
  });
  const auditPersistence = await persistAuditLog(audit, supabase);

  return Response.json({
    callback,
    persisted,
    audit,
    auditPersistence,
    source: supabase ? "supabase" : "demo",
  });
}
