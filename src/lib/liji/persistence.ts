import type { WorkspaceData } from "./types";

export const WORKSPACE_STORAGE_KEY = "liji.workspace.v1";

type WorkspaceStorageEnvelope = {
  version: 1;
  savedAt: string;
  data: WorkspaceData;
};

const workspaceCollectionKeys = [
  "contacts",
  "events",
  "budgets",
  "plans",
  "captures",
  "transactions",
  "recurringBills",
  "notificationLogs",
  "aiMemories",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function encodeWorkspaceData(data: WorkspaceData, now = new Date()) {
  const envelope: WorkspaceStorageEnvelope = {
    version: 1,
    savedAt: now.toISOString(),
    data,
  };

  return JSON.stringify(envelope);
}

export function decodeWorkspaceData(raw: string | null): WorkspaceData | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.data)) {
      return null;
    }

    const data = parsed.data as Partial<WorkspaceData>;
    if (
      !workspaceCollectionKeys.every((key) => Array.isArray(data[key])) ||
      !isRecord(data.privacy) ||
      !isRecord(data.insight)
    ) {
      return null;
    }

    return data as WorkspaceData;
  } catch {
    return null;
  }
}

export function loadWorkspaceData(storage: Pick<Storage, "getItem">) {
  return decodeWorkspaceData(storage.getItem(WORKSPACE_STORAGE_KEY));
}

export function saveWorkspaceData(
  storage: Pick<Storage, "setItem">,
  data: WorkspaceData,
  now = new Date()
) {
  storage.setItem(WORKSPACE_STORAGE_KEY, encodeWorkspaceData(data, now));
}

export function clearWorkspaceData(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(WORKSPACE_STORAGE_KEY);
}
