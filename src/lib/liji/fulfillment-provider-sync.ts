import crypto from "node:crypto";

import type { FulfillmentProvider } from "./fulfillment";
import type {
  FulfillmentCallbackPayload,
  FulfillmentCallbackStatus,
  FulfillmentSettlementStatus,
} from "./fulfillment-callback";
import type { FulfillmentReconciliationSummary } from "./fulfillment-reconciliation";

export type FulfillmentProviderSyncConfig = {
  provider: FulfillmentProvider;
  endpoint?: string;
  secret?: string;
};

export type NormalizedProviderOrder = FulfillmentCallbackPayload & {
  receivedAt: string;
  rawPayload: Record<string, unknown>;
};

const providers: FulfillmentProvider[] = ["jd", "taobao", "meituan", "ctrip", "tongcheng"];

const endpointKeys: Record<FulfillmentProvider, string> = {
  jd: "JD_UNION_ORDER_API_ENDPOINT",
  taobao: "TAOBAO_ORDER_API_ENDPOINT",
  meituan: "MEITUAN_ORDER_API_ENDPOINT",
  ctrip: "CTRIP_ORDER_API_ENDPOINT",
  tongcheng: "TONGCHENG_ORDER_API_ENDPOINT",
};

const secretKeys: Record<FulfillmentProvider, string> = {
  jd: "JD_UNION_ORDER_API_SECRET",
  taobao: "TAOBAO_ORDER_API_SECRET",
  meituan: "MEITUAN_ORDER_API_SECRET",
  ctrip: "CTRIP_ORDER_API_SECRET",
  tongcheng: "TONGCHENG_ORDER_API_SECRET",
};

function text(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const value = text(row, keys);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function unwrapOrders(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => Boolean(objectRecord(item)));
  }

  const record = objectRecord(payload);
  if (!record) return [];

  for (const key of ["orders", "data", "list", "items", "result"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => Boolean(objectRecord(item)));
    }

    const nested = objectRecord(value);
    if (nested) {
      const orders = unwrapOrders(nested);
      if (orders.length > 0) return orders;
    }
  }

  return [record];
}

function callbackStatus(value: string | undefined): FulfillmentCallbackStatus {
  const normalized = value?.toLowerCase();
  if (
    normalized === "clicked" ||
    normalized === "reserved" ||
    normalized === "paid" ||
    normalized === "fulfilled" ||
    normalized === "cancelled" ||
    normalized === "refunded" ||
    normalized === "failed"
  ) {
    return normalized;
  }

  if (normalized === "settled" || normalized === "completed" || normalized === "success") return "fulfilled";
  if (normalized === "pay" || normalized === "payment_success") return "paid";
  if (normalized === "refund" || normalized === "returned") return "refunded";
  if (normalized === "cancel" || normalized === "closed") return "cancelled";
  return "clicked";
}

function settlementStatus(value: string | undefined): FulfillmentSettlementStatus | undefined {
  const normalized = value?.toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "eligible" ||
    normalized === "settled" ||
    normalized === "reversed" ||
    normalized === "disputed" ||
    normalized === "not_applicable"
  ) {
    return normalized;
  }
  return undefined;
}

export function resolveFulfillmentProviderSyncConfigs(
  env: Record<string, string | undefined> = process.env
) {
  return providers.map((provider) => ({
    provider,
    endpoint: env[endpointKeys[provider]],
    secret: env[secretKeys[provider]],
  })) satisfies FulfillmentProviderSyncConfig[];
}

export function configuredFulfillmentProviderSyncConfigs(
  env: Record<string, string | undefined> = process.env
) {
  return resolveFulfillmentProviderSyncConfigs(env).filter((config) => Boolean(config.endpoint));
}

export function signFulfillmentProviderSyncRequest(params: {
  provider: FulfillmentProvider;
  timestamp: string;
  secret: string;
  body?: string;
}) {
  return crypto
    .createHmac("sha256", params.secret)
    .update(`${params.provider}.${params.timestamp}.${params.body ?? ""}`)
    .digest("hex");
}

export function normalizeFulfillmentProviderOrders(params: {
  provider: FulfillmentProvider;
  payload: unknown;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  return unwrapOrders(params.payload)
    .map((order): NormalizedProviderOrder | null => {
      const externalOrderId = text(order, [
        "externalOrderId",
        "external_order_id",
        "orderId",
        "order_id",
        "tradeId",
        "trade_id",
      ]);
      if (!externalOrderId) return null;

      return {
        provider: params.provider,
        externalOrderId,
        status: callbackStatus(text(order, ["status", "orderStatus", "order_status", "state"])),
        planId: text(order, ["planId", "plan_id", "lijiPlanId", "liji_plan_id"]),
        planItemId: text(order, ["planItemId", "plan_item_id", "lijiPlanItemId", "liji_plan_item_id"]),
        amountCny: numberValue(order, ["amountCny", "amount_cny", "paidFee", "paid_fee", "payAmount", "pay_amount"]),
        commissionCny: numberValue(order, ["commissionCny", "commission_cny", "commission", "pubShareFee", "pub_share_fee"]),
        refundedAmountCny: numberValue(order, ["refundedAmountCny", "refunded_amount_cny", "refundFee", "refund_fee"]),
        settlementStatus: settlementStatus(text(order, ["settlementStatus", "settlement_status"])),
        settlementPeriod: text(order, ["settlementPeriod", "settlement_period", "settleMonth", "settle_month"]),
        occurredAt: text(order, ["occurredAt", "occurred_at", "paidAt", "paid_at", "createdAt", "created_at"]),
        receivedAt: now.toISOString(),
        rawPayload: order,
      };
    })
    .filter((item): item is NormalizedProviderOrder => Boolean(item));
}

function csvCell(value: unknown) {
  const textValue = value === undefined || value === null ? "" : String(value);
  return `"${textValue.replace(/"/g, '""')}"`;
}

export function buildFulfillmentFinanceCsv(summary: FulfillmentReconciliationSummary) {
  const rows = [
    [
      "provider",
      "external_order_id",
      "latest_status",
      "settlement_status",
      "settlement_period",
      "gross_amount_cny",
      "refunded_amount_cny",
      "net_amount_cny",
      "commission_cny",
      "risk_flags",
      "last_received_at",
    ],
    ...summary.items.map((item) => [
      item.provider,
      item.externalOrderId,
      item.latestStatus,
      item.settlementStatus,
      item.settlementPeriod ?? "",
      item.grossAmountCny,
      item.refundedAmountCny,
      item.netAmountCny,
      item.commissionCny,
      item.riskFlags.join("|"),
      item.lastReceivedAt,
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
