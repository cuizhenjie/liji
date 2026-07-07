import { describe, expect, it } from "vitest";

import { buildFulfillmentAgenda } from "../../src/lib/liji/fulfillment-agenda";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { setPlanStatus } from "../../src/lib/liji/workflow";

describe("fulfillment agenda", () => {
  it("prioritizes open fulfillment plans with the next executable action", () => {
    const agenda = buildFulfillmentAgenda({
      contacts: demoWorkspace.contacts,
      plans: demoWorkspace.plans,
    });

    expect(agenda[0]).toMatchObject({
      title: "李小满5岁生日履约方案",
      status: "blocked",
      assetState: "高风险待复核",
      cta: "确认方案",
      action: {
        kind: "confirm_plan",
      },
    });
    expect(agenda.some((item) => item.evidence.includes("外部跳转"))).toBe(true);
  });

  it("marks confirmed plans as reusable fulfillment assets", () => {
    const confirmed = setPlanStatus(demoWorkspace, demoWorkspace.plans[0].id, "confirmed");
    const agenda = buildFulfillmentAgenda({
      contacts: confirmed.contacts,
      plans: confirmed.plans,
    });

    expect(agenda.find((item) => item.planId === demoWorkspace.plans[0].id)).toMatchObject({
      status: "ready",
      assetState: "履约资产已沉淀",
      cta: "归档方案",
      action: {
        kind: "bookmark_plan",
      },
    });
  });
});
