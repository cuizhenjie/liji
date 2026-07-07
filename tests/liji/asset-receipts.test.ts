import { describe, expect, it } from "vitest";

import { buildAssetReceipts } from "../../src/lib/liji/asset-receipts";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { acknowledgeEvent } from "../../src/lib/liji/workflow";

describe("asset receipts", () => {
  it("shows completed assets without treating open reminders as settled", () => {
    const receipts = buildAssetReceipts(demoWorkspace, 20);

    expect(receipts.some((receipt) => receipt.title === "提醒资产：周明客户宴请")).toBe(false);
    expect(receipts.find((receipt) => receipt.title === "账单资产：房贷扣款")).toMatchObject({
      kind: "finance",
      section: "finance",
      cta: "查看账单",
    });
    expect(receipts.some((receipt) => receipt.kind === "memory")).toBe(true);
    expect(receipts.every((receipt) => receipt.timestamp.length > 0)).toBe(true);
  });

  it("turns a confirmed level one reminder into a reusable schedule asset receipt", () => {
    const acknowledged = acknowledgeEvent(demoWorkspace, "e-client-dinner");
    const receipts = buildAssetReceipts(acknowledged, 3);

    expect(receipts[0]).toMatchObject({
      kind: "schedule",
      title: "提醒资产：周明客户宴请",
      section: "calendar",
      cta: "查看日程",
    });
    expect(receipts[0].detail).toContain("周明");
    expect(receipts[0].evidence).toContain("停止升级");
  });
});
