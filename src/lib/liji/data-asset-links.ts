import type { CalendarEvent, RecurringBill, WorkspaceData } from "./types";

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function dayOfMonth(date: string) {
  const day = Number(date.slice(-2));
  return Number.isFinite(day) ? day : undefined;
}

export function isRecurringBillLinkedToEvent(event: CalendarEvent, bill: RecurringBill) {
  if (event.source !== "bill" || !bill.enabled) return false;

  const eventTitle = normalizeText(event.title);
  const billTitle = normalizeText(bill.title);
  const titleMatches = eventTitle.includes(billTitle) || billTitle.includes(eventTitle);
  const dueDayMatches = dayOfMonth(event.date) === bill.dueDay;
  const amountMatches = event.budgetCny === undefined || Math.abs(event.budgetCny - bill.amountCny) <= 1;

  return dueDayMatches && amountMatches && titleMatches;
}

export function isEventLinkedToDataAsset(data: WorkspaceData, event: CalendarEvent) {
  if (event.contactId) return true;
  return data.recurringBills.some((bill) => isRecurringBillLinkedToEvent(event, bill));
}
