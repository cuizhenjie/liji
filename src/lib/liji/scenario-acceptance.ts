import type { LevelTwoRecommendationCard } from "./level2-recommendations";
import type { CalendarEvent, Contact, FulfillmentPlan, WorkspaceData } from "./types";

export type ScenarioAcceptanceStatus = "ready" | "needs_action" | "blocked";

export type ScenarioAcceptanceCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  critical?: boolean;
};

export type ScenarioAcceptanceItem = {
  id: "birthday_care" | "client_hospitality" | "travel_planning" | "bill_recap";
  label: string;
  status: ScenarioAcceptanceStatus;
  progress: number;
  currentStep: string;
  nextStep: string;
  section: "dashboard" | "contacts" | "calendar" | "fulfillment" | "finance" | "ops" | "privacy";
  cta: string;
  checks: ScenarioAcceptanceCheck[];
};

function progressFromChecks(checks: ScenarioAcceptanceCheck[]) {
  if (checks.length === 0) return 0;
  return Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
}

function statusFromChecks(checks: ScenarioAcceptanceCheck[]): ScenarioAcceptanceStatus {
  if (checks.some((check) => check.critical && !check.passed)) return "blocked";
  return checks.every((check) => check.passed) ? "ready" : "needs_action";
}

function firstMissing(checks: ScenarioAcceptanceCheck[]) {
  return checks.find((check) => !check.passed);
}

function eventContact(data: WorkspaceData, event: CalendarEvent | undefined) {
  return event?.contactId ? data.contacts.find((contact) => contact.id === event.contactId) : undefined;
}

function isBusinessContact(contact: Contact) {
  return /客户|合作|高管|公职|国企|商务/.test([contact.relation, ...contact.labels].join(" "));
}

function matchingPlan(data: WorkspaceData, predicate: (plan: FulfillmentPlan) => boolean) {
  return data.plans.find(predicate);
}

function buildItem(params: {
  id: ScenarioAcceptanceItem["id"];
  label: string;
  checks: ScenarioAcceptanceCheck[];
  fallbackCurrentStep: string;
  section: ScenarioAcceptanceItem["section"];
  cta: string;
}): ScenarioAcceptanceItem {
  const missing = firstMissing(params.checks);

  return {
    id: params.id,
    label: params.label,
    status: statusFromChecks(params.checks),
    progress: progressFromChecks(params.checks),
    currentStep: missing ? missing.detail : params.fallbackCurrentStep,
    nextStep: missing ? missing.label : "持续跟踪投递、预算和复盘。",
    section: params.section,
    cta: params.cta,
    checks: params.checks,
  };
}

function birthdayCareScenario(data: WorkspaceData, levelTwoCards: LevelTwoRecommendationCard[]): ScenarioAcceptanceItem {
  const birthdayEvent = data.events.find((event) => /生日|纪念日/.test(event.title));
  const contact = eventContact(data, birthdayEvent);
  const plan = matchingPlan(data, (item) =>
    item.scenario === "festival" && (!birthdayEvent || item.eventId === birthdayEvent.id || item.title.includes("生日"))
  );
  const checks: ScenarioAcceptanceCheck[] = [
    {
      id: "birthday-profile",
      label: "补齐生日对象偏好",
      passed: Boolean(contact && contact.preferences.length >= 2),
      detail: contact ? `${contact.name} 偏好 ${contact.preferences.length} 条` : "生日事件还未绑定联系人",
      critical: true,
    },
    {
      id: "birthday-calendar",
      label: "确认生日年循环日程",
      passed: Boolean(birthdayEvent?.date && birthdayEvent.rrule),
      detail: birthdayEvent ? `${birthdayEvent.date} · ${birthdayEvent.rrule ?? "未重复"}` : "缺少生日日程",
      critical: true,
    },
    {
      id: "birthday-recommendation",
      label: "生成节日前置推荐",
      passed: levelTwoCards.some((card) => card.eventId === birthdayEvent?.id) || Boolean(plan?.items.length),
      detail: plan ? `${plan.items.length} 个履约项` : "未生成礼物/蛋糕/餐饮方案",
    },
    {
      id: "birthday-fulfillment",
      label: "确认生日履约方案",
      passed: plan?.status === "confirmed" || plan?.status === "bookmarked",
      detail: plan ? `方案状态 ${plan.status}` : "还没有可确认方案",
    },
  ];

  return buildItem({
    id: "birthday_care",
    label: "生日关怀",
    checks,
    fallbackCurrentStep: "生日关怀链路已可执行。",
    section: "fulfillment",
    cta: "推进生日方案",
  });
}

