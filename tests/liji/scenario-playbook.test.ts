import { describe, expect, it } from "vitest";

import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { buildScenarioAcceptance } from "../../src/lib/liji/scenario-acceptance";
import { buildScenarioPlaybooks } from "../../src/lib/liji/scenario-playbook";

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

describe("scenario playbook", () => {
  it("turns scenario checks into a step-by-step execution script", () => {
    const playbooks = buildScenarioPlaybooks(buildScenarioAcceptance({
      data: demoWorkspace,
      levelTwoCards,
    }));
    const hospitality = playbooks.find((playbook) => playbook.id === "client_hospitality");

    expect(playbooks).toHaveLength(4);
    expect(hospitality).toMatchObject({
      label: "客户宴请",
      status: "blocked",
      cta: "处理红线提醒",
    });
    expect(hospitality?.steps.some((step) => step.status === "current" && step.critical)).toBe(true);
    expect(hospitality?.steps[0]).toMatchObject({
      label: "绑定商务联系人",
      status: "done",
    });
  });
});
