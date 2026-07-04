import type { Json } from "./database.types";
import type { FulfillmentProvider } from "./fulfillment";
import type { FulfillmentCallbackStatus } from "./fulfillment-callback";

export type FulfillmentSettlementStatus =
  | "pending"
  | "eligible"
  | "settled"
  | "reversed"
  | "disputed"
  | "not_applicable";

export type FulfillmentOrderUpdate = {
  id: string;
  userId?: string;
  planId?: string;
  planItemId?: string;
  provider: FulfillmentProvider;
  externalOrderId: string;
  status: FulfillmentCallbackStatus;
  amountCny?: number;
  commissionCny?: number;
  refundedAmountCny?: number;
  settlementStatus: FulfillmentSettlementStatus;
  settlementPeriod?: string;
  receivedAt: string;
  reconciledAt?: string;
  rawPayload: Record<string, unknown>;
};

export type FulfillmentOrderReconciliation = {
  provider: FulfillmentProvider;
  externalOrderId: string;
  userId?: string;
  planId?: string;
  planItemId?: string;
  latestStatus: FulfillmentCallbackStatus;
  settlementStatus: FulfillmentSettlementStatus;
  settlementPeriod?: string;
  grossAmountCny: number;
  refundedAmountCny: number;
  netAmountCny: number;
  commissionCny: number;
  updateIds: string[];
  riskFlags: string[];
  lastReceivedAt: string;
};

export type FulfillmentReconciliationSummary = {
  generatedAt: string;
  orders: number;
  paidOrders: number;
  refundedOrders: number;
  settledOrders: number;
  disputedOrders: number;
  grossAmountCny: number;
  refundedAmountCny: number;
  netAmountCny: number;
  commissionCny: number;
  providers: Array<{
    provider: FulfillmentProvider;
    orders: number;
    netAmountCny: number;
    commissionCny: number;
  }>;
  items: FulfillmentOrderReconciliation[];
};

export type FulfillmentDiscrepancyStatus = "open" | "approved" | "rejected" | "resolved";

export type FulfillmentDiscrepancyAction =
  | "approve_manual_adjustment"
  | "reject_provider_record"
  | "request_provider_evidence"
  | "mark_resolved";

export type FulfillmentReconciliationDiscrepancy = {
  id: string;
  provider: FulfillmentProvider;
  externalOrderId: string;
  severity: "info" | "warning" | "critical";
  reason: string;
  riskFlag: string;
  status: FulfillmentDiscrepancyStatus;
  recommendedAction: FulfillmentDiscrepancyAction;
  operatorNote: string;
  netAmountCny: number;
  commissionCny: number;
  createdAt: string;
  resolvedAt?: string;
};

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function jsonObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeSettlementStatus(
  value: string | undefined,
  status: FulfillmentCallbackStatus
): FulfillmentSettlementStatus {
  if (
    value === "pending" ||
    value === "eligible" ||
    value === "settled" ||
    value === "reversed" ||
    value === "disputed" ||
    value === "not_applicable"
  ) {
    return value;
  }

  if (status === "fulfilled") return "eligible";
  if (status === "refunded" || status === "cancelled") return "reversed";
  if (status === "failed") return "disputed";
  if (status === "paid") return "pending";
  return "not_applicable";
}

function provider(value: string | undefined): FulfillmentProvider | null {
  if (value === "jd" || value === "taobao" || value === "meituan" || value === "ctrip" || value === "tongcheng") {
    return value;
  }
  return null;
}

function status(value: string | undefined): FulfillmentCallbackStatus | null {
  if (
    value === "clicked" ||
    value === "reserved" ||
    value === "paid" ||
    value === "fulfilled" ||
    value === "cancelled" ||
    value === "refunded" ||
    value === "failed"
  ) {
    return value;
  }
  return null;
}

export function mapFulfillmentOrderUpdateRow(
  row: Record<string, unknown>
): FulfillmentOrderUpdate | null {
  const id = text(row, "id");
  const normalizedProvider = provider(text(row, "provider"));
  const externalOrderId = text(row, "external_order_id");
  const normalizedStatus = status(text(row, "status"));
  const receivedAt = text(row, "received_at");

  if (!id || !normalizedProvider || !externalOrderId || !normalizedStatus || !receivedAt) {
    return null;
  }

  return {
    id,
    userId: text(row, "user_id"),
    planId: text(row, "plan_id"),
    planItemId: text(row, "plan_item_id"),
    provider: normalizedProvider,
    externalOrderId,
    status: normalizedStatus,
    amountCny: numberValue(row, "amount_cny"),
    commissionCny: numberValue(row, "commission_cny"),
    refundedAmountCny: numberValue(row, "refunded_amount_cny"),
    settlementStatus: normalizeSettlementStatus(
      text(row, "settlement_status"),
      normalizedStatus
    ),
    settlementPeriod: text(row, "settlement_period"),
    receivedAt,
    reconciledAt: text(row, "reconciled_at"),
    rawPayload: jsonObject(row.raw_payload),
  };
}

