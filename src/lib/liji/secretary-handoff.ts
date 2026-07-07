import type { DataAssetRemediationTask } from "./data-asset-remediation";
import type { ScenarioPlaybook } from "./scenario-playbook";
import type { SecretaryBrief, SecretaryBriefAction } from "./secretary-brief";

export type SecretaryHandoffUrgency = "critical" | "high" | "normal";

export type SecretaryHandoffOwner = "user" | "ai" | "system";

export type SecretaryHandoffStageStatus = "done" | "current" | "next";

export type SecretaryHandoffStage = {
  id: string;
  label: string;
  owner: SecretaryHandoffOwner;
  status: SecretaryHandoffStageStatus;
  detail: string;
};

export type SecretaryHandoffAction =
  | {
      kind: "brief";
      id: string;
    }
  | {
      kind: "scenario";
      id: ScenarioPlaybook["id"];
    }
  | {
      kind: "remediation";
      id: string;
    };

export type SecretaryHandoffItem = {
  id: string;
  title: string;
  scenario: string;
  urgency: SecretaryHandoffUrgency;
  evidence: string;
  assetOutcome: string;
  section: SecretaryBriefAction["section"];
  cta: string;
  action: SecretaryHandoffAction;
  stages: SecretaryHandoffStage[];
};

export type SecretaryHandoffPlan = {
  headline: string;
  openCount: number;
  items: SecretaryHandoffItem[];
};

function urgencyFromBrief(status: SecretaryBrief["status"]): SecretaryHandoffUrgency {
  if (status === "urgent") return "critical";
  if (status === "attention") return "high";
  return "normal";
}

function assetOutcome(section: SecretaryBriefAction["section"]) {
  const outcomes: Record<SecretaryBriefAction["section"], string> = {
    dashboard: "确认中心记录",
    contacts: "关系画像与 AI 记忆",
    calendar: "日程与提醒资产",
    fulfillment: "履约方案资产",
    finance: "账单与复盘资产",
    ops: "运营验收证据",
    privacy: "隐私授权资产",
  };

  return outcomes[section];
}

function scenarioUrgency(status: ScenarioPlaybook["status"]): SecretaryHandoffUrgency {
  if (status === "blocked") return "critical";
  if (status === "needs_action") return "high";
  return "normal";
}

function remediationUrgency(priority: DataAssetRemediationTask["priority"]): SecretaryHandoffUrgency {
  if (priority === "critical") return "critical";
  if (priority === "high") return "high";
  return "normal";
}

function briefItem(brief: SecretaryBrief): SecretaryHandoffItem | undefined {
  const action = brief.primaryAction;
  if (!action) return undefined;
  const outcome = assetOutcome(action.section);

  return {
    id: `brief:${action.id}`,
    title: action.label,
    scenario: "今日主动作",
    urgency: urgencyFromBrief(brief.status),
    evidence: brief.handoffLines[0] ?? action.detail,
    assetOutcome: outcome,
    section: action.section,
    cta: action.cta,
    action: {
      kind: "brief",
      id: action.id,
    },
    stages: [
      {
        id: "intake",
        label: "接收信息",
        owner: "system",
        status: "done",
        detail: "已汇总红线、确认、履约和 AI 状态。",
      },
      {
        id: "triage",
        label: "AI 分诊",
        owner: "ai",
        status: "done",
        detail: brief.headline,
      },
      {
        id: "confirm",
        label: "用户确认",
        owner: "user",
        status: "current",
        detail: action.detail,
      },
      {
        id: "asset",
        label: "资产入库",
        owner: "system",
        status: "next",
        detail: `完成后沉淀到${outcome}。`,
      },
    ],
  };
}

function scenarioItem(playbook: ScenarioPlaybook): SecretaryHandoffItem {
  const currentStep = playbook.steps.find((step) => step.status === "current");
  const firstDone = playbook.steps.find((step) => step.status === "done");
  const outcome = assetOutcome(playbook.section);

  return {
    id: `scenario:${playbook.id}`,
    title: playbook.label,
    scenario: "场景剧本",
    urgency: scenarioUrgency(playbook.status),
    evidence: `${playbook.progress}% · ${playbook.nextStep}`,
    assetOutcome: outcome,
    section: playbook.section,
    cta: playbook.cta,
    action: {
      kind: "scenario",
      id: playbook.id,
    },
    stages: [
      {
        id: "intake",
        label: "接收信息",
        owner: "system",
        status: firstDone ? "done" : "current",
        detail: firstDone?.detail ?? "等待补齐场景起点。",
      },
      {
        id: "triage",
        label: "AI 分诊",
        owner: "ai",
        status: currentStep ? "done" : "next",
        detail: currentStep?.detail ?? playbook.currentStep,
      },
      {
        id: "confirm",
        label: "用户确认",
        owner: "user",
        status: currentStep ? "current" : "done",
        detail: currentStep?.label ?? "场景当前检查已通过。",
      },
      {
        id: "asset",
        label: "资产入库",
        owner: "system",
        status: playbook.status === "ready" ? "done" : "next",
        detail: `完成后沉淀到${outcome}。`,
      },
    ],
  };
}

function remediationItem(task: DataAssetRemediationTask): SecretaryHandoffItem {
  const outcome = assetOutcome(task.section);

  return {
    id: `remediation:${task.id}`,
    title: task.title,
    scenario: "资产补齐",
    urgency: remediationUrgency(task.priority),
    evidence: task.evidence,
    assetOutcome: outcome,
    section: task.section,
    cta: task.cta,
    action: {
      kind: "remediation",
      id: task.id,
    },
    stages: [
      {
        id: "intake",
        label: "接收信息",
        owner: "system",
        status: "done",
        detail: task.evidence,
      },
      {
        id: "triage",
        label: "AI 分诊",
        owner: "ai",
        status: "done",
        detail: task.detail,
      },
      {
        id: "confirm",
        label: "用户确认",
        owner: "user",
        status: "current",
        detail: task.cta,
      },
      {
        id: "asset",
        label: "资产入库",
        owner: "system",
        status: "next",
        detail: `完成后沉淀到${outcome}。`,
      },
    ],
  };
}

function dedupeItems(items: SecretaryHandoffItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.section}:${item.cta}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildSecretaryHandoffPlan(params: {
  brief: SecretaryBrief;
  scenarioPlaybooks: ScenarioPlaybook[];
  remediationTasks: DataAssetRemediationTask[];
  limit?: number;
}): SecretaryHandoffPlan {
  const limit = params.limit ?? 3;
  const brief = briefItem(params.brief);
  const openPlaybooks = params.scenarioPlaybooks
    .filter((playbook) => playbook.status !== "ready")
    .map(scenarioItem);
  const openRemediations = params.remediationTasks.map(remediationItem);
  const items = dedupeItems([
    ...(brief ? [brief] : []),
    ...openPlaybooks,
    ...openRemediations,
  ]).slice(0, limit);

  return {
    headline: items[0]
      ? `先交接：${items[0].title}`
      : "今日秘书工作已交接完成",
    openCount: items.length,
    items,
  };
}
