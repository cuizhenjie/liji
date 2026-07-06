import { describe, expect, it } from "vitest";

import { buildRelationshipActions } from "../../src/lib/liji/relationship-actions";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("relationship actions", () => {
  it("turns VIP events and profile assets into secretary actions", () => {
    const actions = buildRelationshipActions(demoWorkspace);

    expect(actions[0]).toMatchObject({
      contactId: "c-client",
      eventId: "e-client-dinner",
      priority: "critical",
      scenario: "compliance",
      title: "确认 周明客户宴请 的合规与偏好",
    });
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contactId: "c-daughter",
          priority: "high",
          title: "确认 李小满5岁生日履约方案",
          cta: "确认方案",
        }),
        expect.objectContaining({
          contactId: "c-client",
          memoryId: "m-1",
          scenario: "memory",
          title: "复核 周明 的 AI 记忆",
        }),
      ])
    );
  });

  it("prompts a follow-up when a VIP has gone cold", () => {
    const actions = buildRelationshipActions({
      ...demoWorkspace,
      contacts: demoWorkspace.contacts.map((contact) =>
        contact.id === "c-mother"
          ? { ...contact, lastInteractionAt: "2026-04-15T08:30:00+08:00" }
          : contact
      ),
    });

    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contactId: "c-mother",
          priority: "high",
          scenario: "follow_up",
          title: "安排 陈兰 的关系触达",
          evidence: "77 天未互动",
        }),
      ])
    );
  });
});
