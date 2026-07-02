import type { FulfillmentPlan, PlanItem } from "./types";

export type FulfillmentProvider = "jd" | "taobao" | "meituan" | "ctrip" | "tongcheng";

export type TrackedFulfillmentLink = {
  provider: FulfillmentProvider;
  label: string;
  url: string;
  cpsReady: boolean;
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

  url.searchParams.set("utm_source", "liji");
  url.searchParams.set("utm_medium", "fulfillment");
  url.searchParams.set("utm_campaign", plan.scenario);
  url.searchParams.set("liji_plan_id", plan.id);
  url.searchParams.set("liji_user", userId);

  return {
    provider,
    label: item.title,
    url: url.toString(),
    cpsReady: provider !== "jd" || Boolean(process.env.JD_UNION_ID),
  };
}

export function buildPlanFulfillmentLinks(plan: FulfillmentPlan, userId?: string) {
  return plan.items
    .filter((item) => item.url || item.provider !== "内部")
    .map((item) => buildTrackedFulfillmentLink(item, plan, userId));
}
