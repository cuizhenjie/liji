import { describe, expect, it } from "vitest";

import { buildEntitlementReport } from "../../src/lib/liji/entitlements";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("membership entitlements", () => {
  it("meters workspace usage against plan limits", () => {
    const report = buildEntitlementReport({
      data: {
        ...demoWorkspace,
        contacts: Array.from({ length: 21 }, (_, index) => ({
          ...demoWorkspace.contacts[0],
          id: `contact-${index}`,
        })),
      },
      planId: "free",
    });

    expect(report.plan.id).toBe("free");
    expect(report.upgradeRecommended).toBe(true);
    expect(report.nextBestPlan).toBe("pro");
    expect(report.usage.find((item) => item.key === "contacts")).toMatchObject({
      used: 21,
      status: "exceeded",
    });
  });
});
