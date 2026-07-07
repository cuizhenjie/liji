import { describe, expect, it } from "vitest";

import { buildAcceptanceReport } from "../../src/lib/liji/acceptance-report";
import { buildDataAssetRemediationTasks } from "../../src/lib/liji/data-asset-remediation";
import { buildFeatureAcceptanceMatrix } from "../../src/lib/liji/feature-acceptance";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { buildScenarioAcceptance } from "../../src/lib/liji/scenario-acceptance";
import { buildScenarioPlaybooks } from "../../src/lib/liji/scenario-playbook";
import { buildSecretaryBrief } from "../../src/lib/liji/secretary-brief";
import { buildSecretaryCommandCenter } from "../../src/lib/liji/secretary-command-center";
import { buildSecretaryHandoffPlan } from "../../src/lib/liji/secretary-handoff";
import { buildSecretaryTimeline } from "../../src/lib/liji/secretary-timeline";

const levelTwoCards = [{
  id: "level2-demo",
  eventId: "e-daughter-birthday",
  title: "生日推荐卡",
  date: "2026-07-10",
  daysUntil: 2,
  priority: "soon" as const,
  recommendation: "提前锁定礼物和蛋糕。",
  actions: ["生成履约方案"],
  warnings: [],
}];

describe("secretary handoff", () => {
  it("turns the brief, scenario scripts and asset gaps into a delegated handoff list", () => {
    const commandCenter = buildSecretaryCommandCenter({
      data: demoWorkspace,
      levelTwoCards,
    });
    const scenarioAcceptance = buildScenarioAcceptance({
      data: demoWorkspace,
      levelTwoCards,
    });
    const remediationTasks = buildDataAssetRemediationTasks(demoWorkspace, 6);
    const acceptanceReport = buildAcceptanceReport({
      features: buildFeatureAcceptanceMatrix({
        data: demoWorkspace,
        levelTwoCards,
      }),
      scenarios: scenarioAcceptance,
      dataAssets: commandCenter.dataAssets,
      aiContinuity: commandCenter.aiContinuity,
      remediationTasks,
    });
    const brief = buildSecretaryBrief({
      data: demoWorkspace,
      commandCenter,
      acceptanceReport,
      timeline: buildSecretaryTimeline(demoWorkspace, 8),
    });
    const plan = buildSecretaryHandoffPlan({
      brief,
      scenarioPlaybooks: buildScenarioPlaybooks(scenarioAcceptance),
      remediationTasks,
    });

    expect(plan.headline).toContain("确认红线事项：周明客户宴请");
    expect(plan.items[0]).toMatchObject({
      title: "确认红线事项：周明客户宴请",
      scenario: "今日主动作",
      urgency: "critical",
      assetOutcome: "日程与提醒资产",
      cta: "确认提醒",
    });
    expect(plan.items[0].stages).toEqual([
      expect.objectContaining({ label: "接收信息", status: "done" }),
      expect.objectContaining({ label: "AI 分诊", owner: "ai" }),
      expect.objectContaining({ label: "用户确认", status: "current" }),
      expect.objectContaining({ label: "资产入库", detail: "完成后沉淀到日程与提醒资产。" }),
    ]);
    expect(plan.items.some((item) => item.scenario === "场景剧本")).toBe(true);
    expect(plan.items.every((item) => item.action.kind && item.section)).toBe(true);
  });
});
