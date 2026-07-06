import { describe, expect, it } from "vitest";

import { buildAcceptanceReport } from "../../src/lib/liji/acceptance-report";
import { buildDataAssetRemediationTasks } from "../../src/lib/liji/data-asset-remediation";
import { buildFeatureAcceptanceMatrix } from "../../src/lib/liji/feature-acceptance";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { buildScenarioAcceptance } from "../../src/lib/liji/scenario-acceptance";
import { buildSecretaryBrief } from "../../src/lib/liji/secretary-brief";
import { buildSecretaryCommandCenter } from "../../src/lib/liji/secretary-command-center";
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

describe("secretary brief", () => {
  it("turns scattered dashboard state into an executive next action", () => {
    const commandCenter = buildSecretaryCommandCenter({
      data: demoWorkspace,
      levelTwoCards,
    });
    const acceptanceReport = buildAcceptanceReport({
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
    const brief = buildSecretaryBrief({
      data: demoWorkspace,
      commandCenter,
      acceptanceReport,
      timeline: buildSecretaryTimeline(demoWorkspace, 8),
    });

    expect(brief.status).toBe("urgent");
    expect(brief.primaryAction).toMatchObject({
      kind: "assistant",
      label: "确认红线事项：周明客户宴请",
      cta: "确认提醒",
    });
    expect(brief.metrics[0]).toMatchObject({
      label: "红线",
      value: "1",
      status: "urgent",
    });
    expect(brief.handoffLines.join(" ")).toContain("资产分");
    expect(brief.handoffLines.join(" ")).toContain("云端模型未授权");
  });
});
