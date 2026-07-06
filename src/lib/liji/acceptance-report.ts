import type { DataAssetRemediationTask } from "./data-asset-remediation";
import type { FeatureAcceptanceItem } from "./feature-acceptance";
import type { ScenarioAcceptanceItem } from "./scenario-acceptance";
import type {
  AiContinuityReport,
  DataAssetItem,
  DataAssetReport,
} from "./secretary-command-center";

export type AcceptanceReportStatus = "accepted" | "needs_action" | "blocked";

export type AcceptanceReportAction =
  | {
      kind: "feature";
      id: FeatureAcceptanceItem["id"];
      label: string;
      cta: string;
      section: FeatureAcceptanceItem["section"];
    }
  | {
      kind: "scenario";
      id: ScenarioAcceptanceItem["id"];
      label: string;
      cta: string;
      section: ScenarioAcceptanceItem["section"];
    }
  | {
      kind: "asset";
      id: DataAssetItem["key"];
      label: string;
      cta: string;
      section: DataAssetItem["section"];
    }
  | {
      kind: "remediation";
      id: string;
      label: string;
      cta: string;
      section: DataAssetRemediationTask["section"];
    }
  | {
      kind: "continuity";
      id: AiContinuityReport["actions"][number]["id"];
      label: string;
      cta: string;
      section: AiContinuityReport["actions"][number]["section"];
    };

export type AcceptanceReportItem = {
  id: string;
  label: string;
  group: "功能验收" | "场景验收" | "数据资产" | "AI 连续性" | "资产补齐";
  status: AcceptanceReportStatus;
  progress: number;
  evidence: string;
  nextStep: string;
  action: AcceptanceReportAction;
};

export type AcceptanceReport = {
  score: number;
  status: AcceptanceReportStatus;
  passed: number;
  open: number;
  blocked: number;
  total: number;
  nextAction?: AcceptanceReportAction;
  nextStep: string;
  evidenceLines: string[];
  items: AcceptanceReportItem[];
};

function featureStatus(status: FeatureAcceptanceItem["status"]): AcceptanceReportStatus {
  if (status === "accepted") return "accepted";
  return status;
}

function scenarioStatus(status: ScenarioAcceptanceItem["status"]): AcceptanceReportStatus {
  if (status === "ready") return "accepted";
  return status;
}

function assetStatus(status: DataAssetItem["status"]): AcceptanceReportStatus {
  if (status === "healthy") return "accepted";
  if (status === "attention") return "needs_action";
  return "blocked";
}

function continuityStatus(status: AiContinuityReport["status"]): AcceptanceReportStatus {
  if (status === "healthy") return "accepted";
  if (status === "attention") return "needs_action";
  return "blocked";
}

function remediationStatus(priority: DataAssetRemediationTask["priority"]): AcceptanceReportStatus {
  return priority === "critical" ? "blocked" : "needs_action";
}

function statusWeight(status: AcceptanceReportStatus) {
  if (status === "blocked") return 0;
  if (status === "needs_action") return 1;
  return 2;
}

