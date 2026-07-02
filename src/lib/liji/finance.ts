import { generateMonthlyInsight } from "./insights";
import type { Budget, RecurringBill, Transaction, WorkspaceData } from "./types";

function recomputeInsight(data: WorkspaceData): WorkspaceData {
  return {
    ...data,
    insight: generateMonthlyInsight({
      period: data.insight.period,
      transactions: data.transactions,
      recurringBills: data.recurringBills,
      nextMonthEvents: data.events,
    }),
  };
}

export function addRecurringBill(data: WorkspaceData, bill: RecurringBill): WorkspaceData {
  return recomputeInsight({
    ...data,
    recurringBills: [bill, ...data.recurringBills],
  });
}

export function addTransaction(data: WorkspaceData, transaction: Transaction): WorkspaceData {
  const budgets = data.budgets.map((budget) =>
    budget.category === transaction.category ||
    (budget.category === "elastic" && transaction.category === "daily")
      ? { ...budget, spentCny: budget.spentCny + transaction.amountCny }
      : budget
  );

  return recomputeInsight({
    ...data,
    budgets,
    transactions: [transaction, ...data.transactions],
  });
}

export function updateBudgetTotal(data: WorkspaceData, budgetId: string, totalCny: number): WorkspaceData {
  return {
    ...data,
    budgets: data.budgets.map((budget: Budget) =>
      budget.id === budgetId ? { ...budget, totalCny } : budget
    ),
  };
}
