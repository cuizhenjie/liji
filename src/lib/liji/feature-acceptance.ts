import { buildFulfillmentConciergePack } from "./fulfillment-concierge";
import { buildNextMonthReservePlan } from "./insights";
import type { LevelTwoRecommendationCard } from "./level2-recommendations";
import { buildRelationshipActions } from "./relationship-actions";
import { buildTravelReadinessBrief } from "./travel-readiness";
import type { Contact, WorkspaceData } from "./types";

export type FeatureAcceptanceStatus = "accepted" | "needs_action" | "blocked";

export type FeatureAcceptanceCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  critical?: boolean;
};

export type FeatureAcceptanceItem = {
  id:
    | "F101"
    | "F201"
    | "F202"
    | "F301"
    | "F302"
    | "F401"
    | "F402"
    | "N101";
  label: string;
  module: "人脉画像" | "智能日历" | "履约引擎" | "钱包复盘" | "隐私授权";
  status: FeatureAcceptanceStatus;
  progress: number;
  section: "dashboard" | "contacts" | "calendar" | "fulfillment" | "finance" | "ops" | "privacy";
  cta: string;
  nextStep: string;
  evidence: string;
  checks: FeatureAcceptanceCheck[];
};

function progress(checks: FeatureAcceptanceCheck[]) {
  return Math.round((checks.filter((check) => check.passed).length / Math.max(1, checks.length)) * 100);
}

function status(checks: FeatureAcceptanceCheck[]): FeatureAcceptanceStatus {
  if (checks.some((check) => check.critical && !check.passed)) return "blocked";
  return checks.every((check) => check.passed) ? "accepted" : "needs_action";
}

function nextStep(checks: FeatureAcceptanceCheck[]) {
  return checks.find((check) => !check.passed)?.label ?? "持续观察真实用户数据和生产日志。";
}

function item(params: Omit<FeatureAcceptanceItem, "status" | "progress" | "nextStep">): FeatureAcceptanceItem {
  return {
    ...params,
    status: status(params.checks),
    progress: progress(params.checks),
    nextStep: nextStep(params.checks),
  };
}

function riskyContact(contact: Contact) {
  return /公职|国企|高管|客户|合作|商务/.test([contact.relation, ...contact.labels].join(" "));
}

function f101IdentityProfile(data: WorkspaceData): FeatureAcceptanceItem {
  const riskyContacts = data.contacts.filter(riskyContact);
  const contactsWithPreferences = data.contacts.filter((contact) => contact.preferences.length >= 2);
  const riskyWithCompliance = riskyContacts.filter((contact) => contact.compliance.policyNote);
  const relationshipActions = buildRelationshipActions(data);
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "contacts",
      label: "至少沉淀一个 VIP 画像",
      passed: data.contacts.length > 0,
      detail: `${data.contacts.length} 个联系人`,
      critical: true,
    },
    {
      id: "preferences",
      label: "补齐偏好矩阵",
      passed: contactsWithPreferences.length >= Math.max(1, data.contacts.length - 1),
      detail: `${contactsWithPreferences.length}/${data.contacts.length} 个联系人偏好达标`,
      critical: true,
    },
    {
      id: "compliance",
      label: "高风险身份绑定合规规则",
      passed: riskyContacts.length === riskyWithCompliance.length,
      detail: `${riskyWithCompliance.length}/${riskyContacts.length} 个高风险联系人已绑定`,
      critical: true,
    },
    {
      id: "memory",
      label: "AI 记忆可复核纠偏",
      passed: data.aiMemories.length > 0,
      detail: `${data.aiMemories.length} 条 AI/人工记忆`,
    },
    {
      id: "action-plan",
      label: "生成关系维护行动建议",
      passed: relationshipActions.length > 0,
      detail: `${relationshipActions.length} 个秘书动作`,
    },
  ];

  return item({
    id: "F101",
    label: "关系画像及偏好配置",
    module: "人脉画像",
    section: "contacts",
    cta: "验收画像",
    evidence: `${data.contacts.length} 个联系人 · ${data.aiMemories.length} 条记忆`,
    checks,
  });
}

