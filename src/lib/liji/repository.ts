import type { SupabaseClient } from "@supabase/supabase-js";

import { generateMonthlyInsight, previousMonthPeriod } from "./insights";
import { demoWorkspace } from "./sample-data";
import {
  mapAiMemory,
  mapBudget,
  mapCapture,
  mapContact,
  mapEvent,
  mapNotificationLog,
  mapPlan,
  mapPrivacy,
  mapRecurringBill,
  mapTransaction,
} from "./supabase-mappers";
import type {
  AiMemory,
  Budget,
  CalendarEvent,
  CaptureItem,
  Contact,
  FulfillmentPlan,
  NotificationLog,
  PlanItem,
  PrivacySettings,
  RecurringBill,
  Transaction,
  WorkspaceData,
} from "./types";

type SyncSummary = {
  tables: Record<string, number>;
};

export type WorkspaceRepository = {
  getWorkspace(userId: string): Promise<WorkspaceData>;
  upsertContact(userId: string, contact: Contact): Promise<Contact>;
  updatePrivacy(userId: string, privacy: PrivacySettings): Promise<PrivacySettings>;
  syncWorkspace(userId: string, workspace: WorkspaceData): Promise<SyncSummary>;
};

function compactRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined)
  );
}

function contactRow(userId: string, contact: Contact) {
  return compactRow({
    id: contact.id,
    user_id: userId,
    name: contact.name,
    relation: contact.relation,
    labels: contact.labels,
    birthday: contact.birthday,
    calendar_type: contact.calendarType,
    preferences: contact.preferences,
    compliance: contact.compliance,
    ai_memory_health: contact.aiMemoryHealth,
    last_interaction_at: contact.lastInteractionAt,
  });
}

function eventRow(userId: string, event: CalendarEvent) {
  return compactRow({
    id: event.id,
    user_id: userId,
    contact_id: event.contactId,
    title: event.title,
    event_date: event.date,
    end_date: event.endDate,
    location: event.location,
    calendar_type: event.calendarType,
    rrule: event.rrule,
    reminder_level: event.reminderLevel,
    status: event.status,
    budget_cny: event.budgetCny,
    source: event.source,
  });
}

function budgetRow(userId: string, budget: Budget) {
  return compactRow({
    id: budget.id,
    user_id: userId,
    label: budget.label,
    category: budget.category,
    total_cny: budget.totalCny,
    spent_cny: budget.spentCny,
    period: budget.period,
  });
}

function captureRow(userId: string, capture: CaptureItem) {
  return compactRow({
    id: capture.id,
    user_id: userId,
    raw_text: capture.rawText,
    masked_text: capture.maskedText,
    source_type: capture.sourceType,
    status: capture.status,
    parsed: capture.parsed,
    pii_tokens: capture.piiTokens,
    created_at: capture.createdAt,
  });
}

function transactionRow(userId: string, transaction: Transaction) {
  return compactRow({
    id: transaction.id,
    user_id: userId,
    contact_id: transaction.contactId,
    title: transaction.title,
    amount_cny: transaction.amountCny,
    category: transaction.category,
    occurred_at: transaction.occurredAt,
    source: transaction.source,
  });
}

function recurringBillRow(userId: string, bill: RecurringBill) {
  return compactRow({
    id: bill.id,
    user_id: userId,
    title: bill.title,
    amount_cny: bill.amountCny,
    due_day: bill.dueDay,
    account_label: bill.accountLabel,
    reminder_level: bill.reminderLevel,
    enabled: bill.enabled,
  });
}

function planRow(userId: string, plan: FulfillmentPlan) {
  return compactRow({
    id: plan.id,
    user_id: userId,
    contact_id: plan.contactId,
    event_id: plan.eventId,
    scenario: plan.scenario,
    title: plan.title,
    budget_cny: plan.budgetCny,
    status: plan.status,
    risk_level: plan.riskLevel,
    warnings: plan.warnings,
    created_at: plan.createdAt,
  });
}

function planItemRow(userId: string, planId: string, item: PlanItem) {
  return compactRow({
    id: item.id,
    user_id: userId,
    plan_id: planId,
    title: item.title,
    category: item.category,
    amount_cny: item.amountCny,
    rationale: item.rationale,
    provider: item.provider,
    url: item.url,
  });
}

function notificationLogRow(userId: string, log: NotificationLog) {
  return compactRow({
    id: log.id,
    user_id: userId,
    event_id: log.eventId,
    title: log.title,
    channel: log.channel,
    status: log.status,
    level: log.level,
    sent_at: log.sentAt,
    acknowledged_at: log.acknowledgedAt,
    provider_message: log.providerMessage,
  });
}

function aiMemoryRow(userId: string, memory: AiMemory) {
  return compactRow({
    id: memory.id,
    user_id: userId,
    contact_id: memory.contactId,
    content: memory.content,
    source: memory.source,
    confidence: memory.confidence,
    embedding: memory.embedding,
    corrected_at: memory.correctedAt,
  });
}

export class DemoWorkspaceRepository implements WorkspaceRepository {
  async getWorkspace(userId: string) {
    void userId;
    return demoWorkspace;
  }

  async upsertContact(_userId: string, contact: Contact) {
    return contact;
  }

  async updatePrivacy(_userId: string, privacy: PrivacySettings) {
    return privacy;
  }

