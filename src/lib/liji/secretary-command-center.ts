import { isEventLinkedToDataAsset } from "./data-asset-links";
import type { LevelTwoRecommendationCard } from "./level2-recommendations";
import type { WorkspaceData } from "./types";

export type AssistantActionPriority = "critical" | "high" | "normal";

export type AssistantAction = {
  id: string;
  priority: AssistantActionPriority;
  scenario: "reminder" | "capture" | "fulfillment" | "finance" | "memory";
  title: string;
  detail: string;
  cta: string;
  section: "dashboard" | "contacts" | "calendar" | "fulfillment" | "finance" | "ops" | "privacy";
};

export type AssetHealthStatus = "healthy" | "attention" | "blocked";

export type DataAssetItem = {
  key: "relationship" | "schedule" | "finance" | "memory" | "compliance" | "fulfillment";
  label: string;
  owned: number;
  total: number;
  status: AssetHealthStatus;
  section: AssistantAction["section"];
  gap: string;
};

export type DataAssetReport = {
  score: number;
  status: AssetHealthStatus;
  items: DataAssetItem[];
  nextAssetAction: string;
};

export type AiContinuityAction = {
  id: "privacy_authorization" | "confirm_queue" | "memory_review";
  label: string;
  detail: string;
  section: AssistantAction["section"];
};

export type AiContinuityReport = {
  mode: "cloud_assisted" | "local_guarded";
  status: AssetHealthStatus;
  safeguards: string[];
  interruptionRisks: string[];
  actions: AiContinuityAction[];
};

export type ScenarioJourney = {
  id: "relationship_care" | "bill_recap" | "travel_fulfillment";
  label: string;
  progress: number;
  status: AssetHealthStatus;
  currentStep: string;
  nextStep: string;
};

export type SecretaryCommandCenter = {
  actions: AssistantAction[];
  dataAssets: DataAssetReport;
  aiContinuity: AiContinuityReport;
  journeys: ScenarioJourney[];
};

function ratio(owned: number, total: number) {
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, owned / total));
}

function statusFromRatio(value: number): AssetHealthStatus {
  if (value >= 0.8) return "healthy";
  if (value >= 0.45) return "attention";
  return "blocked";
}

function dataAssetItem(params: Omit<DataAssetItem, "status">): DataAssetItem {
  return {
    ...params,
    status: statusFromRatio(ratio(params.owned, params.total)),
  };
}

function firstRelationshipBudget(data: WorkspaceData) {
  return data.budgets.find((item) => item.category === "relationship");
}

function relationshipBudgetRemaining(data: WorkspaceData) {
  const budget = firstRelationshipBudget(data);
  if (!budget) return undefined;
  return budget.totalCny - budget.spentCny;
}

function unconfirmedLevelOneEvents(data: WorkspaceData) {
  return data.events.filter((event) =>
    event.reminderLevel === "level_1" &&
    event.status !== "confirmed" &&
    event.status !== "done"
  );
}

function reviewRequiredMemories(data: WorkspaceData) {
  return data.aiMemories.filter((memory) =>
    memory.reviewStatus === "review_required" || memory.reviewStatus === "stale"
  );
}

export function buildAssistantActions(params: {
  data: WorkspaceData;
  levelTwoCards: LevelTwoRecommendationCard[];
}): AssistantAction[] {
  const { data, levelTwoCards } = params;
  const pendingCaptures = data.captures.filter((capture) => capture.status === "pending");
  const remaining = relationshipBudgetRemaining(data);
  const relationshipBudget = firstRelationshipBudget(data);
  const lowRelationshipBudget =
    relationshipBudget && relationshipBudget.totalCny > 0
      ? (relationshipBudget.spentCny / relationshipBudget.totalCny) >= 0.8
      : false;

  const actions: AssistantAction[] = [
    ...unconfirmedLevelOneEvents(data).slice(0, 2).map((event) => ({
      id: `reminder:${event.id}`,
      priority: "critical" as const,
      scenario: "reminder" as const,
      title: `确认红线事项：${event.title}`,
      detail: `${event.date} 未确认会触发短信或语音升级。`,
      cta: "确认提醒",
      section: "calendar" as const,
    })),
    ...pendingCaptures.slice(0, 2).map((capture) => ({
      id: `capture:${capture.id}`,
      priority: capture.parsed.confidence < 0.72 ? "high" as const : "normal" as const,
      scenario: "capture" as const,
      title: `确认采集：${capture.parsed.title}`,
      detail: `${capture.parsed.intent} 将写入画像、日程、账单或记忆。`,
      cta: "处理确认",
      section: "dashboard" as const,
    })),
    ...levelTwoCards.filter((card) => {
      const plan = data.plans.find((item) => item.eventId === card.eventId);
      return plan?.status !== "confirmed" && plan?.status !== "bookmarked";
    }).slice(0, 2).map((card) => {
      const plan = data.plans.find((item) => item.eventId === card.eventId);
      const needsConfirmation = plan?.status === "draft" || plan?.status === "pending_confirmation";

      return {
        id: `level2:${card.id}`,
        priority: card.priority === "today" || card.priority === "soon" ? "high" as const : "normal" as const,
        scenario: "fulfillment" as const,
        title: needsConfirmation ? `${plan.title}待确认` : card.title,
        detail: needsConfirmation ? "已有方案，确认后会沉淀为履约资产并进入复盘。" : card.recommendation,
        cta: needsConfirmation ? "确认方案" : "生成方案",
        section: "fulfillment" as const,
      };
    }),
    ...reviewRequiredMemories(data).slice(0, 1).map((memory) => ({
      id: `memory:${memory.id}`,
      priority: "high" as const,
      scenario: "memory" as const,
      title: "复核 AI 记忆",
      detail: memory.content,
      cta: "复核记忆",
      section: "contacts" as const,
    })),
  ];

  if (lowRelationshipBudget && typeof remaining === "number") {
    actions.push({
      id: "finance:relationship-budget",
      priority: "high",
      scenario: "finance",
      title: "人情预算接近上限",
      detail: `本月剩余额度 ${Math.max(0, remaining)} 元，建议先复核待履约方案。`,
      cta: "查看预算",
      section: "finance",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "daily:review",
      priority: "normal",
      scenario: "memory",
      title: "完成今日关系资产巡检",
      detail: "画像、日程、账单和履约暂无阻塞，适合补充高价值关系偏好。",
      cta: "维护画像",
      section: "contacts",
    });
  }

  const priorityWeight: Record<AssistantActionPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
  };

  return actions.sort((left, right) => priorityWeight[left.priority] - priorityWeight[right.priority]);
}

