import { describe, expect, it } from "vitest";

import { buildFeatureAcceptanceMatrix } from "../../src/lib/liji/feature-acceptance";
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

describe("feature acceptance matrix", () => {
  it("maps PRD features to actionable acceptance states", () => {
    const matrix = buildFeatureAcceptanceMatrix({
      data: demoWorkspace,
      levelTwoCards,
    });

    expect(matrix).toHaveLength(8);
    expect(matrix[0]).toMatchObject({
      id: "F202",
      status: "blocked",
      nextStep: "红线提醒被确认",
    });
    expect(matrix.find((item) => item.id === "F301")).toMatchObject({
      status: "needs_action",
      nextStep: "用户确认履约方案",
    });
    expect(matrix.find((item) => item.id === "F101")?.status).toBe("accepted");
    expect(matrix.find((item) => item.id === "N101")?.status).toBe("accepted");
    expect(matrix.every((item) => item.checks.length >= 4)).toBe(true);
  });

  it("marks reminder and fulfillment features accepted after user confirmation", () => {
    const matrix = buildFeatureAcceptanceMatrix({
      data: {
        ...demoWorkspace,
        events: demoWorkspace.events.map((event) =>
          event.reminderLevel === "level_1" ? { ...event, status: "confirmed" } : event
        ),
        plans: demoWorkspace.plans.map((plan) => ({ ...plan, status: "confirmed" })),
      },
      levelTwoCards,
    });

    expect(matrix.find((item) => item.id === "F202")?.status).toBe("accepted");
    expect(matrix.find((item) => item.id === "F301")?.status).toBe("accepted");
    expect(matrix.find((item) => item.id === "F302")?.status).toBe("accepted");
  });
});
