import { describe, expect, it } from "vitest";

import { buildDataAssetRemediationTasks } from "../../src/lib/liji/data-asset-remediation";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("data asset remediation", () => {
  it("does not ask users to relink bill events that are already backed by recurring bills", () => {
    const tasks = buildDataAssetRemediationTasks(demoWorkspace);

    expect(tasks.some((task) => task.title === "关联日程：房贷扣款")).toBe(false);
    expect(tasks.some((task) => task.assetKey === "finance" && task.title.includes("上海差旅"))).toBe(true);
    expect(tasks.some((task) => task.assetKey === "fulfillment" && task.cta === "确认方案")).toBe(true);
    expect(tasks.every((task) => task.section)).toBe(true);
  });

  it("keeps bill schedule remediation when the recurring bill asset is missing", () => {
    const tasks = buildDataAssetRemediationTasks({
      ...demoWorkspace,
      recurringBills: [],
    });

    expect(tasks.some((task) => task.assetKey === "schedule" && task.cta === "关联账单")).toBe(true);
    expect(tasks.find((task) => task.title === "关联日程：房贷扣款")).toMatchObject({
      assetKey: "schedule",
      section: "finance",
    });
  });

  it("prioritizes stale memory and high-risk compliance gaps", () => {
    const tasks = buildDataAssetRemediationTasks({
      ...demoWorkspace,
      contacts: [{
        ...demoWorkspace.contacts[1],
        compliance: {
          riskTags: ["国企高管"],
          policyNote: "",
        },
      }],
      aiMemories: [{
        ...demoWorkspace.aiMemories[0],
        reviewStatus: "stale",
      }],
    });

    expect(tasks[0]).toMatchObject({
      assetKey: "memory",
      priority: "critical",
    });
    expect(tasks.some((task) => task.assetKey === "compliance" && task.priority === "high")).toBe(true);
  });
});
