import { countInclusiveDays } from "./calendar";
import { getComplianceWarnings } from "./compliance";
import { createUuid } from "./ids";
import { buildTravelQuotePlan, type TravelQuoteCandidate } from "./travel-options";
import type { CalendarEvent, Contact, FulfillmentPlan, PlanItem } from "./types";

const catalog = {
  legoPink: {
    title: "粉色乐高创意礼盒",
    amountCny: 1299,
    provider: "京东" as const,
    url: "https://search.jd.com/Search?keyword=%E7%B2%89%E8%89%B2%20%E4%B9%90%E9%AB%98%20%E7%A4%BC%E7%89%A9",
  },
  strawberryCake: {
    title: "草莓生日蛋糕",
    amountCny: 298,
    provider: "美团" as const,
    url: "https://www.meituan.com/s/%E8%8D%89%E8%8E%93%E7%94%9F%E6%97%A5%E8%9B%8B%E7%B3%95/",
  },
  familyDining: {
    title: "亲子餐厅预订",
    amountCny: 403,
    provider: "美团" as const,
    url: "https://www.meituan.com/s/%E4%BA%B2%E5%AD%90%E9%A4%90%E5%8E%85/",
  },
};

function roundCny(value: number) {
  return Math.round(value);
}

export function splitFestivalBudget(totalCny: number) {
  return {
    gift: roundCny(totalCny * 0.6),
    cake: roundCny(totalCny * 0.15),
    dining: totalCny - roundCny(totalCny * 0.6) - roundCny(totalCny * 0.15),
  };
}

export function generateFestivalPlan(
  event: CalendarEvent,
  contact: Contact | undefined,
  totalCny = event.budgetCny ?? 2000,
  now = new Date("2026-07-01T09:00:00+08:00")
): FulfillmentPlan {
  const split = splitFestivalBudget(totalCny);
  const likesLego = contact?.preferences.some((preference) =>
    /乐高|lego/i.test(preference.label)
  );
  const preferredGift = likesLego ? catalog.legoPink : {
    title: "实用型精选礼物",
    amountCny: split.gift,
    provider: "京东" as const,
    url: "https://search.jd.com/Search?keyword=%E7%94%9F%E6%97%A5%20%E7%A4%BC%E7%89%A9%20%E5%AE%9E%E7%94%A8",
  };

  let giftAmount = Math.min(preferredGift.amountCny, Math.max(split.gift, 200));
  const warnings = [];
  if (preferredGift.amountCny > split.gift) {
    warnings.push("礼物偏好价格高于 60% 预算，已压缩餐饮弹性预算。");
    giftAmount = preferredGift.amountCny;
  }

  const complianceWarnings = getComplianceWarnings(contact, giftAmount);
  warnings.push(...complianceWarnings);
  if (complianceWarnings.length > 0 && contact?.compliance.giftLimitCny) {
    giftAmount = contact.compliance.giftLimitCny;
  }

  const remaining = Math.max(0, totalCny - giftAmount);
  const cakeAmount = Math.min(catalog.strawberryCake.amountCny, Math.max(99, roundCny(remaining * 0.35)));
  const diningAmount = Math.max(0, totalCny - giftAmount - cakeAmount);

  const items: PlanItem[] = [
    {
      id: createUuid(),
      title: preferredGift.title,
      category: "gift",
      amountCny: giftAmount,
      rationale: likesLego ? "匹配画像偏好：粉色、乐高、可包装。" : "匹配实用型礼品偏好。",
      provider: preferredGift.provider,
      url: preferredGift.url,
    },
    {
      id: createUuid(),
      title: catalog.strawberryCake.title,
      category: "cake",
      amountCny: cakeAmount,
      rationale: "匹配草莓口味，支持附近门店跳转预订。",
      provider: catalog.strawberryCake.provider,
      url: catalog.strawberryCake.url,
    },
    {
      id: createUuid(),
      title: catalog.familyDining.title,
      category: "dining",
      amountCny: diningAmount,
      rationale: "保留餐饮/娱乐弹性，避免整体超预算。",
      provider: catalog.familyDining.provider,
      url: catalog.familyDining.url,
    },
  ];

  return {
    id: createUuid(),
    scenario: "festival",
    title: `${event.title}履约方案`,
    contactId: contact?.id,
    eventId: event.id,
    budgetCny: totalCny,
    status: "pending_confirmation",
    riskLevel: complianceWarnings.length > 0 ? "high" : warnings.length > 0 ? "medium" : "low",
    warnings,
    items,
    createdAt: now.toISOString(),
  };
}

export function generateTravelPlan(input: {
  title: string;
  startDate: string;
  endDate?: string;
  destination: string;
  dailyLimitCny?: number;
  transportCandidates?: TravelQuoteCandidate[];
  hotelCandidates?: TravelQuoteCandidate[];
  now?: Date;
}): FulfillmentPlan {
  const days = countInclusiveDays(input.startDate, input.endDate);
  const dailyLimit = input.dailyLimitCny ?? 2400;
  const totalCny = days * dailyLimit;
  const quotePlan = buildTravelQuotePlan({
    destination: input.destination,
    startDate: input.startDate,
    endDate: input.endDate,
    dailyLimitCny: input.dailyLimitCny,
    transportCandidates: input.transportCandidates,
    hotelCandidates: input.hotelCandidates,
  });
  const diningAndTaxi = Math.max(0, totalCny - quotePlan.selected.transport.amountCny - quotePlan.selected.hotel.amountCny);
  const warnings = [...quotePlan.warnings, ...quotePlan.alternatives.map((item) => `替代方案：${item}`)];

  return {
    id: createUuid(),
    scenario: "travel",
    title: input.title,
    budgetCny: totalCny,
    status: "pending_confirmation",
    riskLevel: warnings.length > 0 ? "medium" : "low",
    warnings,
    createdAt: (input.now ?? new Date("2026-07-01T09:00:00+08:00")).toISOString(),
    items: [
      {
        id: createUuid(),
        title: quotePlan.selected.transport.title,
        category: "transport",
        amountCny: quotePlan.selected.transport.amountCny,
        rationale: quotePlan.selected.transport.rationale,
        provider: quotePlan.selected.transport.provider,
        url: quotePlan.selected.transport.url,
      },
      {
        id: createUuid(),
        title: quotePlan.selected.hotel.title,
        category: "hotel",
        amountCny: quotePlan.selected.hotel.amountCny,
        rationale: quotePlan.selected.hotel.rationale,
        provider: quotePlan.selected.hotel.provider,
        url: quotePlan.selected.hotel.url,
      },
      {
        id: createUuid(),
        title: "餐饮与打车弹性池",
        category: "buffer",
        amountCny: diningAndTaxi,
        rationale: "按天平摊，保留临时会客和市内交通余量。",
        provider: "内部",
      },
    ],
  };
}
