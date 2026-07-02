import { describe, expect, it } from "vitest";

import { buildPlanFulfillmentLinks } from "../../src/lib/liji/fulfillment";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("fulfillment links", () => {
  it("adds tracking parameters for external plan items", () => {
    const links = buildPlanFulfillmentLinks(demoWorkspace.plans[0], "u-demo");

    expect(links.length).toBeGreaterThan(0);
    expect(links[0].url).toContain("utm_source=liji");
    expect(links[0].url).toContain("liji_plan_id=");
    expect(links[0].url).toContain("liji_user=u-demo");
  });
});
