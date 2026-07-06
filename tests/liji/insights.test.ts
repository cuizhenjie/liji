import { describe, expect, it } from "vitest";

import { buildNextMonthReservePlan, generateMonthlyInsight, previousMonthPeriod } from "../../src/lib/liji/insights";
import { demoEvents, demoTransactions, demoWorkspace } from "../../src/lib/liji/sample-data";

describe("monthly insight", () => {
  it("resolves the previous calendar month period", () => {
    expect(previousMonthPeriod(new Date("2026-07-02T00:00:00Z"))).toBe("2026-06");
    expect(previousMonthPeriod(new Date("2026-01-02T00:00:00Z"))).toBe("2025-12");
  });

  it("aggregates spend categories and next-month risks", () => {
    const insight = generateMonthlyInsight({
      period: "2026-06",
      transactions: demoTransactions,
      recurringBills: [],
      nextMonthEvents: demoEvents,
    });

    expect(insight.relationshipCny).toBe(468);
    expect(insight.nextMonthRisks.length).toBeGreaterThan(0);
    expect(insight.healthScore).toBeGreaterThan(0);
  });

  it("builds an actionable next-month reserve plan", () => {
    const plan = buildNextMonthReservePlan(demoWorkspace);

    expect(plan.period).toBe("2026-07");
    expect(plan.totalReserveCny).toBeGreaterThan(0);
    expect(plan.items.map((item) => item.category)).toEqual(
      expect.arrayContaining(["fixed", "relationship", "travel", "elastic"])
    );
    expect(plan.items[0].label).toBe("固定账单预留");
    expect(plan.items.find((item) => item.id === "relationship-events")?.amountCny).toBeGreaterThan(0);
  });
});