function groupKey(update: FulfillmentOrderUpdate) {
  return `${update.provider}:${update.externalOrderId}`;
}

function sortByReceivedAt(updates: FulfillmentOrderUpdate[]) {
  return [...updates].sort(
    (left, right) => new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime()
  );
}

function reconcileOrder(updates: FulfillmentOrderUpdate[]): FulfillmentOrderReconciliation {
  const sorted = sortByReceivedAt(updates);
  const latest = sorted[sorted.length - 1];
  const grossAmount = [...sorted]
    .reverse()
    .find((item) =>
      (item.status === "paid" || item.status === "fulfilled") &&
      typeof item.amountCny === "number"
    )?.amountCny ?? 0;
  const explicitRefund = sorted
    .map((item) => item.refundedAmountCny)
    .filter((value): value is number => typeof value === "number");
  const statusRefund = sorted
    .filter((item) => item.status === "refunded" || item.status === "cancelled")
    .map((item) => item.refundedAmountCny ?? item.amountCny)
    .filter((value): value is number => typeof value === "number");
  const refundedAmount = Math.max(0, ...explicitRefund, ...statusRefund);
  const latestCommission = [...sorted]
    .reverse()
    .find((item) => typeof item.commissionCny === "number")?.commissionCny ?? 0;
  const settlementStatus = latest.settlementStatus;
  const netAmount = settlementStatus === "reversed"
    ? 0
    : Math.max(0, grossAmount - refundedAmount);
  const commission = settlementStatus === "settled" ? latestCommission : 0;
  const riskFlags = [
    !latest.planId ? "unmatched_plan" : "",
    settlementStatus === "disputed" ? "settlement_disputed" : "",
    refundedAmount > 0 ? "refund_or_cancelled" : "",
    latest.status === "failed" ? "provider_failed" : "",
    settlementStatus === "settled" && latestCommission <= 0 ? "missing_commission" : "",
  ].filter(Boolean);

  return {
    provider: latest.provider,
    externalOrderId: latest.externalOrderId,
    userId: latest.userId,
    planId: latest.planId,
    planItemId: latest.planItemId,
    latestStatus: latest.status,
    settlementStatus,
    settlementPeriod: latest.settlementPeriod,
    grossAmountCny: roundMoney(grossAmount),
    refundedAmountCny: roundMoney(refundedAmount),
    netAmountCny: roundMoney(netAmount),
    commissionCny: roundMoney(commission),
    updateIds: sorted.map((item) => item.id),
    riskFlags,
    lastReceivedAt: latest.receivedAt,
  };
}

export function reconcileFulfillmentOrders(
  updates: FulfillmentOrderUpdate[],
  now = new Date()
): FulfillmentReconciliationSummary {
  const groups = new Map<string, FulfillmentOrderUpdate[]>();
  for (const update of updates) {
    const key = groupKey(update);
    groups.set(key, [...(groups.get(key) ?? []), update]);
  }

  const items = Array.from(groups.values()).map(reconcileOrder);
  const providers = Array.from(new Set(items.map((item) => item.provider))).map((itemProvider) => {
    const providerItems = items.filter((item) => item.provider === itemProvider);
    return {
      provider: itemProvider,
      orders: providerItems.length,
      netAmountCny: roundMoney(providerItems.reduce((total, item) => total + item.netAmountCny, 0)),
      commissionCny: roundMoney(providerItems.reduce((total, item) => total + item.commissionCny, 0)),
    };
  });

  return {
    generatedAt: now.toISOString(),
    orders: items.length,
    paidOrders: items.filter((item) => item.latestStatus === "paid" || item.latestStatus === "fulfilled").length,
    refundedOrders: items.filter((item) => item.refundedAmountCny > 0 || item.settlementStatus === "reversed").length,
    settledOrders: items.filter((item) => item.settlementStatus === "settled").length,
    disputedOrders: items.filter((item) => item.riskFlags.length > 0).length,
    grossAmountCny: roundMoney(items.reduce((total, item) => total + item.grossAmountCny, 0)),
    refundedAmountCny: roundMoney(items.reduce((total, item) => total + item.refundedAmountCny, 0)),
    netAmountCny: roundMoney(items.reduce((total, item) => total + item.netAmountCny, 0)),
    commissionCny: roundMoney(items.reduce((total, item) => total + item.commissionCny, 0)),
    providers,
    items,
  };
}

