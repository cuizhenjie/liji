import { describe, expect, it } from "vitest";

import {
  addRecurringBill,
  addTransaction,
  updateBudgetTotal,
} from "../../src/lib/liji/finance";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("finance workflows", () => {
  it("adds recurring bills and recomputes fixed spend", () => {
    const next = addRecurringBill(demoWorkspace, {
      id: "rb-property",
      title: "物业费",
      amountCny: 680,
      dueDay: 15,
      accountLabel: "待关联扣款账户",
      reminderLevel: "level_2",
      enabled: true,
    });

    expect(next.recurringBills[0].title).toBe("物业费");
    expect(next.insight.fixedCny).toBeGreaterThan(demoWorkspace.insight.fixedCny);
  });

  it("adds manual transactions and updates the matching budget bucket", () => {
    const next = addTransaction(demoWorkspace, {
      id: "t-client-lunch",
      title: "客户午餐",
      amountCny: 268,
      category: "relationship",
      occurredAt: "2026-07-02",
      source: "manual",
    });
    const relationshipBudget = next.budgets.find((budget) => budget.category === "relationship");

    expect(next.transactions[0].title).toBe("客户午餐");
    expect(relationshipBudget?.spentCny).toBe(2736);
  });

  it("updates budget limits without changing spend", () => {
    const budget = demoWorkspace.budgets[0];
    const next = updateBudgetTotal(demoWorkspace, budget.id, 22000);

    expect(next.budgets[0].totalCny).toBe(22000);
    expect(next.budgets[0].spentCny).toBe(budget.spentCny);
  });
});
