import { describe, expect, it } from "vitest";

import { getIntegrationStatuses } from "../../src/lib/liji/integrations";

describe("integration statuses", () => {
  it("reports configured, missing and search-link providers", () => {
    const statuses = getIntegrationStatuses({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      OPENAI_API_KEY: "openai",
      LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET: "capture-callback",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
      JD_UNION_ID: undefined,
    });

    expect(statuses.find((item) => item.provider === "supabase")?.mode).toBe("configured");
    expect(statuses.find((item) => item.provider === "openai")?.mode).toBe("configured");
    expect(statuses.find((item) => item.provider === "capture_provider_callback")?.mode).toBe("configured");
    expect(statuses.find((item) => item.provider === "web_push")?.mode).toBe("missing");
    expect(statuses.find((item) => item.provider === "jd")?.mode).toBe("search-link");
  });
});
