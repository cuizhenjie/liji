import { describe, expect, it } from "vitest";

import {
  DEFAULT_REFERENCE_DATE,
  resolveLunarDate,
  resolveRelativeChineseDate,
} from "../../src/lib/liji/calendar";

describe("calendar helpers", () => {
  it("resolves next-week Chinese weekday dates from the 2026-07-01 reference", () => {
    expect(resolveRelativeChineseDate("下周五是女儿生日", DEFAULT_REFERENCE_DATE)).toBe("2026-07-10");
    expect(resolveRelativeChineseDate("下周三去广州", DEFAULT_REFERENCE_DATE)).toBe("2026-07-08");
  });

  it("converts lunar dates to solar dates", () => {
    expect(resolveLunarDate(2026, 8, 15)).toBe("2026-09-25");
  });
});
