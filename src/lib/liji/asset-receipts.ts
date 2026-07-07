import type { CalendarEvent, FulfillmentPlan, Transaction, WorkspaceData } from "./types";

export type AssetReceiptKind = "relationship" | "schedule" | "fulfillment" | "finance" | "memory";

export type AssetReceipt = {
  id: string;
  kind: AssetReceiptKind;
  title: string;
  detail: string;
  evidence: string;
  timestamp: string;
  section: "dashboard" | "contacts" | "calendar" | "fulfillment" | "finance" | "ops" | "privacy";
  cta: string;
};

function dateTimeFromDate(date: string, hour = "09:00:00") {
  return date.includes("T") ? date : `${date}T${hour}+08:00`;
}

function contactName(data: WorkspaceData, contactId: string | undefined) {
  return data.contacts.find((contact) => contact.id === contactId)?.name;
}

function latestAcknowledgement(data: WorkspaceData, eventId: string) {
  return data.notificationLogs
    .filter((log) => log.eventId === eventId && log.status === "confirmed")
    .sort((left, right) =>
      Date.parse(right.acknowledgedAt ?? right.sentAt) - Date.parse(left.acknowledgedAt ?? left.sentAt)
    )[0];
}

function eventReceipt(data: WorkspaceData, event: CalendarEvent): AssetReceipt | undefined {
  if (event.status !== "confirmed" && event.status !== "done") return undefined;

  const log = latestAcknowledgement(data, event.id);
  const isBill = event.source === "bill";
  const contact = contactName(data, event.contactId);
  const completionEvidence =
    log?.providerMessage && /停止|确认|升级/.test(log.providerMessage)
      ? log.providerMessage
      : `${event.date} · ${event.reminderLevel} · 已确认，停止升级`;

  return {
    id: `event:${event.id}`,
    kind: isBill ? "finance" : "schedule",
    title: `${isBill ? "账单资产" : "提醒资产"}：${event.title}`,
    detail: contact
      ? `已绑定 ${contact}，提醒确认后可复用到关系复盘。`
      : isBill
        ? "账单提醒已确认，可复用到下月预留预算。"
        : "提醒已确认，可复用到日程和履约复盘。",
    evidence: completionEvidence,
    timestamp: log?.acknowledgedAt ?? log?.sentAt ?? dateTimeFromDate(event.date),
    section: isBill ? "finance" : "calendar",
    cta: isBill ? "查看账单" : "查看日程",
  };
}

function planReceipt(plan: FulfillmentPlan): AssetReceipt | undefined {
  if (plan.status !== "confirmed" && plan.status !== "bookmarked") return undefined;

  return {
    id: `plan:${plan.id}`,
    kind: "fulfillment",
    title: `履约资产：${plan.title}`,
    detail: `已沉淀 ${plan.items.length} 个履约项，可用于预算复盘和下次推荐。`,
    evidence: `${plan.scenario} · ${plan.budgetCny} 元 · ${plan.status === "confirmed" ? "已确认" : "已收藏"}`,
    timestamp: plan.createdAt,
    section: "fulfillment",
    cta: "查看方案",
  };
}

function transactionReceipt(transaction: Transaction): AssetReceipt {
  return {
    id: `transaction:${transaction.id}`,
    kind: "finance",
    title: `账单资产：${transaction.title}`,
    detail: transaction.contactId
      ? "交易已绑定关系对象，可进入人情往来复盘。"
      : transaction.source === "manual"
        ? "手动流水已入账，建议继续关联关系或差旅来源。"
        : "流水已通过外部来源入账，可用于月度复盘。",
    evidence: `${transaction.category} · ${transaction.amountCny} 元 · ${transaction.source}`,
    timestamp: dateTimeFromDate(transaction.occurredAt, "12:00:00"),
    section: "finance",
    cta: "查看账单",
  };
}

function memoryReceipts(data: WorkspaceData): AssetReceipt[] {
  return data.aiMemories
    .filter((memory) => memory.reviewStatus === "healthy" || memory.reviewStatus === undefined)
    .map((memory) => ({
      id: `memory:${memory.id}`,
      kind: "memory" as const,
      title: `记忆资产：${contactName(data, memory.contactId) ?? "未绑定联系人"}`,
      detail: memory.content,
      evidence: `置信度 ${Math.round(memory.confidence * 100)}% · 已可用于推荐`,
      timestamp: memory.reviewedAt ?? memory.correctedAt ?? memory.createdAt ?? new Date(0).toISOString(),
      section: "contacts" as const,
      cta: "查看记忆",
    }));
}

function relationshipReceipts(data: WorkspaceData): AssetReceipt[] {
  return data.contacts
    .filter((contact) => contact.preferences.length >= 2 && Boolean(contact.compliance.policyNote))
    .map((contact) => ({
      id: `relationship:${contact.id}`,
      kind: "relationship" as const,
      title: `画像资产：${contact.name}`,
      detail: `${contact.preferences.length} 条偏好，${contact.compliance.riskTags.length > 0 ? "合规边界已绑定" : "关系边界已确认"}。`,
      evidence: contact.labels.join(" / ") || contact.relation,
      timestamp: contact.lastInteractionAt ?? new Date(0).toISOString(),
      section: "contacts" as const,
      cta: "查看画像",
    }));
}

export function buildAssetReceipts(data: WorkspaceData, limit = 6): AssetReceipt[] {
  return [
    ...data.events.flatMap((event) => {
      const receipt = eventReceipt(data, event);
      return receipt ? [receipt] : [];
    }),
    ...data.plans.flatMap((plan) => {
      const receipt = planReceipt(plan);
      return receipt ? [receipt] : [];
    }),
    ...data.transactions.map(transactionReceipt),
    ...memoryReceipts(data),
    ...relationshipReceipts(data),
  ]
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, limit);
}
