import { buildPlanFulfillmentLinks } from "./fulfillment";
import { buildFulfillmentConciergePack } from "./fulfillment-concierge";
import { buildTravelReadinessBrief } from "./travel-readiness";
import type { Contact, FulfillmentPlan } from "./types";

export type FulfillmentAgendaStatus = "blocked" | "action" | "ready";

export type FulfillmentAgendaAction =
  | {
      kind: "confirm_plan";
      planId: string;
    }
  | {
      kind: "bookmark_plan";
      planId: string;
    };

export type FulfillmentAgendaItem = {
  id: string;
  planId: string;
  title: string;
  scenario: FulfillmentPlan["scenario"];
  status: FulfillmentAgendaStatus;
  assetState: string;
  nextStep: string;
  evidence: string;
  cta: string;
  action: FulfillmentAgendaAction;
};

function contactForPlan(contacts: Contact[], plan: FulfillmentPlan) {
  return contacts.find((contact) => contact.id === plan.contactId);
}

function isPlanSettled(plan: FulfillmentPlan) {
  return plan.status === "confirmed" || plan.status === "bookmarked";
}

function statusWeight(status: FulfillmentAgendaStatus) {
  if (status === "blocked") return 0;
  if (status === "action") return 1;
  return 2;
}

function buildItem(plan: FulfillmentPlan, contacts: Contact[]): FulfillmentAgendaItem {
  const contact = contactForPlan(contacts, plan);
  const links = buildPlanFulfillmentLinks(plan);
  const conciergePack = buildFulfillmentConciergePack(plan, contact);
  const travelBrief = buildTravelReadinessBrief(plan);
  const settled = isPlanSettled(plan);
  const hasExternalLinks = links.length > 0;
  const hasRisk = plan.riskLevel === "high" || conciergePack.riskNotes.length > 0 || (travelBrief?.readinessScore ?? 100) < 60;

  if (!settled) {
    return {
      id: `fulfillment:${plan.id}`,
      planId: plan.id,
      title: plan.title,
      scenario: plan.scenario,
      status: hasRisk ? "blocked" : "action",
      assetState: hasRisk ? "高风险待复核" : "待确认履约资产",
      nextStep: plan.scenario === "travel"
        ? "确认交通、住宿、预算和行前清单后再进入外部平台。"
        : "确认礼物、蛋糕、餐饮和交付口径后沉淀履约资产。",
      evidence: `${plan.items.length} 项 · ${hasExternalLinks ? `${links.length} 个外部跳转` : "缺少外部跳转"} · ${plan.status}`,
      cta: "确认方案",
      action: {
        kind: "confirm_plan",
        planId: plan.id,
      },
    };
  }

  return {
    id: `fulfillment:${plan.id}`,
    planId: plan.id,
    title: plan.title,
    scenario: plan.scenario,
    status: "ready",
    assetState: "履约资产已沉淀",
    nextStep: hasExternalLinks ? "可进入外部平台执行，并在完成后回填账单或订单结果。" : "继续补充外部跳转或手动履约结果。",
    evidence: `${plan.items.length} 项 · ${hasExternalLinks ? `${links.length} 个外部跳转` : "无外部跳转"} · ${plan.status}`,
    cta: plan.status === "bookmarked" ? "保持收藏" : "归档方案",
    action: {
      kind: "bookmark_plan",
      planId: plan.id,
    },
  };
}

export function buildFulfillmentAgenda(params: {
  contacts: Contact[];
  plans: FulfillmentPlan[];
  limit?: number;
}): FulfillmentAgendaItem[] {
  return params.plans
    .map((plan) => buildItem(plan, params.contacts))
    .sort((left, right) => {
      const byStatus = statusWeight(left.status) - statusWeight(right.status);
      if (byStatus !== 0) return byStatus;
      return left.title.localeCompare(right.title, "zh-CN");
    })
    .slice(0, params.limit ?? 6);
}