export function buildDataAssetReport(data: WorkspaceData): DataAssetReport {
  const contactsWithPreferences = data.contacts.filter((contact) => contact.preferences.length > 0).length;
  const contactsWithCompliance = data.contacts.filter((contact) => contact.compliance.policyNote).length;
  const linkedScheduleAssets = data.events.filter((event) => isEventLinkedToDataAsset(data, event)).length;
  const transactionsLinked = data.transactions.filter((transaction) => transaction.contactId || transaction.source !== "manual").length;
  const reviewedMemories = data.aiMemories.filter((memory) =>
    memory.reviewStatus === "healthy" || memory.reviewStatus === undefined
  ).length;
  const settledPlans = data.plans.filter((plan) =>
    plan.items.length > 0 && (plan.status === "confirmed" || plan.status === "bookmarked")
  ).length;

  const items: DataAssetItem[] = [
    dataAssetItem({
      key: "relationship",
      label: "关系画像",
      owned: contactsWithPreferences,
      total: Math.max(1, data.contacts.length),
      section: "contacts",
      gap: "补齐偏好、忌口和最近互动。",
    }),
    dataAssetItem({
      key: "schedule",
      label: "日程资产",
      owned: linkedScheduleAssets,
      total: Math.max(1, data.events.length),
      section: "calendar",
      gap: "把重要日程绑定到联系人或账单。",
    }),
    dataAssetItem({
      key: "finance",
      label: "账单资产",
      owned: transactionsLinked + data.recurringBills.length,
      total: Math.max(1, data.transactions.length + data.recurringBills.length),
      section: "finance",
      gap: "把消费、账单和关系事件关联起来。",
    }),
    dataAssetItem({
      key: "memory",
      label: "AI 记忆",
      owned: reviewedMemories,
      total: Math.max(1, data.aiMemories.length),
      section: "contacts",
      gap: "复核低置信度或过期记忆。",
    }),
    dataAssetItem({
      key: "compliance",
      label: "合规资产",
      owned: contactsWithCompliance,
      total: Math.max(1, data.contacts.length),
      section: "contacts",
      gap: "补充礼品、宴请和身份风险规则。",
    }),
    dataAssetItem({
      key: "fulfillment",
      label: "履约资产",
      owned: settledPlans,
      total: Math.max(1, data.plans.length),
      section: "fulfillment",
      gap: "确认方案、外链和对账状态。",
    }),
  ];
  const score = Math.round(items.reduce((total, item) => total + ratio(item.owned, item.total), 0) / items.length * 100);
  const weakest = [...items].sort((left, right) => ratio(left.owned, left.total) - ratio(right.owned, right.total))[0];

  return {
    score,
    status: statusFromRatio(score / 100),
    items,
    nextAssetAction: weakest ? `${weakest.label}：${weakest.gap}` : "继续维护高价值关系资产。",
  };
}

