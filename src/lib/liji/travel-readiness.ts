import type { FulfillmentPlan, PlanItem } from "./types";

export type TravelReadinessBrief = {
  title: string;
  readinessScore: number;
  routeSummary: string;
  budgetSummary: string;
  proximitySummary: string;
  checklist: string[];
  nextActions: string[];
};

function itemByCategory(plan: FulfillmentPlan, category: PlanItem["category"]) {
  return plan.items.find((item) => item.category === category);
}

function hasLink(item: PlanItem | undefined) {
  return Boolean(item?.url);
}

function hotelNearClient(hotel: PlanItem | undefined) {
  return Boolean(hotel && /3\s*公里|近客户|客户地址|拜访地址/.test(`${hotel.title} ${hotel.rationale}`));
}

function readinessScore(params: {
  transport?: PlanItem;
  hotel?: PlanItem;
  buffer?: PlanItem;
  warnings: string[];
}) {
  let score = 100;
  if (!hasLink(params.transport)) score -= 18;
  if (!hasLink(params.hotel)) score -= 18;
  if (!params.buffer || params.buffer.amountCny <= 0) score -= 20;
  if (params.warnings.length > 0) score -= Math.min(24, params.warnings.length * 8);
  if (!hotelNearClient(params.hotel)) score -= 10;
  return Math.max(0, score);
}

export function buildTravelReadinessBrief(plan: FulfillmentPlan): TravelReadinessBrief | null {
  if (plan.scenario !== "travel") return null;

  const transport = itemByCategory(plan, "transport");
  const hotel = itemByCategory(plan, "hotel");
  const buffer = itemByCategory(plan, "buffer");
  const committed = (transport?.amountCny ?? 0) + (hotel?.amountCny ?? 0);
  const bufferCny = buffer?.amountCny ?? 0;
  const budgetRatio = Math.round((committed / Math.max(1, plan.budgetCny)) * 100);
  const score = readinessScore({ transport, hotel, buffer, warnings: plan.warnings });
  const checklist = [
    transport ? `确认交通：${transport.title}` : "补齐交通方案",
    hotel ? `确认酒店：${hotel.title}` : "补齐住宿方案",
    hotelNearClient(hotel) ? "酒店到客户地址控制在 3 公里内" : "复核酒店到客户地址的通勤时间",
    bufferCny > 0 ? `预留餐饮与打车弹性 ${bufferCny} 元` : "补充餐饮与打车弹性预算",
    "同步订单号、发票抬头和客户地址",
  ];
  const nextActions = plan.warnings.length > 0
    ? plan.warnings.slice(0, 3)
    : [
        "确认交通和酒店外部订单",
        "出发前同步客户地址到地图",
        "完成后回填发票和差旅流水",
      ];

  return {
    title: "行前秘书包",
    readinessScore: score,
    routeSummary: `${transport?.title ?? "交通待确认"} · ${hotel?.title ?? "酒店待确认"}`,
    budgetSummary: `交通住宿占用 ${budgetRatio}% · 弹性池 ${bufferCny} 元`,
    proximitySummary: hotelNearClient(hotel) ? "酒店靠近客户地址，迟到风险较低。" : "酒店距离客户地址待复核，需要预留通勤缓冲。",
    checklist,
    nextActions,
  };
}
