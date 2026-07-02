import { describe, expect, it } from "vitest";

import { isCronAuthorized } from "../../src/lib/liji/cron";

describe("cron authorization", () => {
  it("allows requests when no secret is configured", () => {
    expect(isCronAuthorized(undefined, undefined)).toBe(true);
  });

  it("requires bearer or header secret when configured", () => {
    const authorized = new Request("http://localhost/api/monthly-report", {
      headers: { authorization: "Bearer secret" },
    });
    const unauthorized = new Request("http://localhost/api/monthly-report");

    expect(isCronAuthorized(authorized, "secret")).toBe(true);
    expect(isCronAuthorized(unauthorized, "secret")).toBe(false);
  });
});
