import type { Contact, FulfillmentPlan, PlanItem } from "./types";

export type FulfillmentConciergePack = {
  title: string;
  tone: "family_warm" | "business_reserved" | "travel_brief";
  primaryCopy: string;
  secondaryCopy?: string;
  packagingOptions: string[];
  handoffChecklist: string[];
  riskNotes: string[];
};

function preferenceLabels(contact: Contact | undefined, category?: Contact["preferences"][number]["category"]) {
  return (contact?.preferences ?? [])
    .filter((preference) => !category || preference.category === category)
    .map((preference) => preference.label);
}

function findItem(plan: FulfillmentPlan, category: PlanItem["category"]) {
  return plan.items.find((item) => item.category === category);
}

function isBusinessContact(contact: Contact | undefined) {
  return /客户|合作|高管|公职|国企|商务|董事|供应商/.test([contact?.relation, ...(contact?.labels ?? [])].join(" "));
}

function buildFestivalCopy(plan: FulfillmentPlan, contact: Contact | undefined) {
  const gift = findItem(plan, "gift");
  const cake = findItem(plan, "cake");
  const avoid = preferenceLabels(contact, "avoid");
  const giftLikes = preferenceLabels(contact, "gift");
  const foodLikes = preferenceLabels(contact, "food");
  const displayName = contact?.name ?? "你";

  if (isBusinessContact(contact)) {
    return {
      tone: "business_reserved" as const,
      primaryCopy: `${displayName}，感谢一直以来的信任与支持。备了一份实用小礼，愿之后合作顺利、诸事从容。`,
      secondaryCopy: "商务关系建议卡片保持克制，不出现价格、回报承诺或过度私密表达。",
      packagingOptions: [
        "去除价格标签和平台小票",
        "选择低调商务包装",
        "卡片落款使用正式称谓",
        "保留合规限额和订单记录",
      ],
      riskNotes: [
        contact?.compliance.policyNote ?? "商务礼品需复核金额和身份风险。",
      ],
    };
  }

  const giftText = gift?.title ?? giftLikes[0] ?? "这份礼物";
  const cakeText = cake?.title ?? foodLikes[0] ?? "甜甜的蛋糕";

  return {
    tone: "family_warm" as const,
    primaryCopy: `${displayName}，生日快乐。希望${giftText}和${cakeText}陪你拥有一个闪闪发光的日子，也愿你每天都被认真爱着。`,
    secondaryCopy: avoid.length > 0 ? `下单备注：避开${avoid.join("、")}。` : "下单备注：确认配送时间和祝福卡片随单。",
    packagingOptions: [
      "选择礼盒包装并隐藏价格",
      "随单放入手写祝福卡",
      "蛋糕备注过敏和忌口",
      "配送时间提前 2 小时确认",
    ],
    riskNotes: avoid.map((label) => `忌口/过敏：${label}`),
  };
}

function buildTravelCopy(plan: FulfillmentPlan, contact: Contact | undefined) {
  const transport = findItem(plan, "transport");
  const hotel = findItem(plan, "hotel");
  const buffer = findItem(plan, "buffer");

  return {
    tone: "travel_brief" as const,
    primaryCopy: `${plan.title}已按预算生成：${transport?.title ?? "交通待确认"}，${hotel?.title ?? "酒店待确认"}，弹性预算${buffer ? `${buffer.amountCny}元` : "待核算"}。`,
    secondaryCopy: contact ? `客户关联：${contact.name}，出发前请复核地址、会面时间和偏好。` : "出发前请复核客户地址、会面时间和发票要求。",
    packagingOptions: [
      "保存交通与酒店确认号",
      "同步客户地址到地图",
      "预留餐饮和打车弹性额度",
      "确认发票抬头和报销规则",
    ],
    riskNotes: plan.warnings,
  };
}

export function buildFulfillmentConciergePack(
  plan: FulfillmentPlan,
  contact?: Contact
): FulfillmentConciergePack {
  const copy = plan.scenario === "festival"
    ? buildFestivalCopy(plan, contact)
    : buildTravelCopy(plan, contact);
  const externalItems = plan.items.filter((item) => item.url);
  const checklist = [
    plan.status === "confirmed" ? "方案已确认，可进入外部平台下单" : "先确认预算和方案状态",
    externalItems.length > 0 ? `检查 ${externalItems.length} 个外部跳转链接` : "补充外部履约链接",
    "确认收件/入住/会面信息",
    "完成后回填账单或履约结果",
  ];

  return {
    title: plan.scenario === "festival" ? "礼仪交付包" : "行程交付包",
    tone: copy.tone,
    primaryCopy: copy.primaryCopy,
    secondaryCopy: copy.secondaryCopy,
    packagingOptions: copy.packagingOptions,
    handoffChecklist: checklist,
    riskNotes: [...new Set([...copy.riskNotes, ...plan.warnings])],
  };
}
