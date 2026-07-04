import { describe, expect, it } from "vitest";

import {
  fulfillmentOrderUpdatePatch,
  mapFulfillmentOrderUpdateRow,
  normalizeSettlementStatus,
  reconcileFulfillmentOrders,
  reconciliationReportPayload,
  type FulfillmentOrderUpdate,
} from "../../src/lib/liji/fulfillment-reconciliation";

describe("fulfillment reconciliation", () => {
  it("normalizes settlement status from provider order status", () => {
    expect(normalizeSettlementStatus("settled", "paid")).toBe("settled");
    expect(normalizeSettlementStatus(undefined, "paid")).toBe("pending");
    expect(normalizeSettlementStatus(undefined, "fulfilled")).toBe("eligible");
    expect(normalizeSettlementStatus(undefined, "refunded")).toBe("reversed");
    expect(normalizeSettlementStatus(undefined, "cancelled")).toBe("reversed");
    expect(normalizeSettlementStatus(undefined, "failed")).toBe("disputed");
    expect(normalizeSettlementStatus(undefined, "clicked")).toBe("not_applicable");
  });

  it("groups provider updates into monthly settlement totals", () => {
    const updates: FulfillmentOrderUpdate[] = [
      {
        id: "u-1",
        userId: "user-1",
        planId: "plan-1",
        planItemId: "item-1",
        provider: "jd",
        externalOrderId: "order-1",
        status: "paid",
        amountCny: 1000,
        settlementStatus: "pending",
        receivedAt: "2026-07-03T01:00:00.000Z",
        rawPayload: {},
      },
      {
        id: "u-2",
        userId: "user-1",
        planId: "plan-1",
        planItemId: "item-1",
        provider: "jd",
        externalOrderId: "order-1",
        status: "fulfilled",
        amountCny: 1000,
        commissionCny: 30,
        settlementStatus: "settled",
        settlementPeriod: "2026-07",
        receivedAt: "2026-07-04T01:00:00.000Z",
        rawPayload: {},
      },
      {
        id: "u-3",
        userId: "user-1",
        provider: "meituan",
        externalOrderId: "order-2",
        status: "paid",
        amountCny: 480,
        settlementStatus: "pending",
        receivedAt: "2026-07-05T01:00:00.000Z",
        rawPayload: {},
      },
      {
        id: "u-4",
        userId: "user-1",
        provider: "meituan",
        externalOrderId: "order-2",
        status: "refunded",
        refundedAmountCny: 200,
        settlementStatus: "reversed",
        settlementPeriod: "2026-07",
        receivedAt: "2026-07-06T01:00:00.000Z",
        rawPayload: {},
      },
      {
        id: "u-5",
        userId: "user-1",
        provider: "taobao",
        externalOrderId: "order-3",
        status: "failed",
        settlementStatus: "disputed",
        receivedAt: "2026-07-07T01:00:00.000Z",
        rawPayload: {},
      },
    ];

    const summary = reconcileFulfillmentOrders(
      updates,
      new Date("2026-07-31T16:00:00.000Z")
    );

    expect(summary.generatedAt).toBe("2026-07-31T16:00:00.000Z");
    expect(summary.orders).toBe(3);
    expect(summary.paidOrders).toBe(1);
    expect(summary.refundedOrders).toBe(1);
    expect(summary.settledOrders).toBe(1);
    expect(summary.disputedOrders).toBe(2);
    expect(summary.grossAmountCny).toBe(1480);
    expect(summary.refundedAmountCny).toBe(200);
    expect(summary.netAmountCny).toBe(1000);
    expect(summary.commissionCny).toBe(30);
    expect(summary.providers.find((item) => item.provider === "jd")?.commissionCny).toBe(30);
    expect(summary.items.find((item) => item.externalOrderId === "order-2")?.riskFlags).toContain(
      "refund_or_cancelled"
    );
    expect(summary.items.find((item) => item.externalOrderId === "order-3")?.riskFlags).toEqual([
      "unmatched_plan",
      "settlement_disputed",
      "provider_failed",
    ]);
  });

  it("maps database rows and report payloads into stable JSON fields", () => {
    const update = mapFulfillmentOrderUpdateRow({
      id: "row-1",
      user_id: "user-1",
      plan_id: "plan-1",
      plan_item_id: "item-1",
      provider: "ctrip",
      external_order_id: "order-1",
      status: "fulfilled",
      amount_cny: "880.50",
      commission_cny: "17.61",
      refunded_amount_cny: null,
      settlement_status: "settled",
      settlement_period: "2026-07",
      received_at: "2026-07-03T01:00:00.000Z",
      reconciled_at: "2026-07-31T16:00:00.000Z",
      raw_payload: { vendor: "ctrip" },
    });

    expect(update?.provider).toBe("ctrip");
    expect(update?.amountCny).toBe(880.5);
    expect(update?.commissionCny).toBe(17.61);
    expect(update?.settlementStatus).toBe("settled");

    const patch = fulfillmentOrderUpdatePatch({
      commissionCny: 17.61,
      refundedAmountCny: undefined,
      settlementStatus: "settled",
      settlementPeriod: "2026-07",
    });
    expect(patch).toEqual({
      commission_cny: 17.61,
      refunded_amount_cny: null,
      settlement_status: "settled",
      settlement_period: "2026-07",
    });

    const summary = reconcileFulfillmentOrders([update!], new Date("2026-07-31T16:00:00.000Z"));
    expect(reconciliationReportPayload(summary)).toMatchObject({
      kind: "fulfillment_reconciliation",
      orders: 1,
      commissionCny: 17.61,
    });
  });
});