function groupWeight(group: AcceptanceReportItem["group"]) {
  if (group === "功能验收") return 0;
  if (group === "场景验收") return 1;
  if (group === "AI 连续性") return 2;
  if (group === "数据资产") return 3;
  return 4;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function assetProgress(asset: DataAssetItem) {
  return clampProgress((asset.owned / Math.max(1, asset.total)) * 100);
}

function continuityProgress(report: AiContinuityReport) {
  const riskPenalty = report.interruptionRisks.length * 18;
  const actionPenalty = report.actions.length * 8;
  return clampProgress(100 - riskPenalty - actionPenalty);
}

function dedupeById(items: AcceptanceReportItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function buildAcceptanceReport(params: {
  features: FeatureAcceptanceItem[];
  scenarios: ScenarioAcceptanceItem[];
  dataAssets: DataAssetReport;
  aiContinuity: AiContinuityReport;
  remediationTasks: DataAssetRemediationTask[];
}): AcceptanceReport {
  const featureItems = params.features.map<AcceptanceReportItem>((feature) => ({
    id: `feature:${feature.id}`,
    label: `${feature.id} · ${feature.label}`,
    group: "功能验收",
    status: featureStatus(feature.status),
    progress: feature.progress,
    evidence: feature.evidence,
    nextStep: feature.nextStep,
    action: {
      kind: "feature",
      id: feature.id,
      label: `${feature.id} ${feature.label}`,
      cta: feature.cta,
      section: feature.section,
    },
  }));

  const scenarioItems = params.scenarios.map<AcceptanceReportItem>((scenario) => ({
    id: `scenario:${scenario.id}`,
    label: scenario.label,
    group: "场景验收",
    status: scenarioStatus(scenario.status),
    progress: scenario.progress,
    evidence: scenario.currentStep,
    nextStep: scenario.nextStep,
    action: {
      kind: "scenario",
      id: scenario.id,
      label: scenario.label,
      cta: scenario.cta,
      section: scenario.section,
    },
  }));

  const assetItems = params.dataAssets.items.map<AcceptanceReportItem>((asset) => ({
    id: `asset:${asset.key}`,
    label: asset.label,
    group: "数据资产",
    status: assetStatus(asset.status),
    progress: assetProgress(asset),
    evidence: `${asset.owned}/${asset.total} 已入库`,
    nextStep: asset.gap,
    action: {
      kind: "asset",
      id: asset.key,
      label: asset.label,
      cta: asset.status === "healthy" ? "查看资产" : "补齐资产",
      section: asset.section,
    },
  }));

  const continuityItem: AcceptanceReportItem = {
    id: "continuity:ai",
    label: params.aiContinuity.mode === "cloud_assisted" ? "云端 AI 连续性" : "本地 AI 兜底连续性",
    group: "AI 连续性",
    status: continuityStatus(params.aiContinuity.status),
    progress: continuityProgress(params.aiContinuity),
    evidence: params.aiContinuity.interruptionRisks[0] ?? "AI 链路无中断风险",
    nextStep: params.aiContinuity.actions[0]?.detail ?? "持续观察解析、确认和记忆复核链路。",
    action: params.aiContinuity.actions[0]
      ? {
          kind: "continuity",
          id: params.aiContinuity.actions[0].id,
          label: params.aiContinuity.actions[0].label,
          cta: params.aiContinuity.actions[0].label,
          section: params.aiContinuity.actions[0].section,
        }
      : {
          kind: "continuity",
          id: "confirm_queue",
          label: "查看 AI 连续性",
          cta: "查看状态",
          section: "dashboard",
        },
  };

  const remediationItems = params.remediationTasks.slice(0, 6).map<AcceptanceReportItem>((task) => ({
    id: `remediation:${task.id}`,
    label: task.title,
    group: "资产补齐",
    status: remediationStatus(task.priority),
    progress: task.priority === "critical" ? 20 : task.priority === "high" ? 45 : 65,
    evidence: task.evidence,
    nextStep: task.detail,
    action: {
      kind: "remediation",
      id: task.id,
      label: task.title,
      cta: task.cta,
      section: task.section,
    },
  }));

  const items = dedupeById([
    ...featureItems,
    ...scenarioItems,
    ...assetItems,
    continuityItem,
    ...remediationItems,
  ]).sort((left, right) => {
    const byStatus = statusWeight(left.status) - statusWeight(right.status);
    if (byStatus !== 0) return byStatus;
    const byGroup = groupWeight(left.group) - groupWeight(right.group);
    if (byGroup !== 0) return byGroup;
    return left.progress - right.progress;
  });

  const passed = items.filter((item) => item.status === "accepted").length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const open = items.length - passed;
  const score = clampProgress(items.reduce((sum, item) => sum + item.progress, 0) / Math.max(1, items.length));
  const nextItem = items.find((item) => item.status !== "accepted");

  return {
    score,
    status: blocked > 0 ? "blocked" : open > 0 ? "needs_action" : "accepted",
    passed,
    open,
    blocked,
    total: items.length,
    nextAction: nextItem?.action,
    nextStep: nextItem ? `${nextItem.group}：${nextItem.nextStep}` : "全部核心验收项已通过，进入真实服务和运营数据观察。",
    evidenceLines: items.slice(0, 4).map((item) => `${item.group} / ${item.label}：${item.evidence}`),
    items,
  };
}