function discrepancySeverity(flag: string): FulfillmentReconciliationDiscrepancy["severity"] {
  if (flag === "settlement_disputed" || flag === "provider_failed") return "critical";
  if (flag === "unmatched_plan" || flag === "missing_commission") return "warning";
  return "info";
}

function discrepancyReason(flag: string) {
  const reasons: Record<string, string> = {
    unmatched_plan: "订单缺少礼记 planId，无法自动归因到具体履约方案。",
    settlement_disputed: "供应商结算状态为 disputed，需要人工核对结算口径。",
    refund_or_cancelled: "订单发生退款或取消，需要确认是否冲正佣金与预算。",
    provider_failed: "供应商返回失败状态，需要确认是否为接口异常或订单关闭。",
    missing_commission: "订单已结算但佣金为 0，需要核对 CPS 归因和结算周期。",
  };
  return reasons[flag] ?? "订单存在未知对账风险，需要人工复核。";
}

function recommendedDiscrepancyAction(flag: string): FulfillmentDiscrepancyAction {
  if (flag === "provider_failed" || flag === "settlement_disputed") return "request_provider_evidence";
  if (flag === "missing_commission" || flag === "unmatched_plan") return "approve_manual_adjustment";
  if (flag === "refund_or_cancelled") return "mark_resolved";
  return "request_provider_evidence";
}

export function createFulfillmentDiscrepancies(
  summary: FulfillmentReconciliationSummary,
  now = new Date()
): FulfillmentReconciliationDiscrepancy[] {
  const createdAt = now.toISOString();
  return summary.items.flatMap((item) =>
    item.riskFlags.map((flag) => ({
      id: `${item.provider}:${item.externalOrderId}:${flag}`,
      provider: item.provider,
      externalOrderId: item.externalOrderId,
      severity: discrepancySeverity(flag),
      reason: discrepancyReason(flag),
      riskFlag: flag,
      status: "open" as const,
      recommendedAction: recommendedDiscrepancyAction(flag),
      operatorNote: "待财务或运营复核。",
      netAmountCny: item.netAmountCny,
      commissionCny: item.commissionCny,
      createdAt,
    }))
  );
}

export function applyFulfillmentDiscrepancyAction(params: {
  discrepancy: FulfillmentReconciliationDiscrepancy;
  action: FulfillmentDiscrepancyAction;
  note?: string;
  now?: Date;
}): FulfillmentReconciliationDiscrepancy {
  const resolved = params.action === "mark_resolved";
  const status: FulfillmentDiscrepancyStatus = resolved
    ? "resolved"
    : params.action === "reject_provider_record"
      ? "rejected"
      : "approved";

  return {
    ...params.discrepancy,
    status,
    recommendedAction: params.action,
    operatorNote: params.note?.trim() || params.discrepancy.operatorNote,
    resolvedAt: resolved ? (params.now ?? new Date()).toISOString() : params.discrepancy.resolvedAt,
  };
}

export function fulfillmentOrderUpdatePatch(params: {
  commissionCny?: number;
  refundedAmountCny?: number;
  settlementStatus: FulfillmentSettlementStatus;
  settlementPeriod?: string;
}) {
  return {
    commission_cny: params.commissionCny ?? null,
    refunded_amount_cny: params.refundedAmountCny ?? null,
    settlement_status: params.settlementStatus,
    settlement_period: params.settlementPeriod ?? null,
  };
}

export function reconciliationReportPayload(
  summary: FulfillmentReconciliationSummary
): Json {
  return {
    kind: "fulfillment_reconciliation",
    generatedAt: summary.generatedAt,
    orders: summary.orders,
    paidOrders: summary.paidOrders,
    refundedOrders: summary.refundedOrders,
    settledOrders: summary.settledOrders,
    disputedOrders: summary.disputedOrders,
    grossAmountCny: summary.grossAmountCny,
    refundedAmountCny: summary.refundedAmountCny,
    netAmountCny: summary.netAmountCny,
    commissionCny: summary.commissionCny,
    providers: summary.providers,
    items: summary.items,
  };
}
