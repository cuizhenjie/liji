import { describe, expect, it } from "vitest";

import { getReadinessChecks, summarizeReadiness } from "../../src/lib/liji/health";

describe("production readiness health", () => {
  it("reports failed required checks for missing production env", () => {
    const checks = getReadinessChecks({});
    const summary = summarizeReadiness(checks);

    expect(summary.productionReady).toBe(false);
    expect(checks.find((item) => item.id === "supabase-public")?.status).toBe("fail");
    expect(checks.find((item) => item.id === "openai")?.status).toBe("warn");
  });

  it("passes required checks when production env is configured", () => {
    const checks = getReadinessChecks({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      CRON_SECRET: "secret",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:ops@example.com",
      LIJI_ENABLE_EXTERNAL_NOTIFICATIONS: "true",
      LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET: "capture-callback",
      FULFILLMENT_CALLBACK_SECRET: "callback-secret",
    });

    expect(summarizeReadiness(checks).productionReady).toBe(true);
    expect(checks.find((item) => item.id === "capture-provider-callback")?.status).toBe("pass");
  });
});
