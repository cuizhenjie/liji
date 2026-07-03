import { z } from "zod";

export const reminderLevelSchema = z.enum(["level_1", "level_2", "level_3"]);
export const captureStatusSchema = z.enum([
  "pending",
  "confirmed",
  "rejected",
  "archived",
]);
export const parsedIntentSchema = z.enum([
  "event",
  "travel",
  "transaction",
  "memory",
  "bill",
]);
export const planScenarioSchema = z.enum(["festival", "travel"]);

export type ReminderLevel = z.infer<typeof reminderLevelSchema>;
export type CaptureStatus = z.infer<typeof captureStatusSchema>;
export type ParsedIntent = z.infer<typeof parsedIntentSchema>;
export type PlanScenario = z.infer<typeof planScenarioSchema>;

export type CalendarType = "solar" | "lunar";

export type Preference = {
  category: "food" | "gift" | "hobby" | "avoid" | "travel";
  label: string;
  source: "manual" | "ai" | "receipt" | "chat";
  confidence: number;
};

export type ComplianceProfile = {
  riskTags: string[];
  giftLimitCny?: number;
  hospitalityLimitCny?: number;
  policyNote: string;
};

export type Contact = {
  id: string;
  name: string;
  relation: string;
  labels: string[];
  birthday?: string;
  calendarType: CalendarType;
  preferences: Preference[];
  compliance: ComplianceProfile;
  lastInteractionAt?: string;
  aiMemoryHealth: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  contactId?: string;
  location?: string;
  calendarType: CalendarType;
  rrule?: string;
  reminderLevel: ReminderLevel;
  status: "scheduled" | "confirmed" | "done" | "missed";
  budgetCny?: number;
  source: "manual" | "ai" | "bill" | "travel";
};

export type Budget = {
  id: string;
  label: string;
  category: "fixed" | "relationship" | "travel" | "elastic";
  totalCny: number;
  spentCny: number;
  period: string;
};

export type PlanItem = {
  id: string;
  title: string;
  category: "gift" | "cake" | "dining" | "transport" | "hotel" | "taxi" | "buffer";
  amountCny: number;
  rationale: string;
  provider: "京东" | "淘宝" | "美团" | "携程" | "同程" | "内部";
  url?: string;
};

export type FulfillmentPlan = {
  id: string;
  scenario: PlanScenario;
  title: string;
  contactId?: string;
  eventId?: string;
  budgetCny: number;
  status: "draft" | "pending_confirmation" | "confirmed" | "bookmarked";
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
  items: PlanItem[];
  createdAt: string;
};

export const parsedInputSchema = z.object({
  intent: parsedIntentSchema,
  title: z.string().min(1),
  targetName: z.string().optional(),
  relation: z.string().optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  amountCny: z.number().nonnegative().optional(),
  budgetCny: z.number().nonnegative().optional(),
  location: z.string().optional(),
  reminderLevel: reminderLevelSchema.default("level_3"),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type ParsedInput = z.infer<typeof parsedInputSchema>;

export type PiiToken = {
  token: string;
  original: string;
  kind: "name" | "phone" | "email" | "address" | "company";
};

export type PiiMaskResult = {
  maskedText: string;
  tokens: PiiToken[];
};

export type CaptureSource = "text" | "voice" | "screenshot" | "chat" | "bill";

export type CaptureItem = {
  id: string;
  rawText: string;
  maskedText: string;
  sourceType: CaptureSource;
  status: CaptureStatus;
  parsed: ParsedInput;
  piiTokens: PiiToken[];
  createdAt: string;
};

export type Transaction = {
  id: string;
  title: string;
  amountCny: number;
  category: "fixed" | "relationship" | "travel" | "daily";
  occurredAt: string;
  contactId?: string;
  source: "manual" | "ai" | "sms" | "receipt";
};

export type RecurringBill = {
  id: string;
  title: string;
  amountCny: number;
  dueDay: number;
  accountLabel: string;
  reminderLevel: ReminderLevel;
  enabled: boolean;
};

export type NotificationLog = {
  id: string;
  eventId?: string;
  title: string;
  channel: "push" | "sms" | "voice";
  status: "queued" | "sent" | "confirmed" | "escalated" | "failed";
  level: ReminderLevel;
  sentAt: string;
  acknowledgedAt?: string;
  providerMessage: string;
};

export type AiMemory = {
  id: string;
  contactId?: string;
  content: string;
  source: "manual" | "ai";
  confidence: number;
  embedding?: number[];
  reviewStatus?: "healthy" | "review_required" | "stale";
  reviewedAt?: string;
  lastEmbeddedAt?: string;
  correctedAt?: string;
  createdAt?: string;
};

export type PrivacySettings = {
  piiMasking: boolean;
  cloudModelEnabled: boolean;
  webPushEnabled: boolean;
  smsEnabled: boolean;
  voiceCallEnabled: boolean;
  thirdPartyLinksEnabled: boolean;
};

export type MonthlyInsight = {
  period: string;
  fixedCny: number;
  relationshipCny: number;
  travelCny: number;
  elasticCny: number;
  healthScore: number;
  pressureIndex: number;
  summary: string;
  nextMonthRisks: string[];
};

export type WorkspaceData = {
  contacts: Contact[];
  events: CalendarEvent[];
  budgets: Budget[];
  plans: FulfillmentPlan[];
  captures: CaptureItem[];
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  notificationLogs: NotificationLog[];
  aiMemories: AiMemory[];
  privacy: PrivacySettings;
  insight: MonthlyInsight;
};
