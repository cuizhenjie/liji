import { demoEvents, demoTransactions } from "@/lib/liji/sample-data";
import { generateMonthlyInsight } from "@/lib/liji/insights";

const recurringBills = [
  {
    id: "rb-mortgage",
    title: "房贷",
    amountCny: 12800,
    dueDay: 2,
    accountLabel: "招商银行尾号 8621",
    reminderLevel: "level_1" as const,
    enabled: true,
  },
];

export async function GET() {
  return Response.json({
    insight: generateMonthlyInsight({
      period: "2026-06",
      transactions: demoTransactions,
      recurringBills,
      nextMonthEvents: demoEvents,
    }),
  });
}
