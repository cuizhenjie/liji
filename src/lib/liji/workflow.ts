import { createUuid } from "./ids";
import type {
  AiMemory,
  CalendarEvent,
  CaptureItem,
  NotificationLog,
  RecurringBill,
  Transaction,
  WorkspaceData,
} from "./types";

function findCaptureContactId(data: WorkspaceData, capture: CaptureItem) {
  return data.contacts.find(
    (contact) =>
      contact.name === capture.parsed.targetName ||
      contact.relation === capture.parsed.relation
  )?.id;
}

function confirmCaptureStatus(data: WorkspaceData, captureId: string) {
  return data.captures.map((item) =>
    item.id === captureId ? { ...item, status: "confirmed" as const } : item
  );
}

export function applyConfirmedCapture(
  data: WorkspaceData,
  capture: CaptureItem,
  now = new Date("2026-07-01T09:00:00+08:00")
): WorkspaceData {
  const pendingCapture = data.captures.find((item) => item.id === capture.id);
  if (!pendingCapture || pendingCapture.status !== "pending") {
    return data;
  }

  const contactId = findCaptureContactId(data, pendingCapture);
  const base = {
    ...data,
    captures: confirmCaptureStatus(data, pendingCapture.id),
  };

  if (
    pendingCapture.parsed.intent === "event" ||
    pendingCapture.parsed.intent === "travel"
  ) {
    const event: CalendarEvent = {
      id: createUuid(),
      title: pendingCapture.parsed.title,
      date: pendingCapture.parsed.date ?? "2026-07-10",
      endDate: pendingCapture.parsed.endDate,
      contactId,
      location: pendingCapture.parsed.location,
      calendarType: "solar",
      rrule: pendingCapture.parsed.frequency,
      reminderLevel: pendingCapture.parsed.reminderLevel,
      status: "scheduled",
      budgetCny: pendingCapture.parsed.budgetCny,
      source: pendingCapture.parsed.intent === "travel" ? "travel" : "ai",
    };

    return { ...base, events: [event, ...base.events] };
  }

  if (pendingCapture.parsed.intent === "transaction") {
    const transaction: Transaction = {
      id: createUuid(),
      title: pendingCapture.parsed.title,
      amountCny: pendingCapture.parsed.amountCny ?? 0,
      category: "daily",
      occurredAt: pendingCapture.parsed.date ?? "2026-07-01",
      contactId,
      source: "ai",
    };

    return { ...base, transactions: [transaction, ...base.transactions] };
  }

  if (pendingCapture.parsed.intent === "bill") {
    const bill: RecurringBill = {
      id: createUuid(),
      title: pendingCapture.parsed.title,
      amountCny: pendingCapture.parsed.amountCny ?? 0,
      dueDay: Number(pendingCapture.parsed.date?.slice(-2) ?? 1),
      accountLabel: "待关联扣款账户",
      reminderLevel: pendingCapture.parsed.reminderLevel,
      enabled: true,
    };

    return { ...base, recurringBills: [bill, ...base.recurringBills] };
  }

  const memory: AiMemory = {
    id: createUuid(),
    contactId,
    content: pendingCapture.rawText,
    source: "ai",
    confidence: pendingCapture.parsed.confidence,
    correctedAt: now.toISOString(),
  };

  return { ...base, aiMemories: [memory, ...base.aiMemories] };
}

export function applyConfirmedCaptures(
  data: WorkspaceData,
  captures: CaptureItem[],
  now = new Date("2026-07-01T09:00:00+08:00")
): WorkspaceData {
  return captures.reduce(
    (current, capture) => applyConfirmedCapture(current, capture, now),
    data
  );
}

export function rejectCapture(data: WorkspaceData, captureId: string): WorkspaceData {
  return {
    ...data,
    captures: data.captures.map((item) =>
      item.id === captureId ? { ...item, status: "rejected" } : item
    ),
  };
}

export function archiveCapture(data: WorkspaceData, captureId: string): WorkspaceData {
  return {
    ...data,
    captures: data.captures.map((item) =>
      item.id === captureId ? { ...item, status: "archived" } : item
    ),
  };
}

export function archiveCaptures(data: WorkspaceData, captureIds: string[]): WorkspaceData {
  const ids = new Set(captureIds);

  return {
    ...data,
    captures: data.captures.map((item) =>
      ids.has(item.id) ? { ...item, status: "archived" } : item
    ),
  };
}

export function setPlanStatus(
  data: WorkspaceData,
  planId: string,
  status: "confirmed" | "bookmarked"
): WorkspaceData {
  return {
    ...data,
    plans: data.plans.map((plan) =>
      plan.id === planId ? { ...plan, status } : plan
    ),
  };
}

export function acknowledgeEvent(
  data: WorkspaceData,
  eventId: string,
  now = new Date("2026-07-01T09:00:00+08:00")
): WorkspaceData {
  const event = data.events.find((item) => item.id === eventId);
  const acknowledgedAt = now.toISOString();
  const logs = data.notificationLogs.map((log) =>
    log.eventId === eventId
      ? { ...log, status: "confirmed" as const, acknowledgedAt }
      : log
  );
  const hasLog = logs.some((log) => log.eventId === eventId);
  const notificationLog: NotificationLog | null =
    event && !hasLog
      ? {
          id: createUuid(),
          eventId,
          title: event.title,
          channel: "push",
          status: "confirmed",
          level: event.reminderLevel,
          sentAt: acknowledgedAt,
          acknowledgedAt,
          providerMessage: "用户已手动确认，停止升级。",
        }
      : null;

  return {
    ...data,
    events: data.events.map((item) =>
      item.id === eventId ? { ...item, status: "confirmed" } : item
    ),
    notificationLogs: notificationLog ? [notificationLog, ...logs] : logs,
  };
}

export function acknowledgeNotificationLog(
  data: WorkspaceData,
  logId: string,
  now = new Date("2026-07-01T09:00:00+08:00")
): WorkspaceData {
  const acknowledgedAt = now.toISOString();

  return {
    ...data,
    notificationLogs: data.notificationLogs.map((log) =>
      log.id === logId ? { ...log, status: "confirmed", acknowledgedAt } : log
    ),
  };
}
