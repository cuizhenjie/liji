import type {
  EntitlementLimitKey,
  EntitlementReport,
  MembershipPlanId,
} from "./entitlements";
import { buildEntitlementReport, membershipPlans } from "./entitlements";
import type {
  FulfillmentReconciliationDiscrepancy,
  FulfillmentReconciliationSummary,
} from "./fulfillment-reconciliation";
import type { FulfillmentProvider } from "./fulfillment";
import type { WorkspaceData } from "./types";

export type BillingUsageLedgerStatus = "included" | "billable" | "blocked" | "void";

export type BillingUsageLedgerEntry = {
  id: string;
  planId: MembershipPlanId;
  key: EntitlementLimitKey;
  label: string;
  quantity: number;
  includedQuantity: number;
  overageQuantity: number;
  unitCny: number;
  amountCny: number;
  status: BillingUsageLedgerStatus;
  source: "entitlement_meter";
  referenceTable?: string;
  referenceId?: string;
  occurredAt: string;
  note: string;
};

export type BillingUsageLedgerReport = {
  generatedAt: string;
  planId: MembershipPlanId;
  entries: BillingUsageLedgerEntry[];
  totalUsage: number;
  totalBillableCny: number;
  billableEntries: number;
  blockedEntries: number;
};

export type BillingCheckoutIntent = {
  id: string;
  planId: MembershipPlanId;
  provider: "manual" | "stripe" | "wechat_pay" | "alipay";
  status: "not_required" | "ready" | "manual_review_required";
  amountCny: number;
  checkoutUrl?: string;
  expiresAt?: string;
  nextSteps: string[];
};

export type BillingInvoiceRequest = {
  id: string;
  planId?: MembershipPlanId;
  amountCny: number;
  buyerTitle: string;
  taxId?: string;
  email?: string;
  status: "draft" | "queued" | "issued" | "rejected" | "cancelled";
  provider: "manual" | "fapiao_api";
  requestedAt: string;
  warnings: string[];
};

export type CpsFinanceApprovalStatus =
  | "pending_finance"
  | "approved"
  | "held"
  | "rejected"
  | "paid";

export type CpsFinanceApprovalAction =
  | "approve_payout"
  | "hold_for_evidence"
  | "reject_payout"
  | "mark_paid";

export type CpsFinanceApprovalItem = {
  id: string;
  provider: FulfillmentProvider;
  externalOrderId: string;
  settlementPeriod?: string;
  netAmountCny: number;
  commissionCny: number;
  riskFlags: string[];
  requiredEvidence: string[];
  status: CpsFinanceApprovalStatus;
  recommendedAction: CpsFinanceApprovalAction;
  financeNote: string;
  createdAt: string;
  decidedAt?: string;
};

export type CpsPayoutBatch = {
  generatedAt: string;
  payableItems: number;
  heldItems: number;
  totalCommissionCny: number;
  providers: Array<{
    provider: FulfillmentProvider;
    items: number;
    commissionCny: number;
  }>;
};

export type OpsAlertLifecycleStatus = "open" | "acknowledged" | "resolved";
export type OpsAlertLifecycleAction = "acknowledge" | "resolve" | "reopen";

export type OpsAlertLifecycleItem = {
  id: string;
  severity: "info" | "warning" | "critical";
  source: string;
  title: string;
  message: string;
  status: OpsAlertLifecycleStatus;
  ownerRole: "ops" | "finance" | "engineering" | "growth";
  nextAction: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
};

