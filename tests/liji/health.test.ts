import { describe, expect, it } from "vitest";

import {
  getP0ReadinessActions,
  getReadinessChecks,
  summarizeReadiness,
} from "../../src/lib/liji/health";

describe("production readiness health", () => {
  it("reports failed required checks for missing production env", () => {
    const checks = getReadinessChecks({});
    const summary = summarizeReadiness(checks);

    expect(summary.productionReady).toBe(false);
    expect(checks.find((item) => item.id === "supabase-public")?.status).toBe("fail");
    expect(checks.find((item) => item.id === "openai")?.status).toBe("warn");
    expect(checks.find((item) => item.id === "notification-governance")?.status).toBe("pass");
    expect(getP0ReadinessActions(checks).find((item) => item.id === "data-and-cron")?.status).toBe("blocked");
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
      LIJI_CAPTURE_PROVIDER_ALLOWED_IPS: "203.0.113.10",
      LIJI_PUBLIC_APP_URL: "https://liji.example.com",
      FULFILLMENT_CALLBACK_SECRET: "callback-secret",
    });

    expect(summarizeReadiness(checks).productionReady).toBe(true);
    expect(checks.find((item) => item.id === "capture-provider-callback")?.status).toBe("pass");
    expect(checks.find((item) => item.id === "public-app-url")?.status).toBe("pass");
  });

  it("returns P0 action blockers and next steps", () => {
    const checks = getReadinessChecks({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      CRON_SECRET: "secret",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:ops@example.com",
      LIJI_ENABLE_EXTERNAL_NOTIFICATIONS: "true",
      FULFILLMENT_CALLBACK_SECRET: "callback-secret",
      JD_UNION_ORDER_API_ENDPOINT: "https://jd.example.test/orders",
    });
    const actions = getP0ReadinessActions(checks);
    const fulfillment = actions.find((item) => item.id === "fulfillment-settlement");
    const capture = actions.find((item) => item.id === "capture-provider-production");

    expect(fulfillment?.status).toBe("blocked");
    expect(fulfillment?.blockers.join(" ")).toContain("京东");
    expect(capture?.status).toBe("needs_config");
    expect(capture?.nextSteps.length).toBeGreaterThan(0);
  });
});
