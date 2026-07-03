import { describe, expect, it } from "vitest";

import { deriveComplianceProfile } from "../../src/lib/liji/compliance";

describe("dynamic compliance rules", () => {
  it("uses the strictest matching dynamic limits", () => {
    const profile = deriveComplianceProfile(["重要客户", "国企高管"], [
      {
        label: "企业规则",
        riskTags: ["重要客户"],
        giftLimitCny: 500,
        hospitalityLimitCny: 800,
        policyNote: "重要客户规则",
      },
      {
        label: "地区规则",
        riskTags: ["国企高管"],
        giftLimitCny: 200,
        hospitalityLimitCny: 400,
        policyNote: "国企规则",
      },
    ]);

    expect(profile.giftLimitCny).toBe(200);
    expect(profile.hospitalityLimitCny).toBe(400);
    expect(profile.policyNote).toContain("国企规则");
  });
});
