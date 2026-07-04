import { describe, expect, it } from "vitest";

import { buildLevelTwoRecommendationCards } from "../../src/lib/liji/level2-recommendations";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("level 2 recommendation cards", () => {
  it("creates daily cards for level 2 events inside the 15 day window", () => {
    const cards = buildLevelTwoRecommendationCards({
      data: demoWorkspace,
      now: new Date("2026-07-01T09:00:00+08:00"),
    });

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].id).toContain("2026-07-01");
    expect(cards[0].daysUntil).toBe(9);
    expect(cards[0].recommendation).toContain("粉色乐高");
    expect(cards[0].actions).toContain("生成履约方案");
  });

  it("ignores level 2 events outside the recommendation horizon", () => {
    const cards = buildLevelTwoRecommendationCards({
      data: demoWorkspace,
      now: new Date("2026-08-01T09:00:00+08:00"),
    });

    expect(cards).toEqual([]);
  });
});
