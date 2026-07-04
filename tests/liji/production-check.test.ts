import { describe, expect, it } from "vitest";

import { buildProductionCheckReport } from "../../src/lib/liji/production-check";

describe("production check report", () => {
  it("reports callback urls, migrations and blocked readiness", () => {
    const report = buildProductionCheckReport({
      env: {
        LIJI_PUBLIC_APP_URL: "https://liji.example.com",
      },
      cwd: process.cwd(),
      now: new Date("2026-07-04T10:00:00.000Z"),
    });

    expect(report.status).toBe("blocked");
    expect(report.callbacks[0].url).toBe("https://liji.example.com/api/capture/provider-callback");
    expect(report.migrations.every((item) => item.exists)).toBe(true);
    expect(report.commands).toContain("npm run prod:check");
  });
});
