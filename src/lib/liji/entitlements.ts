import type { WorkspaceData } from "./types";

export type MembershipPlanId = "free" | "pro" | "executive";

export type EntitlementLimitKey =
  | "contacts"
  | "aiMemories"
  | "monthlySms"
  | "monthlyVoiceCalls"
  | "emergencyEscalations"
  | "fulfillmentReconciliations";

export type MembershipPlan = {
  id: MembershipPlanId;
  label: string;
  monthlyCny: number;
  limits: Record<EntitlementLimitKey, number>;
};

export type EntitlementUsageItem = {
  key: EntitlementLimitKey;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  status: "ok" | "near_limit" | "exceeded";
};

export type EntitlementReport = {
  plan: MembershipPlan;
  usage: EntitlementUsageItem[];
  upgradeRecommended: boolean;
  nextBestPlan?: MembershipPlanId;
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: "free",
    label: "体验版",
    monthlyCny: 0,
    limits: {
      contacts: 20,
      aiMemories: 50,
      monthlySms: 20,
      monthlyVoiceCalls: 3,
      emergencyEscalations: 5,
      fulfillmentReconciliations: 1,
    },
  },
  {
    id: "pro",
    label: "专业版",
    monthlyCny: 99,
    limits: {
      contacts: 200,
      aiMemories: 1000,
      monthlySms: 300,
      monthlyVoiceCalls: 60,
      emergencyEscalations: 100,
      fulfillmentReconciliations: 20,
    },
  },
  {
    id: "executive",
    label: "高管版",
    monthlyCny: 399,
    limits: {
      contacts: 1000,
      aiMemories: 10000,
      monthlySms: 3000,
      monthlyVoiceCalls: 600,
      emergencyEscalations: 1000,
      fulfillmentReconciliations: 200,
    },
  },
];

const usageLabels: Record<EntitlementLimitKey, string> = {
  contacts: "关系画像",
  aiMemories: "AI 记忆",
  monthlySms: "月短信额度",
  monthlyVoiceCalls: "月语音额度",
  emergencyEscalations: "紧急升级",
  fulfillmentReconciliations: "履约对账",
};

function planById(planId?: string) {
  return membershipPlans.find((plan) => plan.id === planId) ?? membershipPlans[0];
}

function usageStatus(used: number, limit: number): EntitlementUsageItem["status"] {
  if (used > limit) return "exceeded";
  if (used >= limit * 0.8) return "near_limit";
  return "ok";
}

export function calculateWorkspaceEntitlementUsage(data: WorkspaceData) {
  const smsLogs = data.notificationLogs.filter((log) => log.channel === "sms").length;
  const voiceLogs = data.notificationLogs.filter((log) => log.channel === "voice").length;
  const emergencyEscalations = data.notificationLogs.filter((log) =>
    log.level === "level_1" && (log.channel === "sms" || log.channel === "voice")
  ).length;
  const fulfillmentReconciliations = data.plans.filter((plan) =>
    plan.status === "confirmed" || plan.status === "bookmarked"
  ).length;

  return {
    contacts: data.contacts.length,
    aiMemories: data.aiMemories.length,
    monthlySms: smsLogs,
    monthlyVoiceCalls: voiceLogs,
    emergencyEscalations,
    fulfillmentReconciliations,
  } satisfies Record<EntitlementLimitKey, number>;
}

export function buildEntitlementReport(params: {
  data: WorkspaceData;
  planId?: MembershipPlanId | string;
}): EntitlementReport {
  const plan = planById(params.planId);
  const usageValues = calculateWorkspaceEntitlementUsage(params.data);
  const usage = Object.entries(plan.limits).map(([key, limit]) => {
    const typedKey = key as EntitlementLimitKey;
    const used = usageValues[typedKey];
    return {
      key: typedKey,
      label: usageLabels[typedKey],
      used,
      limit,
      remaining: Math.max(0, limit - used),
      status: usageStatus(used, limit),
    };
  });
  const upgradeRecommended = usage.some((item) => item.status !== "ok");
  const nextBestPlan = upgradeRecommended
    ? plan.id === "free"
      ? "pro"
      : plan.id === "pro"
        ? "executive"
        : undefined
    : undefined;

  return {
    plan,
    usage,
    upgradeRecommended,
    nextBestPlan,
  };
}
