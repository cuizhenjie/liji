import { describe, expect, it } from "vitest";

import { buildDataAssetLedger } from "../../src/lib/liji/data-asset-ledger";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("data asset ledger", () => {
  it("explains why bill events and manual transactions are counted as assets or gaps", () => {
    const ledger = buildDataAssetLedger(demoWorkspace, 20);

    expect(ledger.find((entry) => entry.id === "schedule:e-mortgage")).toMatchObject({
      status: "linked",
      detail: "已关联周期账单 房贷",
      section: "finance",
    });
    expect(ledger.find((entry) => entry.id === "finance:t-travel")).toMatchObject({
      status: "needs_action",
      detail: "手动交易待关联关系、差旅或账单来源",
      cta: "关联交易",
    });
    expect(ledger.find((entry) => entry.id.startsWith("fulfillment:") && entry.title.includes("李小满"))).toMatchObject({
      status: "needs_action",
      cta: "确认方案",
    });
  });

  it("keeps blocked and actionable entries ahead of healthy assets", () => {
    const ledger = buildDataAssetLedger({
      ...demoWorkspace,
      aiMemories: [{
        ...demoWorkspace.aiMemories[0],
        reviewStatus: "stale",
      }],
    });

    expect(ledger[0]).toMatchObject({
      assetKey: "memory",
      status: "blocked",
      cta: "复核记忆",
    });
    expect(ledger.findIndex((entry) => entry.status === "needs_action")).toBeLessThan(
      ledger.findIndex((entry) => entry.status === "linked")
    );
  });
});
