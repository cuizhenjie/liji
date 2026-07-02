import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SupabaseWorkspaceRepository } from "../../src/lib/liji/repository";
import { demoWorkspace } from "../../src/lib/liji/sample-data";
import type { WorkspaceData } from "../../src/lib/liji/types";

function createMockClient(calls: Array<{ table: string; rows: unknown }>) {
  return {
    from(table: string) {
      return {
        upsert(rows: unknown) {
          calls.push({ table, rows });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
}

function createReadMockClient(dataByTable: Record<string, unknown[]>, singleByTable: Record<string, unknown | null> = {}) {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              if (table in singleByTable) {
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: singleByTable[table], error: null });
                  },
                };
              }

              return Promise.resolve({ data: dataByTable[table] ?? [], error: null });
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("WorkspaceRepository", () => {
  it("recomputes monthly insight from Supabase workspace rows", async () => {
    const repository = new SupabaseWorkspaceRepository(
      createReadMockClient(
        {
          contacts: [],
          events: [
            {
              id: "00000000-0000-4000-8000-000000000002",
              title: "客户宴请",
              event_date: "2026-08-02",
              calendar_type: "solar",
              reminder_level: "level_1",
              status: "scheduled",
              source: "manual",
            },
          ],
          budgets: [],
          plans: [],
          capture_items: [],
          transactions: [
            {
              id: "00000000-0000-4000-8000-000000000003",
              title: "客户礼盒",
              amount_cny: 880,
              category: "relationship",
              occurred_at: "2026-07-01",
              source: "manual",
            },
          ],
          recurring_bills: [
            {
              id: "00000000-0000-4000-8000-000000000004",
              title: "房贷",
              amount_cny: 12800,
              due_day: 2,
              account_label: "家庭账户",
              reminder_level: "level_1",
              enabled: true,
            },
          ],
          notification_logs: [],
          ai_memories: [],
        },
        { privacy_settings: null }
      )
    );

    const workspace = await repository.getWorkspace("00000000-0000-4000-8000-000000000001");

    expect(workspace.insight.relationshipCny).toBe(880);
    expect(workspace.insight.fixedCny).toBe(12800);
    expect(workspace.insight.nextMonthRisks).toEqual(["2026-08-02 客户宴请"]);
    expect(workspace.insight.relationshipCny).not.toBe(demoWorkspace.insight.relationshipCny);
  });

  it("skips empty collection upserts during workspace sync", async () => {
    const calls: Array<{ table: string; rows: unknown }> = [];
    const repository = new SupabaseWorkspaceRepository(createMockClient(calls));
    const emptyWorkspace: WorkspaceData = {
      ...demoWorkspace,
      contacts: [],
      events: [],
      budgets: [],
      plans: [],
      captures: [],
      transactions: [],
      recurringBills: [],
      notificationLogs: [],
      aiMemories: [],
    };

    const result = await repository.syncWorkspace(
      "00000000-0000-4000-8000-000000000001",
      emptyWorkspace
    );

    expect(calls.map((call) => call.table)).toEqual(["privacy_settings"]);
    expect(result.tables.contacts).toBe(0);
  });
});
