import type { CalendarEvent, MonthlyInsight, RecurringBill, Transaction } from "./types";

export function generateMonthlyInsight(input: {
  period: string;
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  nextMonthEvents: CalendarEvent[];
}): MonthlyInsight {
  const fixedCny =
    input.transactions
      .filter((transaction) => transaction.category === "fixed")
      .reduce((sum, transaction) => sum + transaction.amountCny, 0) +
    input.recurringBills
      .filter((bill) => bill.enabled)
      .reduce((sum, bill) => sum + bill.amountCny, 0);
  const relationshipCny = input.transactions
    .filter((transaction) => transaction.category === "relationship")
    .reduce((sum, transaction) => sum + transaction.amountCny, 0);
  const travelCny = input.transactions
    .filter((transaction) => transaction.category === "travel")
    .reduce((sum, transaction) => sum + transaction.amountCny, 0);
  const elasticCny = input.transactions
    .filter((transaction) => transaction.category === "daily")
    .reduce((sum, transaction) => sum + transaction.amountCny, 0);
  const nextMonthRisks = input.nextMonthEvents
    .filter((event) => event.reminderLevel !== "level_3")
    .map((event) => `${event.date} ${event.title}`);
  const total = fixedCny + relationshipCny + travelCny + elasticCny;
  const pressureIndex = Math.min(100, Math.round((fixedCny / Math.max(1, total)) * 52 + nextMonthRisks.length * 12));
  const healthScore = Math.max(62, 96 - pressureIndex);

  return {
    period: input.period,
    fixedCny,
    relationshipCny,
    travelCny,
    elasticCny,
    pressureIndex,
    healthScore,
    nextMonthRisks,
    summary:
      relationshipCny > 0
        ? "本月人情支出有明确对象与履约记录，预算健康；下月需提前锁定高等级提醒。"
        : "本月固定支出稳定，人情预算尚未明显使用，可提前为下月纪念日预留额度。",
  };
}
