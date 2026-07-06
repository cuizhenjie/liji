import { describe, expect, it } from "vitest";

import { parseNaturalLanguageInput } from "../../src/lib/liji/parser";
import { demoContacts, demoWorkspace } from "../../src/lib/liji/sample-data";
import { buildSecretaryTimeline } from "../../src/lib/liji/secretary-timeline";

describe("secretary timeline", () => {
  it("prioritizes blocked reminders and low-confidence captures across business assets", () => {
    const lowConfidenceCapture = parseNaturalLanguageInput(
      "周明下次宴请不吃香菜",
      demoContacts,
      undefined,
      "chat"
    );
    const timeline = buildSecretaryTimeline({
      ...demoWorkspace,
      captures: [lowConfidenceCapture],
    });

    expect(timeline[0].status).toBe("blocked");
    expect(timeline.some((item) => item.category === "capture" && item.section === "dashboard")).toBe(true);
    expect(timeline.some((item) => item.category === "fulfillment" && item.section === "fulfillment")).toBe(true);
    expect(timeline.some((item) => item.category === "finance" && item.section === "finance")).toBe(true);
    expect(timeline.some((item) => item.category === "notification" && item.section === "calendar")).toBe(true);
  });

  it("keeps the timeline bounded and navigable", () => {
    const timeline = buildSecretaryTimeline(demoWorkspace, 5);

    expect(timeline).toHaveLength(5);
    expect(timeline.every((item) => item.cta.length > 0)).toBe(true);
    expect(timeline.every((item) => item.timestamp.length > 0)).toBe(true);
  });
});
