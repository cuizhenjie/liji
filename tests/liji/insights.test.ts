import { describe, expect, it } from "vitest";

import { generateMonthlyInsight } from "../../src/lib/liji/insights";
import { demoEvents, demoTransactions } from "../../src/lib/liji/sample-data";

describe("monthly insight", () => {
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
});
