import { describe, expect, it } from "vitest";

import { generateTravelPlan } from "../../src/lib/liji/budget";
import { buildTravelReadinessBrief } from "../../src/lib/liji/travel-readiness";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("travel readiness brief", () => {
  it("builds a pre-trip secretary pack from a travel plan", () => {
    const plan = demoWorkspace.plans.find((item) => item.scenario === "travel");
    const brief = buildTravelReadinessBrief(plan!);

    expect(brief?.title).toBe("行前秘书包");
    expect(brief?.readinessScore).toBeGreaterThanOrEqual(80);
    expect(brief?.routeSummary).toContain("广州");
    expect(brief?.checklist.join(" ")).toContain("酒店到客户地址控制在 3 公里内");
    expect(brief?.budgetSummary).toContain("弹性池");
  });

  it("lowers readiness when travel quotes exceed the budget", () => {
    const plan = generateTravelPlan({
      title: "深圳商务差旅方案",
      startDate: "2026-07-08",
      destination: "深圳",
      dailyLimitCny: 500,
      transportCandidates: [
        {
          id: "flight-peak",
          category: "transport",
          provider: "携程",
          title: "深圳临近出发机票",
          amountCny: 900,
          score: 95,
          rationale: "临近出发价格较高。",
          url: "https://www.ctrip.com/?keyword=flight",
        },
      ],
      hotelCandidates: [
        {
          id: "hotel-peak",
          category: "hotel",
          provider: "同程",
          title: "深圳核心区酒店",
          amountCny: 900,
          score: 92,
          rationale: "核心区价格较高。",
          url: "https://www.ly.com/?keyword=hotel",
        },
      ],
    });
    const brief = buildTravelReadinessBrief(plan);

    expect(brief?.readinessScore).toBeLessThan(80);
    expect(brief?.nextActions.join(" ")).toContain("替代方案");
    expect(brief?.proximitySummary).toContain("待复核");
  });

  it("ignores festival plans", () => {
    const plan = demoWorkspace.plans.find((item) => item.scenario === "festival");

    expect(buildTravelReadinessBrief(plan!)).toBeNull();
  });
});
