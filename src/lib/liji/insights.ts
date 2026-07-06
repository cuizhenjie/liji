import type { Budget, CalendarEvent, FulfillmentPlan, MonthlyInsight, RecurringBill, Transaction, WorkspaceData } from "./types";

export type NextMonthReserveCategory = Budget["category"];

export type NextMonthReserveItem = {
  id: string;
  label: string;
  category: NextMonthReserveCategory;
  amountCny: number;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export type NextMonthReservePlan = {
  period: string;
  totalReserveCny: number;
  budgetCoverageCny: number;
  pressureLevel: "low" | "medium" | "high";
  items: NextMonthReserveItem[];
};

export function previousMonthPeriod(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const previous = new Date(Date.UTC(year, month - 1, 1));

  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextPeriod(period: string) {
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return period;

  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function sumAmounts<T>(items: T[], amount: (item: T) => number | undefined) {
  return items.reduce((sum, item) => sum + (amount(item) ?? 0), 0);
}

function plannedAmount(plans: FulfillmentPlan[], scenario: FulfillmentPlan["scenario"]) {
  return sumAmounts(
    plans.filter((plan) => plan.scenario === scenario),
    (plan) => plan.budgetCny
  );
}

function unplannedEventAmount(events: CalendarEvent[], plans: FulfillmentPlan[], matcher: (event: CalendarEvent) => boolean) {
  const plannedEventIds = new Set(plans.map((plan) => plan.eventId).filter(Boolean));
  return sumAmounts(
    events.filter((event) => !plannedEventIds.has(event.id) && matcher(event)),
    (event) => event.budgetCny
  );
}

function pressureLevel(totalReserveCny: number, budgetCoverageCny: number, pressureIndex: number): NextMonthReservePlan["pressureLevel"] {
  if (pressureIndex >= 80 || totalReserveCny > budgetCoverageCny * 0.9) return "high";
  if (pressureIndex >= 60 || totalReserveCny > budgetCoverageCny * 0.65) return "medium";
  return "low";
}

export function buildNextMonthReservePlan(data: Pick<
  WorkspaceData,
  "budgets" | "events" | "plans" | "recurringBills" | "insight"
>): NextMonthReservePlan {
  const fixedReserve = sumAmounts(
    data.recurringBills.filter((bill) => bill.enabled),
    (bill) => bill.amountCny
  );
  const relationshipReserve =
    plannedAmount(data.plans, "festival") +
    unplannedEventAmount(
      data.events,
      data.plans,
      (event) => event.source !== "bill" && event.source !== "travel" && Boolean(event.contactId)
    );
  const travelReserve =
    plannedAmount(data.plans, "travel") +
    unplannedEventAmount(data.events, data.plans, (event) => event.source === "travel");
  const elasticBudget = data.budgets.find((budget) => budget.category === "elastic");
  const elasticReserve = Math.max(500, Math.round(Math.max(elasticBudget?.totalCny ?? data.insight.elasticCny, 0) * 0.18));
  const rawItems: NextMonthReserveItem[] = [
    {
      id: "fixed-bills",
      label: "固定账单预留",
      category: "fixed",
      amountCny: fixedReserve,
      priority: "high",
      rationale: `${data.recurringBills.filter((bill) => bill.enabled).length} 个周期账单需优先覆盖。`,
    },
    {
      id: "relationship-events",
      label: "人情关怀预留",
      category: "relationship",
      amountCny: relationshipReserve,
      priority: relationshipReserve > 0 ? "medium" : "low",
      rationale: "覆盖生日、节日、客户宴请和已生成履约方案。",
    },
    {
      id: "travel-plans",
      label: "差旅出行预留",
      category: "travel",
      amountCny: travelReserve,
      priority: travelReserve > 0 ? "medium" : "low",
      rationale: "覆盖已生成差旅方案和下月差旅行程。",
    },
    {
      id: "daily-buffer",
      label: "日常弹性缓冲",
      category: "elastic",
      amountCny: elasticReserve,
      priority: "low",
      rationale: "保留临时餐饮、打车和小额消费缓冲。",
    },
  ];
  const items = rawItems.filter((item) => item.amountCny > 0);
  const totalReserveCny = sumAmounts(items, (item) => item.amountCny);
  const budgetCoverageCny = sumAmounts(data.budgets, (budget) => budget.totalCny);

  return {
    period: nextPeriod(data.insight.period),
    totalReserveCny,
    budgetCoverageCny,
    pressureLevel: pressureLevel(totalReserveCny, budgetCoverageCny, data.insight.pressureIndex),
    items: items.sort((left, right) => right.amountCny - left.amountCny),
  };
}

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
