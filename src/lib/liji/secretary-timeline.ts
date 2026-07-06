import type {
  CalendarEvent,
  CaptureItem,
  FulfillmentPlan,
  NotificationLog,
  Transaction,
  WorkspaceData,
} from "./types";

export type SecretaryTimelineSection =
  | "dashboard"
  | "contacts"
  | "calendar"
  | "fulfillment"
  | "finance"
  | "ops"
  | "privacy";

export type SecretaryTimelineStatus = "blocked" | "action" | "done" | "info";

export type SecretaryTimelineItem = {
  id: string;
  category: "capture" | "reminder" | "fulfillment" | "finance" | "notification" | "memory";
  status: SecretaryTimelineStatus;
  title: string;
  detail: string;
  timestamp: string;
  section: SecretaryTimelineSection;
  cta: string;
};

function dateTimeFromDate(date: string, hour = "09:00:00") {
  return date.includes("T") ? date : `${date}T${hour}+08:00`;
}

function statusWeight(status: SecretaryTimelineStatus) {
  if (status === "blocked") return 0;
  if (status === "action") return 1;
  if (status === "info") return 2;
  return 3;
}

function captureTimelineItem(capture: CaptureItem): SecretaryTimelineItem {
  return {
    id: `capture:${capture.id}`,
    category: "capture",
    status: capture.parsed.confidence < 0.65 ? "blocked" : "action",
    title: `待确认采集：${capture.parsed.title}`,
    detail: `${capture.parsed.intent} · 置信度 ${Math.round(capture.parsed.confidence * 100)}%`,
    timestamp: capture.createdAt,
    section: "dashboard",
    cta: "处理确认",
  };
}

function eventTimelineItem(event: CalendarEvent): SecretaryTimelineItem {
  const needsAction = event.status !== "confirmed" && event.status !== "done";

  return {
    id: `event:${event.id}`,
    category: "reminder",
    status: needsAction ? event.reminderLevel === "level_1" ? "blocked" : "action" : "done",
    title: needsAction ? `待确认提醒：${event.title}` : `已确认提醒：${event.title}`,
    detail: `${event.date} · ${event.reminderLevel}${event.location ? ` · ${event.location}` : ""}`,
    timestamp: dateTimeFromDate(event.date),
    section: "calendar",
    cta: needsAction ? "确认提醒" : "查看日历",
  };
}

function planTimelineItem(plan: FulfillmentPlan): SecretaryTimelineItem {
  const needsAction = plan.status === "draft" || plan.status === "pending_confirmation";

  return {
    id: `plan:${plan.id}`,
    category: "fulfillment",
    status: needsAction ? plan.riskLevel === "high" ? "blocked" : "action" : "done",
    title: needsAction ? `待确认方案：${plan.title}` : `已沉淀方案：${plan.title}`,
    detail: `${plan.scenario} · ${plan.items.length} 个履约项 · 预算 ${plan.budgetCny} 元`,
    timestamp: plan.createdAt,
    section: "fulfillment",
    cta: needsAction ? "确认方案" : "查看方案",
  };
}

function transactionTimelineItem(transaction: Transaction): SecretaryTimelineItem {
  return {
    id: `transaction:${transaction.id}`,
    category: "finance",
    status: "info",
    title: `账单入账：${transaction.title}`,
    detail: `${transaction.category} · ${transaction.amountCny} 元 · ${transaction.source}`,
    timestamp: dateTimeFromDate(transaction.occurredAt, "12:00:00"),
    section: "finance",
    cta: "查看账单",
  };
}

function notificationTimelineItem(log: NotificationLog): SecretaryTimelineItem {
  const failed = log.status === "failed";
  const needsAction = log.status === "queued" || log.status === "sent" || log.status === "escalated";

  return {
    id: `notification:${log.id}`,
    category: "notification",
    status: failed ? "blocked" : needsAction ? "action" : "done",
    title: `${failed ? "投递异常" : needsAction ? "待确认投递" : "投递闭环"}：${log.title}`,
    detail: `${log.channel} · ${log.level} · ${log.providerMessage}`,
    timestamp: log.sentAt,
    section: failed ? "ops" : "calendar",
    cta: failed ? "处理告警" : needsAction ? "确认投递" : "查看日志",
  };
}

export function buildSecretaryTimeline(data: WorkspaceData, limit = 8): SecretaryTimelineItem[] {
  const pendingCaptures = data.captures
    .filter((capture) => capture.status === "pending")
    .map(captureTimelineItem);
  const eventItems = data.events.map(eventTimelineItem);
  const planItems = data.plans.map(planTimelineItem);
  const transactionItems = data.transactions.slice(0, 8).map(transactionTimelineItem);
  const notificationItems = data.notificationLogs.map(notificationTimelineItem);
  const memoryItems = data.aiMemories
    .filter((memory) => memory.reviewStatus === "review_required" || memory.reviewStatus === "stale")
    .map<SecretaryTimelineItem>((memory) => ({
      id: `memory:${memory.id}`,
      category: "memory",
      status: memory.reviewStatus === "stale" ? "blocked" : "action",
      title: "AI 记忆待复核",
      detail: memory.content,
      timestamp: memory.correctedAt ?? memory.createdAt ?? new Date(0).toISOString(),
      section: "contacts",
      cta: "纠偏记忆",
    }));

  return [
    ...pendingCaptures,
    ...eventItems,
    ...planItems,
    ...transactionItems,
    ...notificationItems,
    ...memoryItems,
  ]
    .sort((left, right) => {
      const byStatus = statusWeight(left.status) - statusWeight(right.status);
      if (byStatus !== 0) return byStatus;
      return Date.parse(right.timestamp) - Date.parse(left.timestamp);
    })
    .slice(0, limit);
}
