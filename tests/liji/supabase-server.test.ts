import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ensureUserProfile } from "../../src/lib/liji/supabase-server";

function createProfileMockClient(calls: Array<{ table: string; row: unknown; options: unknown }>) {
  return {
    from(table: string) {
      return {
        upsert(row: unknown, options: unknown) {
          calls.push({ table, row, options });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("Supabase server helpers", () => {
  it("upserts profiles for authenticated users", async () => {
    const calls: Array<{ table: string; row: unknown; options: unknown }> = [];

    await ensureUserProfile(createProfileMockClient(calls), {
      id: "00000000-0000-4000-8000-000000000001",
      email: "executive@example.com",
      user_metadata: {},
    });

    expect(calls[0].table).toBe("profiles");
    expect(calls[0].row).toEqual(
      expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000001",
        display_name: "executive",
      })
    );
    expect(calls[0].options).toEqual({ onConflict: "id" });
  });

  it("prefers user metadata display names", async () => {
    const calls: Array<{ table: string; row: unknown; options: unknown }> = [];

    await ensureUserProfile(createProfileMockClient(calls), {
      id: "00000000-0000-4000-8000-000000000002",
      email: "assistant@example.com",
      user_metadata: { full_name: "董事会秘书" },
    });

    expect(calls[0].row).toEqual(
      expect.objectContaining({
        display_name: "董事会秘书",
      })
    );
  });
});