export function buildAiContinuityReport(data: WorkspaceData): AiContinuityReport {
  const pendingCaptures = data.captures.filter((capture) => capture.status === "pending");
  const memoriesNeedingReview = reviewRequiredMemories(data);
  const risks = [
    data.privacy.cloudModelEnabled ? "" : "云端模型未授权，已切换本地规则解析。",
    pendingCaptures.length > 3
      ? "待确认队列较长，可能影响 AI 记忆入库时效。"
      : "",
    memoriesNeedingReview.length > 0 ? "存在需要复核的 AI 记忆。" : "",
  ].filter(Boolean);
  const actions: AiContinuityAction[] = [];

  if (!data.privacy.cloudModelEnabled) {
    actions.push({
      id: "privacy_authorization",
      label: "打开授权中心",
      detail: "确认公网模型、PII 脱敏和通知通道开关。",
      section: "privacy",
    });
  }

  if (pendingCaptures.length > 3) {
    actions.push({
      id: "confirm_queue",
      label: "处理确认队列",
      detail: `${pendingCaptures.length} 条采集待确认，先入库再进入记忆。`,
      section: "dashboard",
    });
  }

  if (memoriesNeedingReview.length > 0) {
    actions.push({
      id: "memory_review",
      label: "复核 AI 记忆",
      detail: `${memoriesNeedingReview.length} 条记忆需要纠偏或重新确认。`,
      section: "contacts",
    });
  }

  return {
    mode: data.privacy.cloudModelEnabled ? "cloud_assisted" : "local_guarded",
    status: risks.length >= 2 ? "attention" : "healthy",
    safeguards: [
      "PII 脱敏后调用模型",
      "本地规则兜底解析",
      "确认后写入数据资产",
      "AI 记忆可纠偏复核",
    ],
    interruptionRisks: risks,
    actions,
  };
}

function journeyStatus(progress: number): AssetHealthStatus {
  if (progress >= 75) return "healthy";
  if (progress >= 45) return "attention";
  return "blocked";
}

export function buildScenarioJourneys(params: {
  data: WorkspaceData;
  levelTwoCards: LevelTwoRecommendationCard[];
}): ScenarioJourney[] {
  const { data, levelTwoCards } = params;
  const hasVip = data.contacts.length > 0;
  const hasLevelTwo = levelTwoCards.length > 0;
  const hasConfirmedPlan = data.plans.some((plan) => plan.status === "confirmed" || plan.status === "bookmarked");
  const hasNotificationLog = data.notificationLogs.length > 0;
  const relationshipProgress = [hasVip, hasLevelTwo, hasConfirmedPlan, hasNotificationLog]
    .filter(Boolean).length * 25;

  const hasRecurringBill = data.recurringBills.length > 0;
  const hasTransaction = data.transactions.length > 0;
  const hasInsight = data.insight.healthScore > 0;
  const hasBillCapture = data.captures.some((capture) => capture.parsed.intent === "bill");
  const billProgress = [hasRecurringBill, hasTransaction, hasInsight, hasBillCapture || hasTransaction]
    .filter(Boolean).length * 25;

  const travelEvents = data.events.filter((event) => event.source === "travel");
  const travelPlans = data.plans.filter((plan) => plan.scenario === "travel");
  const hasTravelQuote = travelPlans.some((plan) => plan.items.some((item) => item.provider === "携程" || item.provider === "同程"));
  const hasConfirmedTravelPlan = travelPlans.some((plan) => plan.status === "confirmed" || plan.status === "bookmarked");
  const travelProgress = [travelEvents.length > 0, travelPlans.length > 0, hasTravelQuote, hasConfirmedTravelPlan]
    .filter(Boolean).length * 25;

  return [
    {
      id: "relationship_care",
      label: "关系关怀",
      progress: relationshipProgress,
      status: journeyStatus(relationshipProgress),
      currentStep: hasConfirmedPlan ? "履约方案已沉淀" : hasLevelTwo ? "推荐卡待转方案" : "补充重要日程",
      nextStep: hasConfirmedPlan ? "跟踪投递和复盘" : "生成并确认履约方案",
    },
    {
      id: "bill_recap",
      label: "账单复盘",
      progress: billProgress,
      status: journeyStatus(billProgress),
      currentStep: hasInsight ? "月度复盘可用" : "等待交易聚合",
      nextStep: hasRecurringBill ? "关联短信账单和预算" : "新增周期账单",
    },
    {
      id: "travel_fulfillment",
      label: "差旅履约",
      progress: travelProgress,
      status: journeyStatus(travelProgress),
      currentStep: hasConfirmedTravelPlan ? "差旅方案已确认" : travelPlans.length > 0 ? "差旅方案已生成" : "等待差旅采集",
      nextStep: hasConfirmedTravelPlan ? "跟踪行前清单和外部跳转" : hasTravelQuote ? "确认预算和外部跳转" : "补充报价和客户地址",
    },
  ];
}

export function buildSecretaryCommandCenter(params: {
  data: WorkspaceData;
  levelTwoCards: LevelTwoRecommendationCard[];
}): SecretaryCommandCenter {
  return {
    actions: buildAssistantActions(params),
    dataAssets: buildDataAssetReport(params.data),
    aiContinuity: buildAiContinuityReport(params.data),
    journeys: buildScenarioJourneys(params),
  };
}
