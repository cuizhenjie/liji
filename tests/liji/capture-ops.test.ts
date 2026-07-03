import { describe, expect, it } from "vitest";

import {
  createCaptureSlaOpsAlert,
  isCaptureProviderSlaBreached,
  manualCaptureCompletionResult,
} from "../../src/lib/liji/capture-ops";
import type { CaptureExtractionJobRecord } from "../../src/lib/liji/capture-worker";

const job: CaptureExtractionJobRecord = {
  id: "capjob-1",
  userId: "user-1",
  sourceType: "screenshot",
  jobType: "ocr",
  provider: "aliyun-ocr",
  status: "processing",
  fileName: "receipt.png",
  contentHash: "hash",
  queuedAt: "2026-07-03T09:00:00.000Z",
  attemptCount: 1,
  maxAttempts: 3,
};

describe("capture ops helpers", () => {
  it("detects provider SLA breaches only for open jobs", () => {
    expect(isCaptureProviderSlaBreached({
      job,
      now: new Date("2026-07-03T09:31:00.000Z"),
      staleMinutes: 30,
    })).toBe(true);
    expect(isCaptureProviderSlaBreached({
      job: { ...job, status: "completed" },
      now: new Date("2026-07-03T09:31:00.000Z"),
      staleMinutes: 30,
    })).toBe(false);
    expect(isCaptureProviderSlaBreached({
      job: { ...job, callbackReceivedAt: "2026-07-03T09:20:00.000Z" },
      now: new Date("2026-07-03T09:31:00.000Z"),
      staleMinutes: 30,
    })).toBe(false);
  });

  it("creates SLA alerts and manual completion worker results", () => {
    const alert = createCaptureSlaOpsAlert({
      job,
      staleMinutes: 30,
      now: new Date("2026-07-03T09:31:00.000Z"),
    });
    const result = manualCaptureCompletionResult({
      job,
      extractedText: " 周明不吃香菜 ",
      now: new Date("2026-07-03T09:31:00.000Z"),
    });

    expect(alert).toMatchObject({
      source: "capture_sla",
      severity: "warning",
      entityTable: "capture_extraction_jobs",
      entityId: "capjob-1",
    });
    expect(result).toMatchObject({
      jobId: "capjob-1",
      status: "completed",
      extractedText: "周明不吃香菜",
      confidence: 1,
    });
  });
});
