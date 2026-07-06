import type { AcceptanceReport, AcceptanceReportAction } from "./acceptance-report";
import type { AssistantAction, SecretaryCommandCenter } from "./secretary-command-center";
import type { SecretaryTimelineItem } from "./secretary-timeline";
import type { WorkspaceData } from "./types";

export type SecretaryBriefStatus = "urgent" | "attention" | "steady";

export type SecretaryBriefAction =
  | {
      kind: "assistant";
      id: string;
      label: string;
      cta: string;
      detail: string;
      section: AssistantAction["section"];
    }
  | {
      kind: "acceptance";
      id: string;
      label: string;
      cta: string;
      detail: string;
      section: AcceptanceReportAction["section"];
      action: AcceptanceReportAction;
    };

export type SecretaryBriefMetric = {
  label: string;
  value: string;
  detail: string;
  status: SecretaryBriefStatus;
};

export type SecretaryBrief = {
  status: SecretaryBriefStatus;
  score: number;
  headline: string;
  primaryAction?: SecretaryBriefAction;
  metrics: SecretaryBriefMetric[];
  handoffLines: string[];
};

function statusWeight(status: SecretaryBriefStatus) {
  if (status === "urgent") return 0;
  if (status === "attention") return 1;
  return 2;
}

function statusFromSignal(params: {
  openLevelOne: number;
  blockedTimeline: number;
  acceptanceBlocked: number;
  pendingCaptures: number;
  aiBlocked: boolean;
}): SecretaryBriefStatus {
  if (params.openLevelOne > 0 || params.blockedTimeline > 0 || params.acceptanceBlocked > 0 || params.aiBlocked) {
    return "urgent";
  }

  if (params.pendingCaptures > 0) {
    return "attention";
  }

  return "steady";
}

function scoreFromSignal(params: {
  assetScore: number;
  acceptanceScore: number;
  openLevelOne: number;
  pendingCaptures: number;
  blockedTimeline: number;
}) {
  const penalty = params.openLevelOne * 10 + params.pendingCaptures * 3 + params.blockedTimeline * 6;
  return Math.max(0, Math.min(100, Math.round((params.assetScore + params.acceptanceScore) / 2 - penalty)));
}

function assistantBriefAction(action: AssistantAction): SecretaryBriefAction {
  return {
    kind: "assistant",
    id: action.id,
    label: action.title,
    cta: action.cta,
    detail: action.detail,
    section: action.section,
  };
}

function acceptanceBriefAction(action: AcceptanceReportAction, detail: string): SecretaryBriefAction {
  return {
    kind: "acceptance",
    id: `${action.kind}:${action.id}`,
    label: action.label,
    cta: action.cta,
    detail,
    section: action.section,
    action,
  };
}

function primaryAction(params: {
  actions: AssistantAction[];
  acceptanceReport: AcceptanceReport;
}): SecretaryBriefAction | undefined {
  const criticalAssistant = params.actions.find((action) => action.priority === "critical");
  if (criticalAssistant) return assistantBriefAction(criticalAssistant);

  if (params.acceptanceReport.nextAction && params.acceptanceReport.status !== "accepted") {
    return acceptanceBriefAction(params.acceptanceReport.nextAction, params.acceptanceReport.nextStep);
  }

  const nextAssistant = params.actions[0];
  return nextAssistant ? assistantBriefAction(nextAssistant) : undefined;
}

function statusText(status: SecretaryBriefStatus) {
  if (status === "urgent") return "需立即处理";
  if (status === "attention") return "待确认";
  return "稳定";
}

export function buildSecretaryBrief(params: {
  data: WorkspaceData;
  commandCenter: SecretaryCommandCenter;
  acceptanceReport: AcceptanceReport;
  timeline: SecretaryTimelineItem[];
}): SecretaryBrief {
  const openLevelOne = params.data.events.filter((event) =>
    event.reminderLevel === "level_1" && event.status !== "confirmed" && event.status !== "done"
  ).length;
  const pendingCaptures = params.data.captures.filter((capture) => capture.status === "pending").length;
  const pendingPlans = params.data.plans.filter((plan) =>
    plan.status === "draft" || plan.status === "pending_confirmation"
  ).length;
  const blockedTimeline = params.timeline.filter((item) => item.status === "blocked").length;
  const aiBlocked = params.commandCenter.aiContinuity.status === "blocked";
  const status = statusFromSignal({
    openLevelOne,
    blockedTimeline,
    acceptanceBlocked: params.acceptanceReport.blocked,
    pendingCaptures,
    aiBlocked,
  });
  const action = primaryAction({
    actions: params.commandCenter.actions,
    acceptanceReport: params.acceptanceReport,
  });
  const aiStatus: SecretaryBriefStatus = aiBlocked
    ? "urgent"
    : params.commandCenter.aiContinuity.status === "attention"
      ? "attention"
      : "steady";
  const metrics: SecretaryBriefMetric[] = [
    {
      label: "红线",
      value: String(openLevelOne),
      detail: "Level 1 未确认",
      status: openLevelOne > 0 ? "urgent" : "steady",
    },
    {
      label: "确认",
      value: String(pendingCaptures),
      detail: "采集待入库",
      status: pendingCaptures > 0 ? "attention" : "steady",
    },
    {
      label: "履约",
      value: String(pendingPlans),
      detail: "方案待确认",
      status: pendingPlans > 0 ? "attention" : "steady",
    },
    {
      label: "AI",
      value: statusText(aiStatus),
      detail: params.commandCenter.aiContinuity.mode === "cloud_assisted" ? "云端+本地" : "本地兜底",
      status: aiStatus,
    },
  ];

  metrics.sort((left, right) => statusWeight(left.status) - statusWeight(right.status));

  const handoffLines = [
    action ? `先处理：${action.label}。${action.detail}` : "今日暂无必须立即处理的事项。",
    `资产分 ${params.commandCenter.dataAssets.score}，验收分 ${params.acceptanceReport.score}，${params.acceptanceReport.open} 项仍需推进。`,
    params.commandCenter.aiContinuity.interruptionRisks[0]
      ? `AI 口径：${params.commandCenter.aiContinuity.interruptionRisks[0]}`
      : "AI 口径：解析、确认、记忆复核链路稳定。",
  ];

  return {
    status,
    score: scoreFromSignal({
      assetScore: params.commandCenter.dataAssets.score,
      acceptanceScore: params.acceptanceReport.score,
      openLevelOne,
      pendingCaptures,
      blockedTimeline,
    }),
    headline: action ? `${statusText(status)}：${action.label}` : "今日秘书链路稳定",
    primaryAction: action,
    metrics,
    handoffLines,
  };
}
