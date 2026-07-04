import { z } from "zod";

import {
  buildOpsAlertLifecycleQueue,
  buildWorkspaceBillingUsageLedger,
  transitionOpsAlertLifecycle,
  type OpsAlertLifecycleAction,
} from "@/lib/liji/commercial-ops";
import { createFulfillmentDiscrepancies, reconcileFulfillmentOrders } from "@/lib/liji/fulfillment-reconciliation";
import { buildProductionCheckReport } from "@/lib/liji/production-check";
import { demoWorkspace } from "@/lib/liji/sample-data";
import { runServiceSmokeSuite } from "@/lib/liji/service-smoke";

const requestSchema = z.object({
  alertId: z.string().min(1),
  action: z.enum(["acknowledge", "resolve", "reopen"]),
  note: z.string().trim().optional(),
});

function demoOpsAlerts() {
  const now = new Date("2026-07-04T10:00:00.000Z");
  const production = buildProductionCheckReport({ now });
  const smoke = runServiceSmokeSuite({
    data: demoWorkspace,
    iterations: 3,
    now,
  });
  const billing = buildWorkspaceBillingUsageLedger({
    data: {
      ...demoWorkspace,
      contacts: Array.from({ length: 21 }, (_, index) => ({
        ...demoWorkspace.contacts[0],
        id: `demo-contact-${index}`,
      })),
    },
    planId: "free",
    now,
  });
  const reconciliation = reconcileFulfillmentOrders([
    {
      id: "ops-disputed",
      userId: "demo-user",
      provider: "jd",
      externalOrderId: "jd-ops-risk",
      status: "failed",
      amountCny: 1299,
      commissionCny: 0,
      settlementStatus: "disputed",
      settlementPeriod: "2026-07",
      receivedAt: "2026-07-04T08:00:00.000Z",
      rawPayload: {},
    },
  ], now);
  const discrepancies = createFulfillmentDiscrepancies(reconciliation, now);

  return buildOpsAlertLifecycleQueue({
    alerts: [
      ...production.p0Actions
        .filter((action) => action.status !== "ready")
        .slice(0, 2)
        .map((action) => ({
          id: `production:${action.id}`,
          severity: action.status === "blocked" ? "critical" as const : "warning" as const,
          source: "production_readiness",
          title: action.title,
          message: action.blockers[0] ?? action.nextSteps[0] ?? "待补齐生产配置。",
          createdAt: production.generatedAt,
        })),
      ...smoke.checks
        .filter((check) => check.status !== "pass")
        .slice(0, 2)
        .map((check) => ({
          id: `service-smoke:${check.id}`,
          severity: check.status === "warn" ? "warning" as const : "critical" as const,
          source: "service_smoke",
          title: check.label,
          message: check.detail,
          createdAt: smoke.generatedAt,
        })),
      ...billing.ledger.entries
        .filter((entry) => entry.status !== "included")
        .map((entry) => ({
          id: `billing:${entry.key}`,
          severity: entry.status === "blocked" ? "critical" as const : "warning" as const,
          source: "billing_entitlement",
          title: `${entry.label}额度异常`,
          message: entry.note,
          createdAt: entry.occurredAt,
        })),
      ...discrepancies.slice(0, 2).map((discrepancy) => ({
        id: `fulfillment:${discrepancy.id}`,
        severity: discrepancy.severity,
        source: "fulfillment_cps",
        title: `${discrepancy.provider} 订单差异`,
        message: discrepancy.reason,
        createdAt: discrepancy.createdAt,
      })),
    ],
  });
}

export async function GET() {
  return Response.json({
    source: "demo",
    alerts: demoOpsAlerts(),
  });
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const alerts = demoOpsAlerts();
  const alert = alerts.find((candidate) => candidate.id === body.alertId) ?? alerts[0];
  const updated = transitionOpsAlertLifecycle({
    alert,
    action: body.action as OpsAlertLifecycleAction,
    note: body.note,
    now: new Date("2026-07-04T10:30:00.000Z"),
  });

  return Response.json({
    source: "demo",
    alert: updated,
  });
}
