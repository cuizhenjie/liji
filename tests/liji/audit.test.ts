import { describe, expect, it } from "vitest";

import { createAuditLogEntry, persistAuditLog } from "../../src/lib/liji/audit";

describe("audit logs", () => {
  it("keeps audit user optional and persists with a compatible insert shape", async () => {
    const entry = createAuditLogEntry({
      action: "export",
      entityTable: "workspace",
      metadata: { redacted: true },
      now: new Date("2026-07-02T09:00:00+08:00"),
    });
    const rows: unknown[] = [];
    const client = {
      from: () => ({
        insert: async (row: unknown) => {
          rows.push(row);
          return { error: null };
        },
      }),
    };

    const result = await persistAuditLog(entry, client);

    expect(entry.userId).toBeUndefined();
    expect(result.persisted).toBe(true);
    expect(rows[0]).toMatchObject({ user_id: null, action: "export" });
  });
});
