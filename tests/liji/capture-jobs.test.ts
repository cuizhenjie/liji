import { describe, expect, it } from "vitest";

import {
  createCaptureExtractionOpsAlert,
  isCaptureExtractionJobDue,
  normalizeCaptureProviderCallback,
  planCaptureExtractionRetry,
  signCaptureProviderCallbackBody,
  verifyCaptureProviderCallbackSignature,
} from "../../src/lib/liji/capture-jobs";
import type { CaptureExtractionJobRecord } from "../../src/lib/liji/capture-worker";

const job: CaptureExtractionJobRecord = {
  id: "capjob-1",
  userId: "user-1",
  sourceType: "screenshot",
  jobType: "ocr",
  provider: "aliyun-ocr",
  status: "failed",
  fileName: "receipt.png",
  mimeType: "image/png",
  inputUri: "https://storage.example.test/receipt.png",
  contentHash: "hash",
  attemptCount: 2,
  maxAttempts: 3,
  nextAttemptAt: "2026-07-03T09:55:00Z",
};

describe("capture extraction jobs", () => {
  it("normalizes provider callbacks from flexible payload fields", () => {
    const callback = normalizeCaptureProviderCallback({
      job_id: "capjob-1",
      status: "success",
      transcript: "周明下次宴请不吃香菜",
      message: "OK",
      request_id: "req-1",
      confidence: 0.91,
    }, new Date("2026-07-03T10:00:00Z"));

    expect(callback).toMatchObject({
      jobId: "capjob-1",
      status: "completed",
      extractedText: "周明下次宴请不吃香菜",
      providerRequestId: "req-1",
      receivedAt: "2026-07-03T10:00:00.000Z",
    });
    expect(callback.errorMessage).toBeUndefined();
  });

  it("turns empty successful callbacks into failed callbacks", () => {
    const callback = normalizeCaptureProviderCallback({
      id: "capjob-1",
      status: "completed",
    });

    expect(callback.status).toBe("failed");
    expect(callback.errorMessage).toContain("extractedText");
  });

  it("verifies HMAC signatures and URL tokens", () => {
    const rawBody = JSON.stringify({ jobId: "capjob-1", extractedText: "ok" });
    const signature = signCaptureProviderCallbackBody(rawBody, "secret");

    expect(verifyCaptureProviderCallbackSignature({ rawBody, secret: "secret", signature })).toBe(true);
    expect(verifyCaptureProviderCallbackSignature({ rawBody, secret: "secret", signature: "bad" })).toBe(false);
    expect(verifyCaptureProviderCallbackSignature({ rawBody, secret: "secret", token: "secret" })).toBe(true);
    expect(verifyCaptureProviderCallbackSignature({ rawBody })).toBe(true);
  });

  it("detects due retry jobs and plans exponential backoff", () => {
    expect(isCaptureExtractionJobDue(job, new Date("2026-07-03T10:00:00Z"))).toBe(true);
    expect(isCaptureExtractionJobDue({
      ...job,
      nextAttemptAt: "2026-07-03T10:05:00Z",
    }, new Date("2026-07-03T10:00:00Z"))).toBe(false);

    const retry = planCaptureExtractionRetry({
      attemptCount: 2,
      maxAttempts: 3,
      now: new Date("2026-07-03T10:00:00Z"),
    });
    const exhausted = planCaptureExtractionRetry({
      attemptCount: 3,
      maxAttempts: 3,
      now: new Date("2026-07-03T10:00:00Z"),
    });

    expect(retry).toMatchObject({
      exhausted: false,
      delayMinutes: 20,
      nextAttemptAt: "2026-07-03T10:20:00.000Z",
    });
    expect(exhausted.exhausted).toBe(true);
  });

  it("creates ops alerts for exhausted extraction jobs", () => {
    const alert = createCaptureExtractionOpsAlert({
      job,
      message: "provider timeout",
      now: new Date("2026-07-03T10:00:00Z"),
    });

    expect(alert).toMatchObject({
      userId: "user-1",
      severity: "critical",
      source: "capture_extraction",
      entityTable: "capture_extraction_jobs",
      entityId: "capjob-1",
      message: "provider timeout",
    });
  });
});
