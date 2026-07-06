import { describe, expect, it } from "vitest";

import { buildFulfillmentConciergePack } from "../../src/lib/liji/fulfillment-concierge";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("fulfillment concierge pack", () => {
  it("turns a family birthday plan into card copy and handoff checks", () => {
    const plan = demoWorkspace.plans.find((item) => item.scenario === "festival");
    const contact = demoWorkspace.contacts.find((item) => item.id === plan?.contactId);

    expect(plan).toBeDefined();

    const pack = buildFulfillmentConciergePack(plan!, contact);

    expect(pack.title).toBe("礼仪交付包");
    expect(pack.tone).toBe("family_warm");
    expect(pack.primaryCopy).toContain("生日快乐");
    expect(pack.secondaryCopy).toContain("芒果过敏");
    expect(pack.packagingOptions).toContain("随单放入手写祝福卡");
    expect(pack.handoffChecklist.some((item) => item.includes("外部跳转链接"))).toBe(true);
  });

  it("keeps business gifts reserved and compliance aware", () => {
    const plan = {
      ...demoWorkspace.plans[0],
      contactId: "c-client",
    };
    const contact = demoWorkspace.contacts.find((item) => item.id === "c-client");
    const pack = buildFulfillmentConciergePack(plan, contact);

    expect(pack.tone).toBe("business_reserved");
    expect(pack.primaryCopy).toContain("信任与支持");
    expect(pack.packagingOptions).toContain("去除价格标签和平台小票");
    expect(pack.riskNotes.join(" ")).toContain("商务合规限制");
  });
});
