import { isRecurringBillLinkedToEvent } from "./data-asset-links";
import type { CalendarEvent, Contact, FulfillmentPlan, Transaction, WorkspaceData } from "./types";

export type DataAssetLedgerStatus = "linked" | "needs_action" | "blocked";

export type DataAssetLedgerEntry = {
  id: string;
  assetKey: "relationship" | "schedule" | "finance" | "memory" | "compliance" | "fulfillment";
  status: DataAssetLedgerStatus;
  title: string;
  detail: string;
  evidence: string;
  section: "dashboard" | "contacts" | "calendar" | "fulfillment" | "finance" | "ops" | "privacy";
  cta: string;
};

function riskyContact(contact: Contact) {
  return /公职|国企|高管|客户|合作|商务/.test([contact.relation, ...contact.labels].join(" "));
}

function contactName(data: WorkspaceData, contactId: string | undefined) {
  return data.contacts.find((contact) => contact.id === contactId)?.name;
}

function planStatus(plan: FulfillmentPlan): DataAssetLedgerStatus {
  if (plan.status === "confirmed" || plan.status === "bookmarked") return "linked";
  if (plan.riskLevel === "high") return "blocked";
  return "needs_action";
}

function transactionStatus(transaction: Transaction): DataAssetLedgerStatus {
  return transaction.contactId || transaction.source !== "manual" ? "linked" : "needs_action";
}

function eventBillDetail(data: WorkspaceData, event: CalendarEvent) {
  const bill = data.recurringBills.find((item) => isRecurringBillLinkedToEvent(event, item));
  return bill ? `已关联周期账单 ${bill.title}` : undefined;
}

function eventLedgerEntry(data: WorkspaceData, event: CalendarEvent): DataAssetLedgerEntry {
  const contact = contactName(data, event.contactId);
  const billDetail = eventBillDetail(data, event);
  const linked = Boolean(contact || billDetail);
  const status = linked ? "linked" : event.reminderLevel === "level_1" ? "blocked" : "needs_action";

  return {
    id: `schedule:${event.id}`,
    assetKey: "schedule",
    status,
    title: `日程：${event.title}`,
    detail: contact ? `已关联联系人 ${contact}` : billDetail ?? "待关联联系人或周期账单",
    evidence: `${event.date} · ${event.reminderLevel}`,
    section: event.source === "bill" ? "finance" : "calendar",
    cta: linked ? "查看日程" : event.source === "bill" ? "关联账单" : "关联联系人",
  };
}

export function buildDataAssetLedger(data: WorkspaceData, limit = 12): DataAssetLedgerEntry[] {
  const relationshipEntries = data.contacts.map<DataAssetLedgerEntry>((contact) => {
    const healthy = contact.preferences.length >= 2 && Boolean(contact.compliance.policyNote);

    return {
      id: `relationship:${contact.id}`,
      assetKey: "relationship",
      status: healthy ? "linked" : "needs_action",
      title: `画像：${contact.name}`,
      detail: `${contact.preferences.length} 条偏好 · ${contact.compliance.policyNote ? "合规已绑定" : "缺合规规则"}`,
      evidence: contact.relation,
      section: "contacts",
      cta: healthy ? "查看画像" : "补齐画像",
    };
  });

  const scheduleEntries = data.events.map((event) => eventLedgerEntry(data, event));

  const financeEntries = data.transactions.map<DataAssetLedgerEntry>((transaction) => {
    const contact = contactName(data, transaction.contactId);
    const linked = transactionStatus(transaction) === "linked";

    return {
      id: `finance:${transaction.id}`,
      assetKey: "finance",
      status: linked ? "linked" : "needs_action",
      title: `账单：${transaction.title}`,
      detail: contact ? `已关联联系人 ${contact}` : linked ? `已由 ${transaction.source} 入库` : "手动交易待关联关系、差旅或账单来源",
      evidence: `${transaction.category} · ${transaction.amountCny} 元`,
      section: "finance",
      cta: linked ? "查看账单" : "关联交易",
    };
  });

  const memoryEntries = data.aiMemories.map<DataAssetLedgerEntry>((memory) => {
    const status: DataAssetLedgerStatus =
      memory.reviewStatus === "stale" ? "blocked" : memory.reviewStatus === "review_required" ? "needs_action" : "linked";

    return {
      id: `memory:${memory.id}`,
      assetKey: "memory",
      status,
      title: "AI 记忆",
      detail: `${contactName(data, memory.contactId) ?? "未绑定联系人"} · ${memory.content}`,
      evidence: `置信度 ${Math.round(memory.confidence * 100)}%`,
      section: "contacts",
      cta: status === "linked" ? "查看记忆" : "复核记忆",
    };
  });

  const complianceEntries = data.contacts
    .filter(riskyContact)
    .map<DataAssetLedgerEntry>((contact) => ({
      id: `compliance:${contact.id}`,
      assetKey: "compliance",
      status: contact.compliance.policyNote ? "linked" : "blocked",
      title: `合规：${contact.name}`,
      detail: contact.compliance.policyNote || "缺少礼品和宴请限额",
      evidence: contact.labels.join(" / "),
      section: "contacts",
      cta: contact.compliance.policyNote ? "查看规则" : "补齐规则",
    }));

  const fulfillmentEntries = data.plans.map<DataAssetLedgerEntry>((plan) => {
    const status = planStatus(plan);

    return {
      id: `fulfillment:${plan.id}`,
      assetKey: "fulfillment",
      status,
      title: `履约：${plan.title}`,
      detail: `${plan.items.length} 个履约项 · ${plan.status === "confirmed" || plan.status === "bookmarked" ? "已沉淀" : "待确认"}`,
      evidence: `${plan.scenario} · ${plan.budgetCny} 元`,
      section: "fulfillment",
      cta: status === "linked" ? "查看方案" : "确认方案",
    };
  });

  const statusWeight: Record<DataAssetLedgerStatus, number> = {
    blocked: 0,
    needs_action: 1,
    linked: 2,
  };

  return [
    ...relationshipEntries,
    ...scheduleEntries,
    ...financeEntries,
    ...memoryEntries,
    ...complianceEntries,
    ...fulfillmentEntries,
  ]
    .sort((left, right) => {
      const byStatus = statusWeight[left.status] - statusWeight[right.status];
      if (byStatus !== 0) return byStatus;
      return left.title.localeCompare(right.title, "zh-CN");
    })
    .slice(0, limit);
}
