import { describe, expect, it } from "vitest";

import {
  decodeWorkspaceData,
  encodeWorkspaceData,
  WORKSPACE_STORAGE_KEY,
  loadWorkspaceData,
  saveWorkspaceData,
} from "../../src/lib/liji/persistence";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("workspace persistence", () => {
  it("round-trips workspace data through a versioned envelope", () => {
    const encoded = encodeWorkspaceData(
      demoWorkspace,
      new Date("2026-07-01T09:00:00+08:00")
    );
    const decoded = decodeWorkspaceData(encoded);

    expect(decoded?.contacts[0].name).toBe("李小满");
    expect(decoded?.privacy.piiMasking).toBe(true);
  });

  it("rejects malformed persisted payloads", () => {
    expect(decodeWorkspaceData("{bad json")).toBeNull();
    expect(decodeWorkspaceData(JSON.stringify({ version: 999, data: {} }))).toBeNull();
    expect(
      decodeWorkspaceData(
        JSON.stringify({
          version: 1,
          data: { contacts: [], events: [], plans: [], captures: [], notificationLogs: [], privacy: {} },
        })
      )
    ).toBeNull();
  });

  it("loads and saves through the Storage interface", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    };

    saveWorkspaceData(storage, demoWorkspace);

    expect(store.has(WORKSPACE_STORAGE_KEY)).toBe(true);
    expect(loadWorkspaceData(storage)?.plans.length).toBeGreaterThan(0);
  });
});
