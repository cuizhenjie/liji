import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260701193000_initial_liji_schema.sql"),
  "utf8"
);
const productizationMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260702110000_productization_extensions.sql"),
  "utf8"
);
const realServiceMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260703120000_real_service_readiness.sql"),
  "utf8"
);
const captureWorkerMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260703133000_capture_worker_inputs.sql"),
  "utf8"
);

describe("Supabase RLS migration", () => {
  it("enables RLS for sensitive user tables", () => {
    for (const table of [
      "contacts",
      "events",
      "plans",
      "transactions",
      "notification_logs",
      "ai_memories",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`auth.uid() = user_id`);
    }
  });

  it("includes pgvector for AI memories", () => {
    expect(migration).toContain('create extension if not exists "vector"');
    expect(migration).toContain("embedding vector(1536)");
  });

  it("adds RLS-protected productization tables", () => {
    for (const table of [
      "web_push_subscriptions",
      "integration_accounts",
      "fulfillment_clicks",
      "monthly_reports",
      "audit_logs",
      "fulfillment_order_updates",
    ]) {
      expect(productizationMigration).toContain(`alter table public.${table} enable row level security`);
    }

    expect(productizationMigration).toContain("create table public.fulfillment_clicks");
    expect(productizationMigration).toContain("create table public.fulfillment_order_updates");
    expect(productizationMigration).toContain("create table public.audit_logs");
    expect(productizationMigration).toContain("idx_web_push_user_enabled");
  });

  it("adds queues and pgvector search for real service readiness", () => {
    for (const table of ["capture_extraction_jobs", "reminder_escalation_jobs"]) {
      expect(realServiceMigration).toContain(`create table public.${table}`);
      expect(realServiceMigration).toContain(`alter table public.${table} enable row level security`);
      expect(realServiceMigration).toContain("auth.uid() = user_id");
    }

    expect(realServiceMigration).toContain("idx_ai_memories_embedding_cosine");
    expect(realServiceMigration).toContain("create or replace function public.match_ai_memories");
  });

  it("adds worker input metadata for capture extraction jobs", () => {
    expect(captureWorkerMigration).toContain("add column if not exists input_uri text");
    expect(captureWorkerMigration).toContain("idx_capture_extraction_jobs_provider_status");
  });
});
