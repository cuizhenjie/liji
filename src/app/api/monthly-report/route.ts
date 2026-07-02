import { createAuditLogEntry, persistAuditLog } from "@/lib/liji/audit";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { createUuid } from "@/lib/liji/ids";
import { generateMonthlyInsight, previousMonthPeriod } from "@/lib/liji/insights";
import { demoEvents, demoTransactions, demoWorkspace } from "@/lib/liji/sample-data";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import {
  mapEvent,
  mapRecurringBill,
  mapTransaction,
} from "@/lib/liji/supabase-mappers";

async function generateSupabaseReports(period: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id");

  if (profileError) {
    throw new Error(profileError.message);
  }

  const reports = [];

  for (const profile of profiles ?? []) {
    const userId = typeof profile.id === "string" ? profile.id : "";
    if (!userId) {
      continue;
    }

    const [transactions, recurringBills, events] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId),
      supabase.from("recurring_bills").select("*").eq("user_id", userId),
      supabase.from("events").select("*").eq("user_id", userId),
    ]);
    const error = transactions.error ?? recurringBills.error ?? events.error;
    if (error) {
      throw new Error(error.message);
    }

    const insight = generateMonthlyInsight({
      period,
      transactions: (transactions.data ?? []).map(mapTransaction),
      recurringBills: (recurringBills.data ?? []).map(mapRecurringBill),
      nextMonthEvents: (events.data ?? []).map(mapEvent),
    });
    const report = {
      id: createUuid(),
      userId,
      period,
      insight,
      generatedAt: new Date().toISOString(),
    };
    const { error: reportError } = await supabase.from("monthly_reports").upsert(
      {
        id: report.id,
        user_id: userId,
        period,
        insight,
        generated_at: report.generatedAt,
      },
      { onConflict: "user_id,period" }
    );

    if (reportError) {
      throw new Error(reportError.message);
    }

    const audit = createAuditLogEntry({
      userId,
      action: "create",
      entityTable: "monthly_reports",
      entityId: report.id,
      metadata: { period },
    });
    await persistAuditLog(audit, supabase);
    reports.push(report);
  }

  return reports;
}

export async function GET(request?: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const period = request
    ? new URL(request.url).searchParams.get("period") ?? previousMonthPeriod()
    : previousMonthPeriod();
  const reports = await generateSupabaseReports(period);
  if (reports) {
    return Response.json({
      reports,
      source: "supabase",
    });
  }

  const insight = generateMonthlyInsight({
    period,
    transactions: demoTransactions,
    recurringBills: demoWorkspace.recurringBills,
    nextMonthEvents: demoEvents,
  });
  const report = {
    id: createUuid(),
    period,
    insight,
    generatedAt: new Date().toISOString(),
  };
  const audit = createAuditLogEntry({
    action: "create",
    entityTable: "monthly_reports",
    entityId: report.id,
    metadata: { period },
  });
  const auditPersistence = await persistAuditLog(audit, createSupabaseServiceClient());

  return Response.json({
    report,
    audit,
    auditPersistence,
    source: "demo",
  });
}
