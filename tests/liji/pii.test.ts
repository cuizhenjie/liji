import { describe, expect, it } from "vitest";

import { maskPii, restorePii } from "../../src/lib/liji/pii";
import { demoContacts } from "../../src/lib/liji/sample-data";

describe("PII masking", () => {
  it("masks known names, phones, companies and restores them", () => {
    const text = "周明 13800138000 在华南国资委开会";
    const masked = maskPii(text, demoContacts);

    expect(masked.maskedText).toContain("[NAME_");
    expect(masked.maskedText).toContain("[PHONE_");
    expect(masked.maskedText).toContain("[COMPANY_");
    expect(restorePii(masked.maskedText, masked.tokens)).toBe(text);
  });
});