function clientHospitalityScenario(data: WorkspaceData): ScenarioAcceptanceItem {
  const contact = data.contacts.find((item) => isBusinessContact(item));
  const event = data.events.find((item) => /宴请|客户|会议|会面/.test(item.title));
  const confirmedLog = data.notificationLogs.some((log) =>
    log.eventId === event?.id && log.status === "confirmed"
  );
  const sentLog = data.notificationLogs.some((log) => log.eventId === event?.id);
  const checks: ScenarioAcceptanceCheck[] = [
    {
      id: "hospitality-contact",
      label: "绑定商务联系人",
      passed: Boolean(contact && event?.contactId === contact.id),
      detail: contact ? `${contact.name} · ${contact.relation}` : "缺少商务联系人",
      critical: true,
    },
    {
      id: "hospitality-compliance",
      label: "确认宴请合规限额",
      passed: Boolean(contact?.compliance.policyNote && contact.compliance.hospitalityLimitCny),
      detail: contact?.compliance.hospitalityLimitCny ? `宴请限额 ${contact.compliance.hospitalityLimitCny} 元` : "缺少宴请限额",
      critical: true,
    },
    {
      id: "hospitality-reminder",
      label: "确认 Level 1 红线提醒",
      passed: Boolean(event?.reminderLevel === "level_1" && (event.status === "confirmed" || confirmedLog)),
      detail: event ? `${event.title} · ${event.status}${sentLog ? " · 已投递" : ""}` : "缺少客户宴请日程",
      critical: true,
    },
    {
      id: "hospitality-memory",
      label: "沉淀客户忌口/偏好",
      passed: Boolean(contact?.preferences.some((preference) => preference.category === "food" || preference.category === "avoid")),
      detail: contact ? `${contact.preferences.length} 条偏好` : "缺少客户偏好",
    },
  ];

  return buildItem({
    id: "client_hospitality",
    label: "客户宴请",
    checks,
    fallbackCurrentStep: "客户宴请链路已通过红线检查。",
    section: "calendar",
    cta: "处理红线提醒",
  });
}

function travelPlanningScenario(data: WorkspaceData): ScenarioAcceptanceItem {
  const plan = matchingPlan(data, (item) => item.scenario === "travel");
  const hasTransport = Boolean(plan?.items.some((item) => item.category === "transport"));
  const hasHotel = Boolean(plan?.items.some((item) => item.category === "hotel"));
  const budget = data.budgets.find((item) => item.category === "travel");
  const checks: ScenarioAcceptanceCheck[] = [
    {
      id: "travel-plan",
      label: "生成差旅行程单",
      passed: Boolean(plan),
      detail: plan ? plan.title : "缺少差旅方案",
      critical: true,
    },
    {
      id: "travel-quotes",
      label: "补齐交通和酒店报价",
      passed: hasTransport && hasHotel,
      detail: plan ? `${hasTransport ? "有交通" : "缺交通"} · ${hasHotel ? "有酒店" : "缺酒店"}` : "等待方案生成",
      critical: true,
    },
    {
      id: "travel-budget",
      label: "校验差旅预算余量",
      passed: Boolean(budget && budget.totalCny > budget.spentCny),
      detail: budget ? `剩余 ${budget.totalCny - budget.spentCny} 元` : "缺少差旅预算",
    },
    {
      id: "travel-confirmation",
      label: "确认差旅履约方案",
      passed: plan?.status === "confirmed" || plan?.status === "bookmarked",
      detail: plan ? `方案状态 ${plan.status}` : "还没有可确认方案",
    },
  ];

  return buildItem({
    id: "travel_planning",
    label: "商务差旅",
    checks,
    fallbackCurrentStep: "差旅方案已可进入外部平台预订。",
    section: "fulfillment",
    cta: "推进差旅方案",
  });
}

function billRecapScenario(data: WorkspaceData): ScenarioAcceptanceItem {
  const hasBillTransaction = data.transactions.some((transaction) =>
    transaction.source === "sms" || /房贷|水电|话费|保费|扣款/.test(transaction.title)
  );
  const confirmedBillLog = data.notificationLogs.some((log) =>
    /房贷|扣款|账单/.test(log.title) && log.status === "confirmed"
  );
  const checks: ScenarioAcceptanceCheck[] = [
    {
      id: "bill-recurring",
      label: "托管周期账单",
      passed: data.recurringBills.length > 0,
      detail: `${data.recurringBills.length} 个周期账单`,
      critical: true,
    },
    {
      id: "bill-transaction",
      label: "沉淀扣款交易",
      passed: hasBillTransaction,
      detail: hasBillTransaction ? "已识别短信/扣款交易" : "缺少扣款流水",
      critical: true,
    },
    {
      id: "bill-reminder",
      label: "账单提醒已确认",
      passed: confirmedBillLog,
      detail: confirmedBillLog ? "已有确认投递日志" : "账单提醒尚未确认",
    },
    {
      id: "bill-insight",
      label: "生成月度复盘",
      passed: data.insight.healthScore > 0 && data.insight.nextMonthRisks.length > 0,
      detail: data.insight.summary,
    },
  ];

  return buildItem({
    id: "bill_recap",
    label: "账单复盘",
    checks,
    fallbackCurrentStep: "账单复盘链路已可用于下月预算预警。",
    section: "finance",
    cta: "查看账单复盘",
  });
}

export function buildScenarioAcceptance(params: {
  data: WorkspaceData;
  levelTwoCards: LevelTwoRecommendationCard[];
}): ScenarioAcceptanceItem[] {
  const items = [
    birthdayCareScenario(params.data, params.levelTwoCards),
    clientHospitalityScenario(params.data),
    travelPlanningScenario(params.data),
    billRecapScenario(params.data),
  ];
  const statusWeight: Record<ScenarioAcceptanceStatus, number> = {
    blocked: 0,
    needs_action: 1,
    ready: 2,
  };

  return items.sort((left, right) => {
    const byStatus = statusWeight[left.status] - statusWeight[right.status];
    if (byStatus !== 0) return byStatus;
    return left.progress - right.progress;
  });
}
