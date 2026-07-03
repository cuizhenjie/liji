import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPlanFulfillmentLinks,
  summarizePlanCps,
} from "../../src/lib/liji/fulfillment";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("fulfillment links", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds tracking parameters for external plan items", () => {
    const links = buildPlanFulfillmentLinks(demoWorkspace.plans[0], "u-demo");

    expect(links.length).toBeGreaterThan(0);
    expect(links[0].url).toContain("utm_source=liji");
    expect(links[0].url).toContain("liji_plan_id=");
    expect(links[0].url).toContain("liji_user=u-demo");
    expect(links[0].trackingParams.cps_provider).toBe(links[0].provider);
    expect(links[0].amountCny).toBeGreaterThan(0);
  });

  it("adds CPS parameters and summary when affiliate IDs are available", () => {
    vi.stubEnv("JD_UNION_ID", "jd-union-1");

    const links = buildPlanFulfillmentLinks(demoWorkspace.plans[0], "u-demo");
    const jdLink = links.find((link) => link.provider === "jd");
    const summary = summarizePlanCps(demoWorkspace.plans[0], "u-demo");

    expect(jdLink?.cpsReady).toBe(true);
    expect(jdLink?.url).toContain("jd_union_id=jd-union-1");
    expect(jdLink?.estimatedCommissionCny).toBeGreaterThan(0);
    expect(summary.totalTrackedAmountCny).toBeGreaterThan(0);
    expect(summary.cpsReadyCount).toBeGreaterThan(0);
  });
});
