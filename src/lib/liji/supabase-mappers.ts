import {
  parsedInputSchema,
  type AiMemory,
  type Budget,
  type CalendarEvent,
  type CaptureItem,
  type Contact,
  type FulfillmentPlan,
  type NotificationLog,
  type PlanItem,
  type PrivacySettings,
  type RecurringBill,
  type Transaction,
} from "./types";

type DbRow = Record<string, unknown>;

function text(row: DbRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function optionalText(row: DbRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function numberValue(row: DbRow, key: string, fallback = 0) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return fallback;
}

function optionalNumber(row: DbRow, key: string) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return undefined;
}

function booleanValue(row: DbRow, key: string, fallback = false) {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}

function stringArray(row: DbRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberArray(row: DbRow, key: string) {
  const value = row[key];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "number" ? item : typeof item === "string" ? Number(item) : Number.NaN))
      .filter((item) => Number.isFinite(item));
  }

  if (typeof value === "string") {
    return value
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }

  return [];
}

function jsonArray<T>(row: DbRow, key: string, fallback: T[] = []) {
  const value = row[key];
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function jsonObject<T>(row: DbRow, key: string, fallback: T) {
  const value = row[key];
  return typeof value === "object" && value !== null ? (value as T) : fallback;
}

function calendarType(value: string) {
  return value === "lunar" ? "lunar" : "solar";
}

function reminderLevel(value: string) {
  if (value === "level_1" || value === "level_2" || value === "level_3") return value;
  return "level_3";
}

function planScenario(value: string) {
  return value === "travel" ? "travel" : "festival";
}

function planStatus(value: string) {
  if (value === "draft" || value === "pending_confirmation" || value === "confirmed" || value === "bookmarked") {
    return value;
  }
  return "pending_confirmation";
}

function eventStatus(value: string) {
  if (value === "scheduled" || value === "confirmed" || value === "done" || value === "missed") {
    return value;
  }
  return "scheduled";
}

function eventSource(value: string) {
  if (value === "manual" || value === "ai" || value === "bill" || value === "travel") {
    return value;
  }
  return "manual";
}

function transactionCategory(value: string) {
  if (value === "fixed" || value === "relationship" || value === "travel" || value === "daily") {
    return value;
  }
  return "daily";
}

function transactionSource(value: string) {
  if (value === "manual" || value === "ai" || value === "sms" || value === "receipt") {
    return value;
  }
  return "manual";
}

function captureSource(value: string) {
  if (value === "text" || value === "voice" || value === "screenshot" || value === "chat" || value === "bill") {
    return value;
  }
  return "text";
}

function planRisk(value: string) {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "low";
}

function planItemCategory(value: string) {
  if (
    value === "gift" ||
    value === "cake" ||
    value === "dining" ||
    value === "transport" ||
    value === "hotel" ||
    value === "taxi" ||
    value === "buffer"
  ) {
    return value;
  }
  return "buffer";
}

function provider(value: string) {
  if (value === "京东" || value === "淘宝" || value === "美团" || value === "携程" || value === "同程") {
    return value;
  }
  return "内部";
}

function notificationChannel(value: string) {
  if (value === "push" || value === "sms" || value === "voice") {
    return value;
  }
  return "push";
}

function notificationStatus(value: string) {
  if (value === "queued" || value === "sent" || value === "confirmed" || value === "escalated" || value === "failed") {
    return value;
  }
  return "queued";
}

function notificationProvider(value: string) {
  if (value === "web_push" || value === "aliyun_sms" || value === "aliyun_voice") {
    return value;
  }
  return "mock";
}

function notificationProviderStatus(value: string) {
  if (
    value === "submitted" ||
    value === "pending" ||
    value === "delivered" ||
    value === "failed" ||
    value === "unknown"
  ) {
    return value;
  }
  return "not_applicable";
}

export function mapContact(row: DbRow): Contact {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    relation: text(row, "relation"),
    labels: stringArray(row, "labels"),
    birthday: optionalText(row, "birthday"),
    calendarType: calendarType(text(row, "calendar_type", "solar")),
    preferences: jsonArray(row, "preferences"),
    compliance: jsonObject(row, "compliance", { riskTags: [], policyNote: "未配置合规规则。" }),
    lastInteractionAt: optionalText(row, "last_interaction_at"),
    aiMemoryHealth: numberValue(row, "ai_memory_health", 80),
  };
}

export function mapEvent(row: DbRow): CalendarEvent {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    date: text(row, "event_date"),
    endDate: optionalText(row, "end_date"),
    contactId: optionalText(row, "contact_id"),
    location: optionalText(row, "location"),
    calendarType: calendarType(text(row, "calendar_type", "solar")),
    rrule: optionalText(row, "rrule"),
    reminderLevel: reminderLevel(text(row, "reminder_level", "level_3")),
    status: eventStatus(text(row, "status", "scheduled")),
    budgetCny: optionalNumber(row, "budget_cny"),
    source: eventSource(text(row, "source", "manual")),
  };
}

export function mapBudget(row: DbRow): Budget {
  const category = text(row, "category", "elastic");
  return {
    id: text(row, "id"),
    label: text(row, "label"),
    category: category === "fixed" || category === "relationship" || category === "travel" ? category : "elastic",
    totalCny: numberValue(row, "total_cny"),
    spentCny: numberValue(row, "spent_cny"),
    period: text(row, "period"),
  };
}

