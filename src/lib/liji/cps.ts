import type { FulfillmentProvider } from "./fulfillment";

export type CpsSettlementMode = "cps" | "search_link";

export type CpsAttribution = {
  provider: FulfillmentProvider;
  cpsReady: boolean;
  commissionRate: number;
  estimatedCommissionCny: number;
  settlementMode: CpsSettlementMode;
  trackingParams: Record<string, string>;
};

export type CpsAttributionSummary = {
  totalTrackedAmountCny: number;
  totalEstimatedCommissionCny: number;
  cpsReadyCount: number;
  searchLinkCount: number;
  providers: Array<{
    provider: FulfillmentProvider;
    amountCny: number;
    estimatedCommissionCny: number;
    settlementMode: CpsSettlementMode;
  }>;
};

const providerConfig: Record<
  FulfillmentProvider,
  {
    commissionRate: number;
    envKey?: string;
    trackingParam?: string;
  }
> = {
  jd: { commissionRate: 0.03, envKey: "JD_UNION_ID", trackingParam: "jd_union_id" },
  taobao: { commissionRate: 0.04, envKey: "TAOBAO_PID", trackingParam: "taobao_pid" },
  meituan: { commissionRate: 0.025, envKey: "MEITUAN_CPS_ID", trackingParam: "meituan_cps_id" },
  ctrip: { commissionRate: 0.02, envKey: "CTRIP_AFFILIATE_ID", trackingParam: "ctrip_affiliate_id" },
  tongcheng: { commissionRate: 0.02, envKey: "TONGCHENG_AFFILIATE_ID", trackingParam: "tongcheng_affiliate_id" },
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function buildCpsAttribution(input: {
  provider: FulfillmentProvider;
  amountCny: number;
  planId: string;
  scenario: string;
  userId: string;
  env?: Record<string, string | undefined>;
}): CpsAttribution {
  const env = input.env ?? process.env;
  const config = providerConfig[input.provider];
  const providerId = config.envKey ? env[config.envKey] : undefined;
  const cpsReady = hasValue(providerId);
  const settlementMode: CpsSettlementMode = cpsReady ? "cps" : "search_link";
  const estimatedCommissionCny = cpsReady
    ? roundMoney(input.amountCny * config.commissionRate)
    : 0;
  const trackingParams: Record<string, string> = {
    utm_source: "liji",
    utm_medium: "fulfillment",
    utm_campaign: input.scenario,
    liji_plan_id: input.planId,
    liji_user: input.userId,
    cps_provider: input.provider,
    cps_ready: String(cpsReady),
    liji_settlement_mode: settlementMode,
  };

  if (config.trackingParam && providerId) {
    trackingParams[config.trackingParam] = providerId;
  }

  return {
    provider: input.provider,
    cpsReady,
    commissionRate: config.commissionRate,
    estimatedCommissionCny,
    settlementMode,
    trackingParams,
  };
}

export function summarizeCpsAttribution(
  links: Array<{
    provider: FulfillmentProvider;
    amountCny: number;
    estimatedCommissionCny: number;
    settlementMode: CpsSettlementMode;
  }>
): CpsAttributionSummary {
  return {
    totalTrackedAmountCny: roundMoney(
      links.reduce((total, link) => total + link.amountCny, 0)
    ),
    totalEstimatedCommissionCny: roundMoney(
      links.reduce((total, link) => total + link.estimatedCommissionCny, 0)
    ),
    cpsReadyCount: links.filter((link) => link.settlementMode === "cps").length,
    searchLinkCount: links.filter((link) => link.settlementMode === "search_link").length,
    providers: links.map((link) => ({
      provider: link.provider,
      amountCny: link.amountCny,
      estimatedCommissionCny: link.estimatedCommissionCny,
      settlementMode: link.settlementMode,
    })),
  };
}
