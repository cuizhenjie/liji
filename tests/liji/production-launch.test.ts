import { describe, expect, it } from "vitest";

import { buildProductionCheckReport } from "../../src/lib/liji/production-check";
import { buildProductionLaunchChecklist } from "../../src/lib/liji/production-launch";

describe("production launch checklist", () => {
  it("turns readiness failures into an actionable launch task pack", () => {
    const report = buildProductionCheckReport({
      env: {
        LIJI_PUBLIC_APP_URL: "https://liji.example.com",
      },
      cwd: process.cwd(),
      now: new Date("2026-07-05T09:00:00.000Z"),
    });
    const checklist = buildProductionLaunchChecklist(report);

    expect(checklist.status).toBe("blocked");
    expect(checklist.nextTask?.id).toBe("data-and-cron");
    expect(checklist.summary.missingEnvKeys).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(checklist.summary.missingEnvKeys).toContain("CRON_SECRET");
    expect(checklist.tasks.find((task) => task.id === "capture-provider-production")?.callbackUrls)
      .toContain("https://liji.example.com/api/capture/provider-callback");
    expect(checklist.tasks.find((task) => task.id === "notification-production")?.missingEnvKeys)
      .toContain("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  });

  it("keeps non-production recommendations as P1 tasks", () => {
    const checklist = buildProductionLaunchChecklist(buildProductionCheckReport({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        CRON_SECRET: "cron",
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
        VAPID_PRIVATE_KEY: "private",
        VAPID_SUBJECT: "mailto:ops@example.test",
        LIJI_ENABLE_EXTERNAL_NOTIFICATIONS: "true",
        FULFILLMENT_CALLBACK_SECRET: "secret",
      },
      cwd: process.cwd(),
    }));

    expect(checklist.tasks.filter((task) => task.priority === "P0").every((task) => task.status !== "blocked")).toBe(true);
    expect(checklist.tasks.find((task) => task.id === "notification-production")?.status).toBe("needs_config");
    expect(checklist.tasks.some((task) => task.priority === "P1" && task.id === "p1:capture-ocr")).toBe(true);
  });
});