export function mapPlanItem(row: DbRow): PlanItem {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    category: planItemCategory(text(row, "category", "buffer")),
    amountCny: numberValue(row, "amount_cny"),
    rationale: text(row, "rationale"),
    provider: provider(text(row, "provider", "内部")),
    url: optionalText(row, "url"),
  };
}

export function mapPlan(row: DbRow): FulfillmentPlan {
  return {
    id: text(row, "id"),
    scenario: planScenario(text(row, "scenario", "festival")),
    title: text(row, "title"),
    contactId: optionalText(row, "contact_id"),
    eventId: optionalText(row, "event_id"),
    budgetCny: numberValue(row, "budget_cny"),
    status: planStatus(text(row, "status", "pending_confirmation")),
    riskLevel: planRisk(text(row, "risk_level", "low")),
    warnings: stringArray(row, "warnings"),
    items: jsonArray<DbRow>(row, "plan_items").map(mapPlanItem),
    createdAt: text(row, "created_at"),
  };
}

export function mapCapture(row: DbRow): CaptureItem {
  return {
    id: text(row, "id"),
    rawText: text(row, "raw_text"),
    maskedText: text(row, "masked_text"),
    sourceType: captureSource(text(row, "source_type", "text")),
    status: text(row, "status", "pending") === "confirmed" ? "confirmed" : text(row, "status", "pending") === "rejected" ? "rejected" : text(row, "status", "pending") === "archived" ? "archived" : "pending",
    parsed: parsedInputSchema.parse(jsonObject(row, "parsed", {})),
    piiTokens: jsonArray(row, "pii_tokens"),
    createdAt: text(row, "created_at"),
  };
}

export function mapTransaction(row: DbRow): Transaction {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    amountCny: numberValue(row, "amount_cny"),
    category: transactionCategory(text(row, "category", "daily")),
    occurredAt: text(row, "occurred_at"),
    contactId: optionalText(row, "contact_id"),
    source: transactionSource(text(row, "source", "manual")),
  };
}

export function mapRecurringBill(row: DbRow): RecurringBill {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    amountCny: numberValue(row, "amount_cny"),
    dueDay: numberValue(row, "due_day", 1),
    accountLabel: text(row, "account_label"),
    reminderLevel: reminderLevel(text(row, "reminder_level", "level_2")),
    enabled: booleanValue(row, "enabled", true),
  };
}

export function mapNotificationLog(row: DbRow): NotificationLog {
  return {
    id: text(row, "id"),
    eventId: optionalText(row, "event_id"),
    title: text(row, "title"),
    channel: notificationChannel(text(row, "channel", "push")),
    status: notificationStatus(text(row, "status", "queued")),
    level: reminderLevel(text(row, "level", "level_3")),
    sentAt: text(row, "sent_at"),
    acknowledgedAt: optionalText(row, "acknowledged_at"),
    providerMessage: text(row, "provider_message"),
    provider: notificationProvider(text(row, "provider", "mock")),
    providerRequestId: optionalText(row, "provider_request_id"),
    providerReceiptId: optionalText(row, "provider_receipt_id"),
    providerStatus: notificationProviderStatus(text(row, "provider_status", "not_applicable")),
    receiptCheckedAt: optionalText(row, "receipt_checked_at"),
    rawProviderReceipt: jsonObject(row, "raw_provider_receipt", {}),
  };
}

export function mapAiMemory(row: DbRow): AiMemory {
  const embedding = numberArray(row, "embedding");
  const reviewStatus = text(row, "review_status", "healthy");
  return {
    id: text(row, "id"),
    contactId: optionalText(row, "contact_id"),
    content: text(row, "content"),
    source: text(row, "source", "ai") === "manual" ? "manual" : "ai",
    confidence: numberValue(row, "confidence", 0.5),
    embedding: embedding.length > 0 ? embedding : undefined,
    reviewStatus:
      reviewStatus === "review_required" || reviewStatus === "stale"
        ? reviewStatus
        : "healthy",
    reviewedAt: optionalText(row, "reviewed_at"),
    lastEmbeddedAt: optionalText(row, "last_embedded_at"),
    correctedAt: optionalText(row, "corrected_at"),
    createdAt: optionalText(row, "created_at"),
  };
}

export function mapPrivacy(row: DbRow | null | undefined): PrivacySettings {
  if (!row) {
    return {
      piiMasking: true,
      cloudModelEnabled: false,
      webPushEnabled: true,
      smsEnabled: false,
      voiceCallEnabled: false,
      thirdPartyLinksEnabled: true,
      notificationPhone: undefined,
    };
  }

  return {
    piiMasking: booleanValue(row, "pii_masking", true),
    cloudModelEnabled: booleanValue(row, "cloud_model_enabled", false),
    webPushEnabled: booleanValue(row, "web_push_enabled", true),
    smsEnabled: booleanValue(row, "sms_enabled", false),
    voiceCallEnabled: booleanValue(row, "voice_call_enabled", false),
    thirdPartyLinksEnabled: booleanValue(row, "third_party_links_enabled", true),
    notificationPhone: optionalText(row, "notification_phone"),
  };
}
