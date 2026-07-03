import type { WorkspaceData } from "./types";

export type DataDeletionRequest = {
  requestedAt: string;
  scope: "local" | "cloud";
  status: "queued";
};

export const cloudDeletionTableOrder = [
  "plan_items",
  "plans",
  "reminders",
  "notification_logs",
  "ai_memories",
  "transactions",
  "recurring_bills",
  "capture_items",
  "events",
  "contacts",
  "budgets",
  "privacy_settings",
  "web_push_subscriptions",
  "fulfillment_clicks",
  "fulfillment_order_updates",
  "monthly_reports",
] as const;

export function exportWorkspaceData(data: WorkspaceData, now = new Date()) {
  return JSON.stringify(
    {
      exportedAt: now.toISOString(),
      schema: "liji.workspace.export.v1",
      data,
    },
    null,
    2
  );
}

export function redactWorkspaceData(data: WorkspaceData): WorkspaceData {
  return {
    ...data,
    contacts: data.contacts.map((contact) => ({
      ...contact,
      name: "[NAME]",
      birthday: undefined,
      lastInteractionAt: undefined,
      preferences: contact.preferences.map((preference) => ({
        ...preference,
        label: "[PREFERENCE]",
      })),
    })),
    captures: data.captures.map((capture) => ({
      ...capture,
      rawText: capture.maskedText,
      piiTokens: [],
    })),
    aiMemories: data.aiMemories.map((memory) => ({
      ...memory,
      content: "[AI_MEMORY]",
    })),
    privacy: {
      ...data.privacy,
      notificationPhone: data.privacy.notificationPhone ? "[PHONE]" : undefined,
    },
  };
}

export function createDeletionRequest(scope: "local" | "cloud", now = new Date()): DataDeletionRequest {
  return {
    requestedAt: now.toISOString(),
    scope,
    status: "queued",
  };
}