const overageUnitPrices: Record<EntitlementLimitKey, number> = {
  contacts: 0,
  aiMemories: 0.02,
  monthlySms: 0.08,
  monthlyVoiceCalls: 0.45,
  emergencyEscalations: 1.5,
  fulfillmentReconciliations: 2,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function stableId(parts: Array<string | number | undefined>) {
  return parts
    .filter((part) => part !== undefined && part !== "")
    .map((part) => String(part).replace(/[^a-zA-Z0-9_-]+/gu, "-"))
    .join(":");
}

function planId(value: string | undefined): MembershipPlanId {
  return membershipPlans.some((plan) => plan.id === value)
    ? value as MembershipPlanId
    : "free";
}

function ledgerStatus(params: {
  planId: MembershipPlanId;
  overageQuantity: number;
}): BillingUsageLedgerStatus {
  if (params.overageQuantity <= 0) return "included";
  return params.planId === "executive" ? "blocked" : "billable";
}

function optionalUrl(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export function buildBillingUsageLedger(params: {
  report: EntitlementReport;
  now?: Date;
  referenceTable?: string;
  referenceId?: string;
}): BillingUsageLedgerReport {
  const generatedAt = (params.now ?? new Date()).toISOString();
  const entries = params.report.usage.map((item) => {
    const overageQuantity = Math.max(0, item.used - item.limit);
    const includedQuantity = Math.min(item.used, item.limit);
    const unitCny = overageUnitPrices[item.key];
    const status = ledgerStatus({
      planId: params.report.plan.id,
      overageQuantity,
    });

    return {
      id: stableId(["ledger", params.report.plan.id, item.key, generatedAt.slice(0, 10)]),
      planId: params.report.plan.id,
      key: item.key,
      label: item.label,
      quantity: item.used,
      includedQuantity,
      overageQuantity,
      unitCny,
      amountCny: status === "billable" ? roundMoney(overageQuantity * unitCny) : 0,
      status,
      source: "entitlement_meter" as const,
      referenceTable: params.referenceTable,
      referenceId: params.referenceId,
      occurredAt: generatedAt,
      note: overageQuantity > 0
        ? `${item.label} 超出 ${overageQuantity} 次，进入${status === "blocked" ? "人工放行" : "超额计费"}。`
        : `${item.label} 在套餐额度内。`,
    };
  });

  return {
    generatedAt,
    planId: params.report.plan.id,
    entries,
    totalUsage: entries.reduce((total, item) => total + item.quantity, 0),
    totalBillableCny: roundMoney(entries.reduce((total, item) => total + item.amountCny, 0)),
    billableEntries: entries.filter((item) => item.status === "billable").length,
    blockedEntries: entries.filter((item) => item.status === "blocked").length,
  };
}

export function buildWorkspaceBillingUsageLedger(params: {
  data: WorkspaceData;
  planId?: string;
  now?: Date;
}) {
  const report = buildEntitlementReport({
    data: params.data,
    planId: params.planId,
  });

  return {
    report,
    ledger: buildBillingUsageLedger({
      report,
      now: params.now,
      referenceTable: "workspace",
      referenceId: "current",
    }),
  };
}

export function createBillingCheckoutIntent(params: {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
  provider?: string;
  checkoutBaseUrl?: string;
  now?: Date;
}): BillingCheckoutIntent {
  const selectedPlanId = planId(params.planId);
  const plan = membershipPlans.find((item) => item.id === selectedPlanId) ?? membershipPlans[0];
  const provider = params.provider === "stripe" ||
    params.provider === "wechat_pay" ||
    params.provider === "alipay"
    ? params.provider
    : "manual";
  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const url = optionalUrl(params.checkoutBaseUrl);
  if (url) {
    url.searchParams.set("plan", selectedPlanId);
    if (params.successUrl) url.searchParams.set("success_url", params.successUrl);
    if (params.cancelUrl) url.searchParams.set("cancel_url", params.cancelUrl);
  }

  if (plan.monthlyCny === 0) {
    return {
      id: stableId(["checkout", selectedPlanId, now.toISOString()]),
      planId: selectedPlanId,
      provider,
      status: "not_required",
      amountCny: 0,
      nextSteps: ["体验版无需支付，直接启用额度计量。"],
    };
  }

  return {
    id: stableId(["checkout", selectedPlanId, now.toISOString()]),
    planId: selectedPlanId,
    provider,
    status: url ? "ready" : "manual_review_required",
    amountCny: plan.monthlyCny,
    checkoutUrl: url?.toString(),
    expiresAt,
    nextSteps: url
      ? ["跳转支付页完成订阅。", "支付回调后写入 billing_subscriptions。"]
      : ["未配置支付 checkout 地址，先由财务人工开通。", "开通后补写订阅和权益扣减流水。"],
  };
}

export function createBillingInvoiceRequest(params: {
  planId?: string;
  amountCny: number;
  buyerTitle: string;
  taxId?: string;
  email?: string;
  provider?: string;
  now?: Date;
}): BillingInvoiceRequest {
  const requestedAt = (params.now ?? new Date()).toISOString();
  const warnings = [
    params.amountCny <= 0 ? "开票金额必须大于 0。" : "",
    params.buyerTitle.trim().length < 2 ? "抬头过短，需要财务复核。" : "",
    params.amountCny >= 500 && !params.taxId?.trim() ? "500 元以上建议补充税号。" : "",
    params.email && !params.email.includes("@") ? "邮箱格式可能不正确。" : "",
  ].filter(Boolean);

  return {
    id: stableId(["invoice", params.planId ?? "usage", requestedAt]),
    planId: params.planId ? planId(params.planId) : undefined,
    amountCny: roundMoney(params.amountCny),
    buyerTitle: params.buyerTitle.trim(),
    taxId: params.taxId?.trim() || undefined,
    email: params.email?.trim() || undefined,
    status: warnings.some((item) => item.includes("必须")) ? "draft" : "queued",
    provider: params.provider === "fapiao_api" ? "fapiao_api" : "manual",
    requestedAt,
    warnings,
  };
}

function evidenceForRiskFlag(flag: string) {
  const evidence: Record<string, string> = {
    unmatched_plan: "补充 planId/planItemId 与用户确认记录。",
    settlement_disputed: "供应商结算明细、回调原文和争议说明。",
    refund_or_cancelled: "退款凭证、用户退款原因和佣金冲正记录。",
    provider_failed: "供应商失败响应、重试记录和人工客服工单。",
    missing_commission: "CPS 归因参数、下单链路日志和结算周期说明。",
  };
  return evidence[flag] ?? "供应商原始订单证据。";
}

function recommendedFinanceAction(riskFlags: string[], commissionCny: number): CpsFinanceApprovalAction {
  if (riskFlags.includes("settlement_disputed") || riskFlags.includes("provider_failed")) {
    return "hold_for_evidence";
  }
  if (riskFlags.includes("missing_commission") || riskFlags.includes("unmatched_plan")) {
    return "hold_for_evidence";
  }
  if (commissionCny <= 0) {
    return "reject_payout";
  }
  return "approve_payout";
}

export function createCpsFinanceApprovalQueue(params: {
  summary: FulfillmentReconciliationSummary;
  discrepancies?: FulfillmentReconciliationDiscrepancy[];
  now?: Date;
}): CpsFinanceApprovalItem[] {
  const createdAt = (params.now ?? new Date()).toISOString();
  const discrepancyFlags = new Map<string, string[]>();
  for (const discrepancy of params.discrepancies ?? []) {
    const key = `${discrepancy.provider}:${discrepancy.externalOrderId}`;
    discrepancyFlags.set(key, [...(discrepancyFlags.get(key) ?? []), discrepancy.riskFlag]);
  }

  return params.summary.items
    .filter((item) => item.commissionCny > 0 || item.riskFlags.length > 0)
    .map((item) => {
      const key = `${item.provider}:${item.externalOrderId}`;
      const riskFlags = Array.from(new Set([...item.riskFlags, ...(discrepancyFlags.get(key) ?? [])]));
      const recommendedAction = recommendedFinanceAction(riskFlags, item.commissionCny);
      const requiredEvidence = riskFlags.length > 0
        ? riskFlags.map(evidenceForRiskFlag)
        : ["订单结算明细与 CPS 佣金确认。"];

      return {
        id: stableId(["cps", item.provider, item.externalOrderId, item.settlementPeriod ?? "current"]),
        provider: item.provider,
        externalOrderId: item.externalOrderId,
        settlementPeriod: item.settlementPeriod,
        netAmountCny: item.netAmountCny,
        commissionCny: item.commissionCny,
        riskFlags,
        requiredEvidence,
        status: recommendedAction === "hold_for_evidence" ? "held" as const : "pending_finance" as const,
        recommendedAction,
        financeNote: riskFlags.length > 0 ? "存在对账风险，付款前需补证据。" : "可进入财务审批。",
        createdAt,
      };
    });
}

export function applyCpsFinanceApprovalAction(params: {
  item: CpsFinanceApprovalItem;
  action: CpsFinanceApprovalAction;
  note?: string;
  now?: Date;
}): CpsFinanceApprovalItem {
  const decidedAt = (params.now ?? new Date()).toISOString();
  const status: CpsFinanceApprovalStatus =
    params.action === "approve_payout"
      ? "approved"
      : params.action === "mark_paid"
        ? "paid"
        : params.action === "reject_payout"
          ? "rejected"
          : "held";

  return {
    ...params.item,
    status,
    recommendedAction: params.action,
    financeNote: params.note?.trim() || params.item.financeNote,
    decidedAt,
  };
}

export function buildCpsPayoutBatch(items: CpsFinanceApprovalItem[], now = new Date()): CpsPayoutBatch {
  const payable = items.filter((item) => item.status === "approved" || item.status === "paid");
  const providers = Array.from(new Set(payable.map((item) => item.provider))).map((provider) => {
    const providerItems = payable.filter((item) => item.provider === provider);
    return {
      provider,
      items: providerItems.length,
      commissionCny: roundMoney(providerItems.reduce((total, item) => total + item.commissionCny, 0)),
    };
  });

  return {
    generatedAt: now.toISOString(),
    payableItems: payable.length,
    heldItems: items.filter((item) => item.status === "held").length,
    totalCommissionCny: roundMoney(payable.reduce((total, item) => total + item.commissionCny, 0)),
    providers,
  };
}

function alertOwnerRole(source: string): OpsAlertLifecycleItem["ownerRole"] {
  if (source.includes("entitlement")) return "growth";
  if (source.includes("billing") || source.includes("cps") || source.includes("fulfillment")) return "finance";
  if (source.includes("production") || source.includes("smoke") || source.includes("capture")) return "engineering";
  return "ops";
}

function alertNextAction(source: string, severity: OpsAlertLifecycleItem["severity"]) {
  if (source.includes("billing")) return "核对订阅状态、发票和扣减流水。";
  if (source.includes("cps") || source.includes("fulfillment")) return "补齐供应商证据后由财务审批。";
  if (source.includes("production")) return "补齐上线配置并重新跑生产检查。";
  if (severity === "critical") return "15 分钟内确认负责人并记录处置结果。";
  return "确认是否需要升级为正式工单。";
}

export function buildOpsAlertLifecycleQueue(params: {
  alerts: Array<{
    id: string;
    severity: OpsAlertLifecycleItem["severity"];
    source: string;
    title: string;
    message: string;
    createdAt: string;
    status?: OpsAlertLifecycleStatus;
  }>;
}): OpsAlertLifecycleItem[] {
  return params.alerts.map((alert) => ({
    ...alert,
    status: alert.status ?? "open",
    ownerRole: alertOwnerRole(alert.source),
    nextAction: alertNextAction(alert.source, alert.severity),
  }));
}

export function transitionOpsAlertLifecycle(params: {
  alert: OpsAlertLifecycleItem;
  action: OpsAlertLifecycleAction;
  note?: string;
  now?: Date;
}): OpsAlertLifecycleItem {
  const now = (params.now ?? new Date()).toISOString();
  if (params.action === "reopen") {
    return {
      ...params.alert,
      status: "open",
      acknowledgedAt: undefined,
      resolvedAt: undefined,
      resolutionNote: params.note?.trim() || "重新打开。",
    };
  }

  if (params.action === "acknowledge") {
    return {
      ...params.alert,
      status: "acknowledged",
      acknowledgedAt: now,
      resolutionNote: params.note?.trim() || params.alert.resolutionNote,
    };
  }

  return {
    ...params.alert,
    status: "resolved",
    acknowledgedAt: params.alert.acknowledgedAt ?? now,
    resolvedAt: now,
    resolutionNote: params.note?.trim() || "已处置。",
  };
}