  async syncWorkspace(_userId: string, workspace: WorkspaceData) {
    return {
      tables: {
        contacts: workspace.contacts.length,
        events: workspace.events.length,
        budgets: workspace.budgets.length,
        plans: workspace.plans.length,
        plan_items: workspace.plans.reduce((sum, plan) => sum + plan.items.length, 0),
        capture_items: workspace.captures.length,
        transactions: workspace.transactions.length,
        recurring_bills: workspace.recurringBills.length,
        notification_logs: workspace.notificationLogs.length,
        ai_memories: workspace.aiMemories.length,
        privacy_settings: 1,
      },
    };
  }
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async upsertRows(table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      return;
    }

    const { error } = await this.client.from(table).upsert(rows);
    if (error) {
      throw new Error(`${table}: ${error.message ?? "upsert failed"}`);
    }
  }

  async getWorkspace(userId: string): Promise<WorkspaceData> {
    const [
      contacts,
      events,
      budgets,
      plans,
      captures,
      transactions,
      recurringBills,
      notificationLogs,
      aiMemories,
      privacy,
    ] = await Promise.all([
      this.client.from("contacts").select("*").eq("user_id", userId),
      this.client.from("events").select("*").eq("user_id", userId),
      this.client.from("budgets").select("*").eq("user_id", userId),
      this.client.from("plans").select("*, plan_items(*)").eq("user_id", userId),
      this.client.from("capture_items").select("*").eq("user_id", userId),
      this.client.from("transactions").select("*").eq("user_id", userId),
      this.client.from("recurring_bills").select("*").eq("user_id", userId),
      this.client.from("notification_logs").select("*").eq("user_id", userId),
      this.client.from("ai_memories").select("*").eq("user_id", userId),
      this.client.from("privacy_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const firstError = [
      contacts,
      events,
      budgets,
      plans,
      captures,
      transactions,
      recurringBills,
      notificationLogs,
      aiMemories,
      privacy,
    ].find((result) => result.error)?.error;

    if (firstError) {
      throw firstError;
    }

    const mappedEvents = (events.data ?? []).map(mapEvent);
    const mappedTransactions = (transactions.data ?? []).map(mapTransaction);
    const mappedRecurringBills = (recurringBills.data ?? []).map(mapRecurringBill);

    return {
      ...demoWorkspace,
      contacts: (contacts.data ?? []).map(mapContact),
      events: mappedEvents,
      budgets: (budgets.data ?? []).map(mapBudget),
      plans: (plans.data ?? []).map(mapPlan),
      captures: (captures.data ?? []).map(mapCapture),
      transactions: mappedTransactions,
      recurringBills: mappedRecurringBills,
      notificationLogs: (notificationLogs.data ?? []).map(mapNotificationLog),
      aiMemories: (aiMemories.data ?? []).map(mapAiMemory),
      privacy: mapPrivacy(privacy.data),
      insight: generateMonthlyInsight({
        period: previousMonthPeriod(),
        transactions: mappedTransactions,
        recurringBills: mappedRecurringBills,
        nextMonthEvents: mappedEvents,
      }),
    };
  }

  async upsertContact(userId: string, contact: Contact) {
    const { error } = await this.client.from("contacts").upsert(contactRow(userId, contact));

    if (error) {
      throw error;
    }

    return contact;
  }

  async updatePrivacy(userId: string, privacy: PrivacySettings) {
    const { error } = await this.client.from("privacy_settings").upsert({
      user_id: userId,
      pii_masking: privacy.piiMasking,
      cloud_model_enabled: privacy.cloudModelEnabled,
      web_push_enabled: privacy.webPushEnabled,
      sms_enabled: privacy.smsEnabled,
      voice_call_enabled: privacy.voiceCallEnabled,
      third_party_links_enabled: privacy.thirdPartyLinksEnabled,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return privacy;
  }

  async syncWorkspace(userId: string, workspace: WorkspaceData): Promise<SyncSummary> {
    const planItems = workspace.plans.flatMap((plan) =>
      plan.items.map((item) => planItemRow(userId, plan.id, item))
    );
    await this.upsertRows("contacts", workspace.contacts.map((contact) => contactRow(userId, contact)));
    await this.upsertRows("events", workspace.events.map((event) => eventRow(userId, event)));
    await this.upsertRows("budgets", workspace.budgets.map((budget) => budgetRow(userId, budget)));
    await this.upsertRows("capture_items", workspace.captures.map((capture) => captureRow(userId, capture)));
    await this.upsertRows("transactions", workspace.transactions.map((transaction) => transactionRow(userId, transaction)));
    await this.upsertRows("recurring_bills", workspace.recurringBills.map((bill) => recurringBillRow(userId, bill)));
    await this.upsertRows("plans", workspace.plans.map((plan) => planRow(userId, plan)));
    await this.upsertRows("plan_items", planItems);
    await this.upsertRows("notification_logs", workspace.notificationLogs.map((log) => notificationLogRow(userId, log)));
    await this.upsertRows("ai_memories", workspace.aiMemories.map((memory) => aiMemoryRow(userId, memory)));

    await this.updatePrivacy(userId, workspace.privacy);

    return {
      tables: {
        contacts: workspace.contacts.length,
        events: workspace.events.length,
        budgets: workspace.budgets.length,
        plans: workspace.plans.length,
        plan_items: planItems.length,
        capture_items: workspace.captures.length,
        transactions: workspace.transactions.length,
        recurring_bills: workspace.recurringBills.length,
        notification_logs: workspace.notificationLogs.length,
        ai_memories: workspace.aiMemories.length,
        privacy_settings: 1,
      },
    };
  }
}
