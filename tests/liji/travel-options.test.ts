import { describe, expect, it } from "vitest";

import { buildTravelQuotePlan } from "../../src/lib/liji/travel-options";

describe("travel quote planning", () => {
  it("selects high-score affordable transport and hotel candidates", () => {
    const quotePlan = buildTravelQuotePlan({
      destination: "广州",
      startDate: "2026-07-08",
      endDate: "2026-07-10",
      dailyLimitCny: 2400,
    });

    expect(quotePlan.days).toBe(3);
    expect(quotePlan.selected.transport.title).toContain("高铁");
    expect(quotePlan.selected.hotel.title).toContain("3 公里内");
    expect(quotePlan.warnings).toEqual([]);
  });

  it("surfaces alternatives when selected quotes exceed the travel limit", () => {
    const quotePlan = buildTravelQuotePlan({
      destination: "深圳",
      startDate: "2026-07-08",
      dailyLimitCny: 500,
      transportCandidates: [
        {
          id: "flight-peak",
          category: "transport",
          provider: "携程",
          title: "深圳临近出发机票",
          amountCny: 900,
          score: 95,
          rationale: "临近出发价格较高。",
          url: "https://www.ctrip.com/?keyword=flight",
        },
      ],
      hotelCandidates: [
        {
          id: "hotel-peak",
          category: "hotel",
          provider: "同程",
          title: "深圳核心区酒店",
          amountCny: 900,
          score: 92,
          rationale: "核心区价格较高。",
          url: "https://www.ly.com/?keyword=hotel",
        },
      ],
    });

    expect(quotePlan.warnings.join(" ")).toContain("已超出差旅总限额");
    expect(quotePlan.alternatives.join(" ")).toContain("降低大交通成本");
  });

  it("falls back to default quotes when custom candidate arrays are empty", () => {
    const quotePlan = buildTravelQuotePlan({
      destination: "杭州",
      startDate: "2026-07-08",
      transportCandidates: [],
      hotelCandidates: [],
    });

    expect(quotePlan.selected.transport.amountCny).toBeGreaterThan(0);
    expect(quotePlan.selected.hotel.amountCny).toBeGreaterThan(0);
  });
});
