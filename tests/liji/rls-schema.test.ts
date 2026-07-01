import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260701193000_initial_liji_schema.sql"),
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
});
