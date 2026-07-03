import {
  buildCpsAttribution,
  summarizeCpsAttribution,
  type CpsSettlementMode,
} from "./cps";
import type { FulfillmentPlan, PlanItem } from "./types";

export type FulfillmentProvider = "jd" | "taobao" | "meituan" | "ctrip" | "tongcheng";

export type TrackedFulfillmentLink = {
  provider: FulfillmentProvider;
  label: string;
  url: string;
  cpsReady: boolean;
  amountCny: number;
  commissionRate: number;
  estimatedCommissionCny: number;
  settlementMode: CpsSettlementMode;
  trackingParams: Record<string, string>;
};

const providerBaseUrl: Record<FulfillmentProvider, string> = {
  jd: "https://search.jd.com/Search",
  taobao: "https://s.taobao.com/search",
  meituan: "https://www.meituan.com/s/",
  ctrip: "https://www.ctrip.com/",
  tongcheng: "https://www.ly.com/",
};

function providerForPlanItem(item: PlanItem): FulfillmentProvider {
  if (item.provider === "京东") return "jd";
  if (item.provider === "淘宝") return "taobao";
  if (item.provider === "美团") return "meituan";
  if (item.provider === "携程") return "ctrip";
  if (item.provider === "同程") return "tongcheng";
  return "jd";
}

export function buildTrackedFulfillmentLink(
  item: PlanItem,
  plan: Pick<FulfillmentPlan, "id" | "scenario">,
  userId = "demo-user"
): TrackedFulfillmentLink {
  const provider = providerForPlanItem(item);
  const baseUrl = item.url ?? providerBaseUrl[provider];
  const url = new URL(baseUrl);
  const attribution = buildCpsAttribution({
    provider,
    amountCny: item.amountCny,
    planId: plan.id,
    scenario: plan.scenario,
    userId,
  });

  Object.entries(attribution.trackingParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    provider,
    label: item.title,
    url: url.toString(),
    cpsReady: attribution.cpsReady,
    amountCny: item.amountCny,
    commissionRate: attribution.commissionRate,
    estimatedCommissionCny: attribution.estimatedCommissionCny,
    settlementMode: attribution.settlementMode,
    trackingParams: attribution.trackingParams,
  };
}

export function buildPlanFulfillmentLinks(plan: FulfillmentPlan, userId?: string) {
  return plan.items
    .filter((item) => item.url || item.provider !== "内部")
    .map((item) => buildTrackedFulfillmentLink(item, plan, userId));
}

export function summarizePlanCps(plan: FulfillmentPlan, userId?: string) {
  return summarizeCpsAttribution(buildPlanFulfillmentLinks(plan, userId));
}
