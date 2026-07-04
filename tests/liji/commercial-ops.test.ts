import { describe, expect, it } from "vitest";

import {
  applyCpsFinanceApprovalAction,
  buildBillingUsageLedger,
  buildCpsPayoutBatch,
  buildOpsAlertLifecycleQueue,
  createBillingCheckoutIntent,
  createBillingInvoiceRequest,
  createCpsFinanceApprovalQueue,
  transitionOpsAlertLifecycle,
} from "../../src/lib/liji/commercial-ops";
import { buildEntitlementReport } from "../../src/lib/liji/entitlements";
import { reconcileFulfillmentOrders } from "../../src/lib/liji/fulfillment-reconciliation";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("commercial operations", () => {
  it("builds billable entitlement ledger entries from overage usage", () => {
    const report = buildEntitlementReport({
      data: {
        ...demoWorkspace,
        aiMemories: Array.from({ length: 55 }, (_, index) => ({
          ...demoWorkspace.aiMemories[0],
          id: `memory-${index}`,
        })),
      },
      planId: "free",
    });
    const ledger = buildBillingUsageLedger({
      report,
      now: new Date("2026-07-04T10:00:00.000Z"),
    });
    const aiMemoryEntry = ledger.entries.find((entry) => entry.key === "aiMemories");

    expect(aiMemoryEntry).toMatchObject({
      overageQuantity: 5,
      status: "billable",
      amountCny: 0.1,
    });
    expect(ledger.billableEntries).toBe(1);
    expect(ledger.totalBillableCny).toBe(0.1);
  });

  it("creates checkout and invoice intents before real payment providers are wired", () => {
    const checkout = createBillingCheckoutIntent({
      planId: "pro",
      now: new Date("2026-07-04T10:00:00.000Z"),
    });
    const readyCheckout = createBillingCheckoutIntent({
      planId: "pro",
      provider: "stripe",
      checkoutBaseUrl: "https://pay.example.test/checkout",
      successUrl: "https://liji.example.test/success",
      now: new Date("2026-07-04T10:00:00.000Z"),
    });
    const invoice = createBillingInvoiceRequest({
      amountCny: 699,
      buyerTitle: "礼记科技",
      email: "finance@example.test",
      now: new Date("2026-07-04T10:00:00.000Z"),
    });

    expect(checkout.status).toBe("manual_review_required");
    expect(readyCheckout.status).toBe("ready");
    expect(readyCheckout.checkoutUrl).toContain("plan=pro");
    expect(invoice.status).toBe("queued");
    expect(invoice.warnings).toContain("500 元以上建议补充税号。");
  });

  it("queues CPS finance approvals and builds payout batches", () => {
    const summary = reconcileFulfillmentOrders([
      {
        id: "paid",
        provider: "jd",
        externalOrderId: "jd-1",
        status: "fulfilled",
        amountCny: 1000,
        commissionCny: 30,
        settlementStatus: "settled",
        settlementPeriod: "2026-07",
        receivedAt: "2026-07-04T09:00:00.000Z",
        rawPayload: {},
      },
      {
        id: "risk",
        provider: "taobao",
        externalOrderId: "tb-1",
        status: "failed",
        amountCny: 800,
        settlementStatus: "disputed",
        settlementPeriod: "2026-07",
        receivedAt: "2026-07-04T09:30:00.000Z",
        rawPayload: {},
      },
    ], new Date("2026-07-04T10:00:00.000Z"));
    const queue = createCpsFinanceApprovalQueue({
      summary,
      now: new Date("2026-07-04T10:00:00.000Z"),
    });
    const approved = applyCpsFinanceApprovalAction({
      item: queue.find((item) => item.provider === "jd")!,
      action: "approve_payout",
      note: "结算金额无误。",
      now: new Date("2026-07-04T10:30:00.000Z"),
    });
    const payout = buildCpsPayoutBatch([approved, ...queue.filter((item) => item.id !== approved.id)]);

    expect(queue.find((item) => item.provider === "taobao")?.status).toBe("held");
    expect(approved.status).toBe("approved");
    expect(payout.totalCommissionCny).toBe(30);
    expect(payout.heldItems).toBe(1);
  });

  it("tracks ops alert acknowledgement and resolution state", () => {
    const alerts = buildOpsAlertLifecycleQueue({
      alerts: [{
        id: "billing:aiMemories",
        severity: "warning",
        source: "billing_entitlement",
        title: "AI 记忆额度异常",
        message: "超出套餐额度。",
        createdAt: "2026-07-04T10:00:00.000Z",
      }],
    });
    const acknowledged = transitionOpsAlertLifecycle({
      alert: alerts[0],
      action: "acknowledge",
      note: "财务跟进。",
      now: new Date("2026-07-04T10:15:00.000Z"),
    });
    const resolved = transitionOpsAlertLifecycle({
      alert: acknowledged,
      action: "resolve",
      now: new Date("2026-07-04T10:30:00.000Z"),
    });

    expect(alerts[0].ownerRole).toBe("growth");
    expect(acknowledged.status).toBe("acknowledged");
    expect(resolved.status).toBe("resolved");
    expect(resolved.acknowledgedAt).toBe("2026-07-04T10:15:00.000Z");
  });
});
