import { describe, expect, it } from "vitest";

import {
  generateFestivalPlan,
  generateTravelPlan,
  splitFestivalBudget,
} from "../../src/lib/liji/budget";
import { demoContacts, demoEvents } from "../../src/lib/liji/sample-data";

describe("budget fulfillment engine", () => {
  it("splits festival budget by 60/15/25", () => {
    expect(splitFestivalBudget(2000)).toEqual({
      gift: 1200,
      cake: 300,
      dining: 500,
    });
  });

  it("respects compliance caps for sensitive business contacts", () => {
    const plan = generateFestivalPlan(demoEvents[1], demoContacts[1], 800);

    expect(plan.riskLevel).toBe("high");
    expect(plan.warnings.join(" ")).toContain("礼品限额");
    expect(plan.items[0].amountCny).toBeLessThanOrEqual(200);
  });

  it("creates a travel plan from daily limits", () => {
    const plan = generateTravelPlan({
      title: "广州商务差旅方案",
      startDate: "2026-07-08",
      endDate: "2026-07-10",
      destination: "广州",
      dailyLimitCny: 2400,
    });

    expect(plan.budgetCny).toBe(7200);
    expect(plan.items.map((item) => item.category)).toContain("hotel");
  });
});
