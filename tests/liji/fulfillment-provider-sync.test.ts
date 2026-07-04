import { describe, expect, it } from "vitest";

import {
  buildFulfillmentFinanceCsv,
  configuredFulfillmentProviderSyncConfigs,
  normalizeFulfillmentProviderOrders,
  signFulfillmentProviderSyncRequest,
} from "../../src/lib/liji/fulfillment-provider-sync";
import { reconcileFulfillmentOrders } from "../../src/lib/liji/fulfillment-reconciliation";

describe("fulfillment provider sync", () => {
  it("normalizes provider order payloads from common affiliate fields", () => {
    const orders = normalizeFulfillmentProviderOrders({
      provider: "jd",
      payload: {
        orders: [
          {
            order_id: "jd-order-1",
            order_status: "settled",
            liji_plan_id: "plan-1",
            paid_fee: "1299",
            pub_share_fee: "38.97",
            settlement_status: "settled",
            settlement_period: "2026-07",
          },
        ],
      },
      now: new Date("2026-07-03T10:00:00Z"),
    });

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      provider: "jd",
      externalOrderId: "jd-order-1",
      status: "fulfilled",
      planId: "plan-1",
      amountCny: 1299,
      commissionCny: 38.97,
      settlementStatus: "settled",
      settlementPeriod: "2026-07",
    });
  });

  it("keeps unknown provider statuses out of paid revenue states", () => {
    const orders = normalizeFulfillmentProviderOrders({
      provider: "taobao",
      payload: [{ order_id: "order-unknown", status: "mystery", amount_cny: 600 }],
    });

    expect(orders[0].status).toBe("clicked");
  });

  it("signs provider sync requests and resolves configured providers", () => {
    const signature = signFulfillmentProviderSyncRequest({
      provider: "meituan",
      timestamp: "2026-07-03T10:00:00Z",
      secret: "secret",
    });
    const configured = configuredFulfillmentProviderSyncConfigs({
      MEITUAN_ORDER_API_ENDPOINT: "https://provider.example.test/orders",
      MEITUAN_ORDER_API_SECRET: "secret",
    });

    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(configured).toEqual([
      {
        provider: "meituan",
        endpoint: "https://provider.example.test/orders",
        secret: "secret",
      },
    ]);
  });

  it("exports reconciliation summaries as finance CSV", () => {
    const summary = reconcileFulfillmentOrders([
      {
        id: "u-1",
        userId: "user-1",
        provider: "jd",
        externalOrderId: "order-1",
        status: "fulfilled",
        amountCny: 1000,
        commissionCny: 30,
        settlementStatus: "settled",
        settlementPeriod: "2026-07",
        receivedAt: "2026-07-03T10:00:00Z",
        rawPayload: {},
      },
    ]);

    const csv = buildFulfillmentFinanceCsv(summary);

    expect(csv.split("\n")[0]).toContain("external_order_id");
    expect(csv).toContain('"order-1"');
    expect(csv).toContain('"30"');
  });
});
