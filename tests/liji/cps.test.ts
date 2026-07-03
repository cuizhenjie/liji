import { describe, expect, it } from "vitest";

import {
  buildCpsAttribution,
  summarizeCpsAttribution,
} from "../../src/lib/liji/cps";

describe("CPS attribution", () => {
  it("marks provider links as CPS-ready when affiliate IDs are configured", () => {
    const attribution = buildCpsAttribution({
      provider: "jd",
      amountCny: 1200,
      planId: "plan-1",
      scenario: "festival",
      userId: "user-1",
      env: { JD_UNION_ID: "jd-union-1" },
    });

    expect(attribution.cpsReady).toBe(true);
    expect(attribution.settlementMode).toBe("cps");
    expect(attribution.estimatedCommissionCny).toBe(36);
    expect(attribution.trackingParams.jd_union_id).toBe("jd-union-1");
  });

  it("falls back to search-link settlement without affiliate IDs", () => {
    const attribution = buildCpsAttribution({
      provider: "ctrip",
      amountCny: 2000,
      planId: "plan-2",
      scenario: "travel",
      userId: "user-2",
      env: {},
    });

    expect(attribution.cpsReady).toBe(false);
    expect(attribution.settlementMode).toBe("search_link");
    expect(attribution.estimatedCommissionCny).toBe(0);
    expect(attribution.trackingParams.cps_provider).toBe("ctrip");
  });

  it("summarizes tracked amount and estimated commission", () => {
    const summary = summarizeCpsAttribution([
      {
        provider: "jd",
        amountCny: 1000,
        estimatedCommissionCny: 30,
        settlementMode: "cps",
      },
      {
        provider: "meituan",
        amountCny: 300,
        estimatedCommissionCny: 0,
        settlementMode: "search_link",
      },
    ]);

    expect(summary.totalTrackedAmountCny).toBe(1300);
    expect(summary.totalEstimatedCommissionCny).toBe(30);
    expect(summary.cpsReadyCount).toBe(1);
    expect(summary.searchLinkCount).toBe(1);
  });
});