function f201CalendarCapture(data: WorkspaceData): FeatureAcceptanceItem {
  const aiEvents = data.events.filter((event) => event.source === "ai" || event.source === "travel");
  const recurringEvents = data.events.filter((event) => event.rrule);
  const linkedEvents = data.events.filter((event) => event.contactId);
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "ai-event",
      label: "自然语言可写入日程",
      passed: aiEvents.length > 0,
      detail: `${aiEvents.length} 个 AI/差旅日程`,
      critical: true,
    },
    {
      id: "contact-link",
      label: "日程自动关联 VIP",
      passed: linkedEvents.length > 0,
      detail: `${linkedEvents.length}/${data.events.length} 个日程已关联`,
      critical: true,
    },
    {
      id: "recurrence",
      label: "生日/纪念日支持重复规则",
      passed: recurringEvents.length > 0,
      detail: `${recurringEvents.length} 个 RRULE 日程`,
    },
    {
      id: "confirmation",
      label: "AI 输入先进入确认中心",
      passed: data.captures.every((capture) => capture.status !== "pending") || data.captures.length === 0,
      detail: `${data.captures.filter((capture) => capture.status === "pending").length} 条待确认`,
    },
  ];

  return item({
    id: "F201",
    label: "智能日程自然语言录入",
    module: "智能日历",
    section: "dashboard",
    cta: "验收采集",
    evidence: `${data.events.length} 个日程 · ${data.captures.length} 条采集`,
    checks,
  });
}

function f202FailsafeNotification(data: WorkspaceData): FeatureAcceptanceItem {
  const levelOneEvents = data.events.filter((event) => event.reminderLevel === "level_1");
  const logsForLevelOne = data.notificationLogs.filter((log) => log.level === "level_1");
  const confirmedLevelOne = levelOneEvents.filter((event) =>
    event.status === "confirmed" ||
    data.notificationLogs.some((log) => log.eventId === event.id && log.status === "confirmed")
  );
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "level1-events",
      label: "配置 Level 1 红线事项",
      passed: levelOneEvents.length > 0,
      detail: `${levelOneEvents.length} 个 Level 1`,
      critical: true,
    },
    {
      id: "delivery-logs",
      label: "生成提醒投递日志",
      passed: logsForLevelOne.length > 0,
      detail: `${logsForLevelOne.length} 条 Level 1 日志`,
      critical: true,
    },
    {
      id: "confirmation",
      label: "红线提醒被确认",
      passed: confirmedLevelOne.length === levelOneEvents.length,
      detail: `${confirmedLevelOne.length}/${levelOneEvents.length} 个已确认`,
      critical: true,
    },
    {
      id: "privacy-channel",
      label: "通知授权有降级通道",
      passed: data.privacy.webPushEnabled || data.privacy.smsEnabled || data.privacy.voiceCallEnabled,
      detail: `Push=${data.privacy.webPushEnabled} SMS=${data.privacy.smsEnabled} Voice=${data.privacy.voiceCallEnabled}`,
    },
  ];

  return item({
    id: "F202",
    label: "冗余预警机制",
    module: "智能日历",
    section: "calendar",
    cta: "确认红线提醒",
    evidence: `${levelOneEvents.length} 个 Level 1 · ${logsForLevelOne.length} 条日志`,
    checks,
  });
}

function f301FestivalFulfillment(data: WorkspaceData, levelTwoCards: LevelTwoRecommendationCard[]): FeatureAcceptanceItem {
  const festivalPlan = data.plans.find((plan) => plan.scenario === "festival");
  const categories = new Set(festivalPlan?.items.map((planItem) => planItem.category) ?? []);
  const hasExternalLinks = Boolean(festivalPlan?.items.some((planItem) => planItem.url));
  const contact = data.contacts.find((item) => item.id === festivalPlan?.contactId);
  const conciergePack = festivalPlan ? buildFulfillmentConciergePack(festivalPlan, contact) : null;
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "split",
      label: "生成礼物/蛋糕/餐饮拆解",
      passed: categories.has("gift") && categories.has("cake") && categories.has("dining"),
      detail: festivalPlan ? `${festivalPlan.items.length} 个履约项` : "缺少节日履约方案",
      critical: true,
    },
    {
      id: "level2",
      label: "提前生成 Level 2 推荐",
      passed: levelTwoCards.length > 0,
      detail: `${levelTwoCards.length} 张推荐卡`,
    },
    {
      id: "links",
      label: "外部平台跳转可用",
      passed: hasExternalLinks,
      detail: hasExternalLinks ? "包含京东/美团等链接" : "缺少外部链接",
      critical: true,
    },
    {
      id: "concierge",
      label: "生成卡片文案与包装检查",
      passed: Boolean(conciergePack?.primaryCopy && conciergePack.packagingOptions.length >= 3),
      detail: conciergePack ? `${conciergePack.title} · ${conciergePack.packagingOptions.length} 项检查` : "缺少礼仪交付包",
    },
    {
      id: "confirmation",
      label: "用户确认履约方案",
      passed: festivalPlan?.status === "confirmed" || festivalPlan?.status === "bookmarked",
      detail: festivalPlan ? `状态 ${festivalPlan.status}` : "缺少方案",
    },
  ];

  return item({
    id: "F301",
    label: "生日/节日消费拆解与履约",
    module: "履约引擎",
    section: "fulfillment",
    cta: "确认生日方案",
    evidence: festivalPlan ? `${festivalPlan.budgetCny} 元 · ${festivalPlan.items.length} 项` : "未生成方案",
    checks,
  });
}

