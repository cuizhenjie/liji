import { describe, expect, it } from "vitest";

import { buildAcceptanceReport } from "../../src/lib/liji/acceptance-report";
import { buildDataAssetRemediationTasks } from "../../src/lib/liji/data-asset-remediation";
import { buildFeatureAcceptanceMatrix } from "../../src/lib/liji/feature-acceptance";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { buildScenarioAcceptance } from "../../src/lib/liji/scenario-acceptance";
import { buildSecretaryCommandCenter } from "../../src/lib/liji/secretary-command-center";

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

describe("acceptance report", () => {
  it("rolls feature, scenario, asset and AI checks into the next acceptance action", () => {
    const commandCenter = buildSecretaryCommandCenter({
      data: demoWorkspace,
      levelTwoCards,
    });
    const report = buildAcceptanceReport({
      features: buildFeatureAcceptanceMatrix({
        data: demoWorkspace,
        levelTwoCards,
      }),
      scenarios: buildScenarioAcceptance({
        data: demoWorkspace,
        levelTwoCards,
      }),
      dataAssets: commandCenter.dataAssets,
      aiContinuity: commandCenter.aiContinuity,
      remediationTasks: buildDataAssetRemediationTasks(demoWorkspace, 6),
    });

    expect(report.status).toBe("blocked");
    expect(report.blocked).toBeGreaterThan(0);
    expect(report.open).toBeGreaterThan(0);
    expect(report.nextAction).toMatchObject({
      kind: "feature",
      id: "F202",
      label: "F202 冗余预警机制",
    });
    expect(report.evidenceLines[0]).toContain("功能验收 / F202 · 冗余预警机制");
    expect(report.items.some((item) => item.group === "AI 连续性")).toBe(true);
  });
});
