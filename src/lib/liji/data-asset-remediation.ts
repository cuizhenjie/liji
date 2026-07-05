import type { DataAssetItem } from "./secretary-command-center";
import type { CalendarEvent, Contact, FulfillmentPlan, Transaction, WorkspaceData } from "./types";

export type DataAssetRemediationPriority = "critical" | "high" | "normal";

export type DataAssetRemediationTask = {
  id: string;
  assetKey: DataAssetItem["key"];
  priority: DataAssetRemediationPriority;
  title: string;
  detail: string;
  section: DataAssetItem["section"];
  cta: string;
  evidence: string;
};

function riskyContact(contact: Contact) {
  return /公职|国企|高管|客户|合作/.test([contact.relation, ...contact.labels].join(" "));
}

function relationshipTasks(data: WorkspaceData): DataAssetRemediationTask[] {
  return data.contacts
    .filter((contact) => contact.preferences.length < 2)
    .map((contact) => ({
      id: `relationship:${contact.id}`,
      assetKey: "relationship" as const,
      priority: "normal" as const,
      title: `补齐 ${contact.name} 的偏好矩阵`,
      detail: "至少沉淀 2 条偏好、忌口或互动线索，后续推荐才有稳定依据。",
      section: "contacts" as const,
      cta: "补画像",
      evidence: `${contact.preferences.length}/2 条偏好`,
    }));
}

function complianceTasks(data: WorkspaceData): DataAssetRemediationTask[] {
  return data.contacts
    .filter((contact) => riskyContact(contact) && !contact.compliance.policyNote)
    .map((contact) => ({
      id: `compliance:${contact.id}`,
      assetKey: "compliance" as const,
      priority: "high" as const,
      title: `补齐 ${contact.name} 的商务合规规则`,
      detail: "重要客户、公职或国企高管需要礼品和宴请限额，避免推荐越过红线。",
      section: "contacts" as const,
      cta: "设规则",
      evidence: "缺少 policyNote",
    }));
}

function scheduleTasks(data: WorkspaceData): DataAssetRemediationTask[] {
  return data.events
    .filter((event) => !event.contactId)
    .slice(0, 4)
    .map((event: CalendarEvent) => ({
      id: `schedule:${event.id}`,
      assetKey: "schedule" as const,
      priority: event.reminderLevel === "level_1" ? "high" as const : "normal" as const,
      title: `关联日程：${event.title}`,
      detail: "把日程绑定联系人或账单资产，提醒、预算和复盘才能串起来。",
      section: event.source === "bill" ? "finance" as const : "calendar" as const,
      cta: event.source === "bill" ? "关联账单" : "关联联系人",
      evidence: `${event.date} · ${event.reminderLevel}`,
    }));
}

function financeTasks(data: WorkspaceData): DataAssetRemediationTask[] {
  const manualUnlinkedTransactions = data.transactions
    .filter((transaction: Transaction) => transaction.source === "manual" && !transaction.contactId)
    .slice(0, 3)
    .map((transaction) => ({
      id: `finance:${transaction.id}`,
      assetKey: "finance" as const,
      priority: transaction.category === "relationship" || transaction.category === "travel" ? "high" as const : "normal" as const,
      title: `关联交易：${transaction.title}`,
      detail: "手动交易需要绑定关系、差旅或账单来源，月度复盘才不会变成孤立流水。",
      section: "finance" as const,
      cta: "关联交易",
      evidence: `${transaction.category} · ${transaction.amountCny} 元`,
    }));
  const budgetTasks = data.budgets
    .filter((budget) => budget.totalCny > 0 && budget.spentCny / budget.totalCny >= 0.85)
    .map((budget) => ({
      id: `budget:${budget.id}`,
      assetKey: "finance" as const,
      priority: "high" as const,
      title: `${budget.label} 预算接近上限`,
      detail: "先复核待履约方案，再决定是否调高预算或降级方案。",
      section: "finance" as const,
      cta: "调预算",
      evidence: `${Math.round((budget.spentCny / budget.totalCny) * 100)}% 已用`,
    }));

  return [...manualUnlinkedTransactions, ...budgetTasks];
}

function memoryTasks(data: WorkspaceData): DataAssetRemediationTask[] {
  return data.aiMemories
    .filter((memory) => memory.reviewStatus === "review_required" || memory.reviewStatus === "stale")
    .map((memory) => ({
      id: `memory:${memory.id}`,
      assetKey: "memory" as const,
      priority: memory.reviewStatus === "stale" ? "critical" as const : "high" as const,
      title: "复核 AI 记忆",
      detail: memory.content,
      section: "contacts" as const,
      cta: "纠偏记忆",
      evidence: memory.reviewStatus === "stale" ? "已过期" : "需复核",
    }));
}

function fulfillmentTasks(data: WorkspaceData): DataAssetRemediationTask[] {
  return data.plans
    .filter((plan: FulfillmentPlan) => plan.status === "draft" || plan.status === "pending_confirmation")
    .slice(0, 4)
    .map((plan) => ({
      id: `fulfillment:${plan.id}`,
      assetKey: "fulfillment" as const,
      priority: plan.riskLevel === "high" ? "critical" as const : "high" as const,
      title: `确认履约方案：${plan.title}`,
      detail: "确认方案后才能形成可复盘的履约资产和外部跳转依据。",
      section: "fulfillment" as const,
      cta: "确认方案",
      evidence: `${plan.items.length} 项 · ${plan.budgetCny} 元`,
    }));
}

export function buildDataAssetRemediationTasks(
  data: WorkspaceData,
  limit = 6
): DataAssetRemediationTask[] {
  const priorityWeight: Record<DataAssetRemediationPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
  };

  return [
    ...memoryTasks(data),
    ...scheduleTasks(data),
    ...fulfillmentTasks(data),
    ...financeTasks(data),
    ...relationshipTasks(data),
    ...complianceTasks(data),
  ]
    .sort((left, right) => {
      const byPriority = priorityWeight[left.priority] - priorityWeight[right.priority];
      if (byPriority !== 0) return byPriority;
      return left.title.localeCompare(right.title, "zh-CN");
    })
    .slice(0, limit);
}