function f302TravelFulfillment(data: WorkspaceData): FeatureAcceptanceItem {
  const travelPlan = data.plans.find((plan) => plan.scenario === "travel");
  const categories = new Set(travelPlan?.items.map((planItem) => planItem.category) ?? []);
  const travelBudget = data.budgets.find((budget) => budget.category === "travel");
  const readinessBrief = travelPlan ? buildTravelReadinessBrief(travelPlan) : null;
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "travel-plan",
      label: "生成差旅行程方案",
      passed: Boolean(travelPlan),
      detail: travelPlan?.title ?? "缺少差旅方案",
      critical: true,
    },
    {
      id: "transport-hotel",
      label: "交通和住宿均已拆解",
      passed: categories.has("transport") && categories.has("hotel"),
      detail: `${categories.has("transport") ? "有交通" : "缺交通"} · ${categories.has("hotel") ? "有住宿" : "缺住宿"}`,
      critical: true,
    },
    {
      id: "budget",
      label: "差旅预算仍有余量",
      passed: Boolean(travelBudget && travelBudget.totalCny > travelBudget.spentCny),
      detail: travelBudget ? `剩余 ${travelBudget.totalCny - travelBudget.spentCny} 元` : "缺少差旅预算",
    },
    {
      id: "readiness",
      label: "生成行前秘书包",
      passed: Boolean(readinessBrief && readinessBrief.readinessScore >= 60 && readinessBrief.checklist.length >= 4),
      detail: readinessBrief ? `准备度 ${readinessBrief.readinessScore}` : "缺少行前简报",
    },
    {
      id: "confirmation",
      label: "用户确认差旅方案",
      passed: travelPlan?.status === "confirmed" || travelPlan?.status === "bookmarked",
      detail: travelPlan ? `状态 ${travelPlan.status}` : "缺少方案",
    },
  ];

  return item({
    id: "F302",
    label: "智能商务差旅规划",
    module: "履约引擎",
    section: "fulfillment",
    cta: "确认差旅方案",
    evidence: travelPlan ? `${travelPlan.budgetCny} 元 · ${travelPlan.items.length} 项` : "未生成方案",
    checks,
  });
}

function f401Bills(data: WorkspaceData): FeatureAcceptanceItem {
  const billTransactions = data.transactions.filter((transaction) =>
    transaction.source === "sms" || /房贷|水电|话费|保费|扣款/.test(transaction.title)
  );
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "recurring",
      label: "录入周期账单",
      passed: data.recurringBills.length > 0,
      detail: `${data.recurringBills.length} 个周期账单`,
      critical: true,
    },
    {
      id: "account",
      label: "账单关联扣款账户",
      passed: data.recurringBills.every((bill) => bill.accountLabel && !/待关联/.test(bill.accountLabel)),
      detail: `${data.recurringBills.filter((bill) => !/待关联/.test(bill.accountLabel)).length}/${data.recurringBills.length} 个已关联`,
    },
    {
      id: "sms",
      label: "支持短信账单入账",
      passed: billTransactions.length > 0,
      detail: `${billTransactions.length} 条账单交易`,
      critical: true,
    },
    {
      id: "manual",
      label: "支持手动/语音轻量记账",
      passed: data.transactions.length > billTransactions.length,
      detail: `${data.transactions.length} 条交易流水`,
    },
  ];

  return item({
    id: "F401",
    label: "周期性生活账单托管",
    module: "钱包复盘",
    section: "finance",
    cta: "验收账单",
    evidence: `${data.recurringBills.length} 个账单 · ${data.transactions.length} 条流水`,
    checks,
  });
}

