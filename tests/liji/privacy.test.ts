import { describe, expect, it } from "vitest";

import {
  cloudDeletionTableOrder,
  createDeletionRequest,
  exportWorkspaceData,
  redactWorkspaceData,
} from "../../src/lib/liji/privacy";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("privacy operations", () => {
  it("exports workspace data with a stable schema marker", () => {
    const exported = JSON.parse(exportWorkspaceData(demoWorkspace));

    expect(exported.schema).toBe("liji.workspace.export.v1");
    expect(exported.data.contacts.length).toBeGreaterThan(0);
  });

  it("redacts direct identifiers and queues deletion requests", () => {
    const redacted = redactWorkspaceData(demoWorkspace);
    const deletion = createDeletionRequest("local", new Date("2026-07-02T09:00:00+08:00"));

    expect(redacted.contacts[0].name).toBe("[NAME]");
    expect(redacted.aiMemories[0].content).toBe("[AI_MEMORY]");
    expect(redacted.privacy.notificationPhone).toBe("[PHONE]");
    expect(deletion.status).toBe("queued");
  });

  it("deletes cloud data from child tables before parent tables", () => {
    expect(cloudDeletionTableOrder.indexOf("plan_items")).toBeLessThan(
      cloudDeletionTableOrder.indexOf("plans")
    );
    expect(cloudDeletionTableOrder.indexOf("notification_logs")).toBeLessThan(
      cloudDeletionTableOrder.indexOf("events")
    );
    expect(cloudDeletionTableOrder).toContain("fulfillment_order_updates");
    expect(cloudDeletionTableOrder.indexOf("ai_memories")).toBeLessThan(
      cloudDeletionTableOrder.indexOf("contacts")
    );
  });
});
