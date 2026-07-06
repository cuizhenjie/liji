import { describe, expect, it } from "vitest";

import {
  buildAiContinuityReport,
  buildAssistantActions,
  buildDataAssetReport,
  buildScenarioJourneys,
} from "../../src/lib/liji/secretary-command-center";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import type { CaptureItem } from "../../src/lib/liji/types";

const pendingCapture: CaptureItem = {
  id: "capture-low-confidence",
  rawText: "周明下周三宴请预算500",
  maskedText: "周明下周三宴请预算500",
  sourceType: "chat",
  status: "pending",
  piiTokens: [],
  createdAt: "2026-07-04T10:00:00.000Z",
  parsed: {
    intent: "event",
    title: "周明客户宴请",
    targetName: "周明",
    date: "2026-07-08",
    budgetCny: 500,
    reminderLevel: "level_1",
    confidence: 0.68,
  },
};

describe("secretary command center", () => {
  it("prioritizes red-line reminders before lower-risk captures and recommendations", () => {
    const actions = buildAssistantActions({
      data: {
        ...demoWorkspace,
        captures: [pendingCapture],
      },
      levelTwoCards: [{
        id: "level2-demo",
        eventId: "e-daughter-birthday",
        title: "生日推荐卡",
        date: "2026-07-10",
        daysUntil: 2,
        priority: "soon",
        recommendation: "提前锁定礼物和蛋糕。",
        actions: ["生成履约方案"],
        warnings: [],
      }],
    });

    expect(actions[0]).toMatchObject({
      priority: "critical",
      scenario: "reminder",
    });
    expect(actions.some((action) => action.id === "capture:capture-low-confidence")).toBe(true);
    expect(actions.find((action) => action.id === "level2:level2-demo")).toMatchObject({
      title: "李小满5岁生日履约方案待确认",
      cta: "确认方案",
    });
  });

  it("turns relationship, finance and memory coverage into an asset health report", () => {
    const healthyReport = buildDataAssetReport(demoWorkspace);
    expect(healthyReport.items.find((item) => item.key === "schedule")).toMatchObject({
      owned: 3,
      total: 3,
      status: "healthy",
    });

    const report = buildDataAssetReport({
      ...demoWorkspace,
      plans: demoWorkspace.plans.map((plan) => ({ ...plan, status: "confirmed" })),
      contacts: demoWorkspace.contacts.map((contact, index) =>
        index === 0 ? { ...contact, preferences: [] } : contact
      ),
      aiMemories: [{
        ...demoWorkspace.aiMemories[0],
        reviewStatus: "review_required",
      }],
    });

    expect(report.score).toBeLessThan(100);
    expect(report.items.find((item) => item.key === "relationship")?.status).not.toBe("healthy");
    expect(report.items.find((item) => item.key === "relationship")?.section).toBe("contacts");
    expect(report.items.find((item) => item.key === "finance")?.section).toBe("finance");
    expect(report.nextAssetAction).toContain("AI 记忆");

    const fulfillmentReport = buildDataAssetReport(demoWorkspace);
    expect(fulfillmentReport.items.find((item) => item.key === "fulfillment")).toMatchObject({
      owned: 0,
      total: 2,
      status: "blocked",
    });
  });

  it("removes Level 2 fulfillment actions once the matching plan is confirmed", () => {
    const actions = buildAssistantActions({
      data: {
        ...demoWorkspace,
        events: demoWorkspace.events.map((event) =>
          event.reminderLevel === "level_1" ? { ...event, status: "confirmed" } : event
        ),
        plans: demoWorkspace.plans.map((plan) =>
          plan.eventId === "e-daughter-birthday" ? { ...plan, status: "confirmed" } : plan
        ),
      },
      levelTwoCards: [{
        id: "level2-demo",
        eventId: "e-daughter-birthday",
        title: "生日推荐卡",
        date: "2026-07-10",
        daysUntil: 2,
        priority: "soon",
        recommendation: "提前锁定礼物和蛋糕。",
        actions: ["生成履约方案"],
        warnings: [],
      }],
    });

    expect(actions.some((action) => action.id === "level2:level2-demo")).toBe(false);
  });

  it("keeps AI work usable when cloud model access is unavailable", () => {
    const continuity = buildAiContinuityReport({
      ...demoWorkspace,
      captures: [pendingCapture, pendingCapture, pendingCapture, pendingCapture],
      privacy: {
        ...demoWorkspace.privacy,
        cloudModelEnabled: false,
      },
      aiMemories: [{
        ...demoWorkspace.aiMemories[0],
        reviewStatus: "stale",
      }],
    });

    expect(continuity.mode).toBe("local_guarded");
    expect(continuity.status).toBe("attention");
    expect(continuity.safeguards).toContain("本地规则兜底解析");
    expect(continuity.interruptionRisks.join(" ")).toContain("云端模型未授权");
    expect(continuity.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "privacy_authorization", section: "privacy" }),
        expect.objectContaining({ id: "confirm_queue", section: "dashboard" }),
        expect.objectContaining({ id: "memory_review", section: "contacts" }),
      ])
    );
  });

  it("summarizes major assistant scenarios as measurable journeys", () => {
    const journeys = buildScenarioJourneys({
      data: demoWorkspace,
      levelTwoCards: [{
        id: "level2-demo",
        eventId: "e-daughter-birthday",
        title: "生日推荐卡",
        date: "2026-07-10",
        daysUntil: 2,
        priority: "soon",
        recommendation: "提前锁定礼物和蛋糕。",
        actions: ["生成履约方案"],
        warnings: [],
      }],
    });

    expect(journeys).toHaveLength(3);
    expect(journeys.find((item) => item.id === "relationship_care")?.progress).toBeGreaterThanOrEqual(75);
    expect(journeys.find((item) => item.id === "travel_fulfillment")?.nextStep).toContain("确认预算");
  });

  it("moves travel journeys forward once the plan is confirmed", () => {
    const journeys = buildScenarioJourneys({
      data: {
        ...demoWorkspace,
        plans: demoWorkspace.plans.map((plan) =>
          plan.scenario === "travel" ? { ...plan, status: "confirmed" } : plan
        ),
      },
      levelTwoCards: [],
    });

    expect(journeys.find((item) => item.id === "travel_fulfillment")).toMatchObject({
      currentStep: "差旅方案已确认",
      nextStep: "跟踪行前清单和外部跳转",
    });
  });
});