function f402Insights(data: WorkspaceData): FeatureAcceptanceItem {
  const categories = new Set<string>(data.transactions.map((transaction) => transaction.category));
  const reservePlan = buildNextMonthReservePlan(data);
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "summary",
      label: "生成秘书复盘摘要",
      passed: Boolean(data.insight.summary && data.insight.healthScore > 0),
      detail: `健康度 ${data.insight.healthScore}`,
      critical: true,
    },
    {
      id: "categories",
      label: "覆盖四类支出结构",
      passed: ["fixed", "relationship", "travel", "daily"].every((category) => categories.has(category as never)),
      detail: Array.from(categories).join("、"),
    },
    {
      id: "risks",
      label: "生成下月风险预警",
      passed: data.insight.nextMonthRisks.length > 0,
      detail: `${data.insight.nextMonthRisks.length} 条风险`,
    },
    {
      id: "pressure",
      label: "计算财务压力指数",
      passed: data.insight.pressureIndex > 0,
      detail: `压力指数 ${data.insight.pressureIndex}`,
    },
    {
      id: "reserve",
      label: "生成下月预留预算方案",
      passed: reservePlan.items.length >= 3 && reservePlan.totalReserveCny > 0,
      detail: `${reservePlan.period} · ${reservePlan.items.length} 项 · ${reservePlan.totalReserveCny} 元`,
    },
  ];

  return item({
    id: "F402",
    label: "智能月度生活与财务复盘",
    module: "钱包复盘",
    section: "finance",
    cta: "验收复盘",
    evidence: `${data.insight.period} · 健康度 ${data.insight.healthScore}`,
    checks,
  });
}

function n101Privacy(data: WorkspaceData): FeatureAcceptanceItem {
  const checks: FeatureAcceptanceCheck[] = [
    {
      id: "pii",
      label: "默认开启 PII 脱敏",
      passed: data.privacy.piiMasking,
      detail: `PII=${data.privacy.piiMasking}`,
      critical: true,
    },
    {
      id: "cloud-switch",
      label: "云端模型有授权开关",
      passed: typeof data.privacy.cloudModelEnabled === "boolean",
      detail: `Cloud=${data.privacy.cloudModelEnabled}`,
      critical: true,
    },
    {
      id: "third-party",
      label: "第三方跳转授权可控",
      passed: typeof data.privacy.thirdPartyLinksEnabled === "boolean",
      detail: `ThirdParty=${data.privacy.thirdPartyLinksEnabled}`,
    },
    {
      id: "notification-phone",
      label: "短信/语音路由手机号可维护",
      passed: Boolean(data.privacy.notificationPhone),
      detail: data.privacy.notificationPhone ? "已配置通知手机号" : "缺少通知手机号",
    },
  ];

  return item({
    id: "N101",
    label: "隐私与授权中心",
    module: "隐私授权",
    section: "privacy",
    cta: "验收隐私",
    evidence: `PII=${data.privacy.piiMasking} · Cloud=${data.privacy.cloudModelEnabled}`,
    checks,
  });
}

export function buildFeatureAcceptanceMatrix(params: {
  data: WorkspaceData;
  levelTwoCards: LevelTwoRecommendationCard[];
}): FeatureAcceptanceItem[] {
  const items = [
    f101IdentityProfile(params.data),
    f201CalendarCapture(params.data),
    f202FailsafeNotification(params.data),
    f301FestivalFulfillment(params.data, params.levelTwoCards),
    f302TravelFulfillment(params.data),
    f401Bills(params.data),
    f402Insights(params.data),
    n101Privacy(params.data),
  ];
  const statusWeight: Record<FeatureAcceptanceStatus, number> = {
    blocked: 0,
    needs_action: 1,
    accepted: 2,
  };

  return items.sort((left, right) => {
    const byStatus = statusWeight[left.status] - statusWeight[right.status];
    if (byStatus !== 0) return byStatus;
    return left.id.localeCompare(right.id);
  });
}
