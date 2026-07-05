import { describe, expect, it } from "vitest";

import { buildDataAssetRemediationTasks } from "../../src/lib/liji/data-asset-remediation";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("data asset remediation", () => {
  it("turns unlinked schedule, finance and fulfillment gaps into tasks", () => {
    const tasks = buildDataAssetRemediationTasks(demoWorkspace);

    expect(tasks.some((task) => task.assetKey === "schedule" && task.cta === "关联账单")).toBe(true);
    expect(tasks.some((task) => task.assetKey === "finance" && task.title.includes("上海差旅"))).toBe(true);
    expect(tasks.some((task) => task.assetKey === "fulfillment" && task.cta === "确认方案")).toBe(true);
    expect(tasks.every((task) => task.section)).toBe(true);
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
