import { describe, expect, it } from "vitest";

import { buildScenarioAcceptance } from "../../src/lib/liji/scenario-acceptance";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

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

describe("scenario acceptance", () => {
  it("surfaces blocked high-risk customer hospitality before healthy scenarios", () => {
    const scenarios = buildScenarioAcceptance({
      data: demoWorkspace,
      levelTwoCards,
    });

    expect(scenarios[0]).toMatchObject({
      id: "client_hospitality",
      status: "blocked",
    });
    expect(scenarios.find((item) => item.id === "bill_recap")?.status).toBe("ready");
    expect(scenarios.every((item) => item.checks.length >= 4)).toBe(true);
  });

  it("moves hospitality to ready when the red-line reminder is confirmed", () => {
    const scenarios = buildScenarioAcceptance({
      data: {
        ...demoWorkspace,
        events: demoWorkspace.events.map((event) =>
          event.id === "e-client-dinner" ? { ...event, status: "confirmed" } : event
        ),
        plans: demoWorkspace.plans.map((plan) => ({ ...plan, status: "confirmed" })),
      },
      levelTwoCards,
    });

    const hospitality = scenarios.find((item) => item.id === "client_hospitality");
    const birthday = scenarios.find((item) => item.id === "birthday_care");

    expect(hospitality?.status).toBe("ready");
    expect(birthday?.progress).toBe(100);
  });
});
