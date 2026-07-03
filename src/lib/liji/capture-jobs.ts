import crypto from "node:crypto";

import { parseInputWithProvider } from "./ai";
import type { Json } from "./database.types";
import type { SupabaseServiceClient } from "./supabase-server";
import { mapContact } from "./supabase-mappers";
import type { CaptureExtractionJobRecord, CaptureWorkerResult } from "./capture-worker";
import type { CaptureItem, Contact } from "./types";

export type CaptureProviderCallback = {
  jobId: string;
  status: "completed" | "failed";
  extractedText?: string;
  confidence?: number;
  errorMessage?: string;
  providerRequestId?: string;
  receivedAt: string;
  rawResult: Record<string, unknown>;
};

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(row: Record<string, unknown>, key: string, fallback = 0) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawResult(payload: unknown): Record<string, unknown> {
  return isRecord(payload) ? payload : { payload };
}

function unwrapCallbackPayload(payload: unknown): Record<string, unknown> {
  const parsed = typeof payload === "string" ? parseJsonString(payload) : payload;
  if (!isRecord(parsed)) {
    return {};
  }

  for (const key of ["data", "Data", "result", "Result", "body", "MessageBody", "messageBody"]) {
    const value = parsed[key];
    if (typeof value === "string") {
      const nested = parseJsonString(value);
      if (nested !== value && isRecord(nested)) {
        return nested;
      }
    }

    if (isRecord(value)) {
      return value;
    }
  }

  return parsed;
}

function boolDue(iso: string | undefined, now: Date) {
  return !iso || new Date(iso).getTime() <= now.getTime();
}

export function mapCaptureExtractionJobRow(
  row: Record<string, unknown>
): CaptureExtractionJobRecord | null {
  const id = text(row, "id");
  const userId = text(row, "user_id");
  const sourceType = text(row, "source_type");
  const jobType = text(row, "job_type");
  const provider = text(row, "provider");
  const status = text(row, "status");
  const contentHash = text(row, "content_hash");

  if (
    !id ||
    !userId ||
    !provider ||
    !contentHash ||
    !(sourceType === "voice" || sourceType === "screenshot" || sourceType === "chat" || sourceType === "bill") ||
    !(jobType === "ocr" || jobType === "asr") ||
    !(status === "queued" || status === "processing" || status === "completed" || status === "failed" || status === "cancelled")
  ) {
    return null;
  }

  return {
    id,
    userId,
    captureId: text(row, "capture_id"),
    sourceType,
    jobType,
    provider,
    status,
    fileName: text(row, "file_name"),
    mimeType: text(row, "mime_type"),
    inputUri: text(row, "input_uri"),
    contentHash,
    providerRequestId: text(row, "provider_request_id"),
    queuedAt: text(row, "queued_at"),
    callbackReceivedAt: text(row, "callback_received_at"),
    attemptCount: numberValue(row, "attempt_count"),
    maxAttempts: numberValue(row, "max_attempts", 3),
    nextAttemptAt: text(row, "next_attempt_at"),
    lastError: text(row, "last_error"),
  };
}

export function isCaptureExtractionJobDue(
  job: CaptureExtractionJobRecord,
  now = new Date()
) {
  if (job.status === "completed" || job.status === "cancelled" || job.status === "processing") {
    return false;
  }

  if (job.status === "queued") {
    return boolDue(job.nextAttemptAt, now);
  }

  return job.attemptCount < job.maxAttempts && boolDue(job.nextAttemptAt, now);
}

export function planCaptureExtractionRetry(params: {
  attemptCount: number;
  maxAttempts: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  if (params.attemptCount >= params.maxAttempts) {
    return {
      exhausted: true,
      delayMinutes: 0,
      nextAttemptAt: undefined,
    };
  }

  const delayMinutes = Math.min(60, 10 * 2 ** Math.max(0, params.attemptCount - 1));
  return {
    exhausted: false,
    delayMinutes,
    nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
  };
}

function captureRow(userId: string, capture: CaptureItem) {
  return {
    id: capture.id,
    user_id: userId,
    raw_text: capture.rawText,
    masked_text: capture.maskedText,
    source_type: capture.sourceType,
    status: capture.status,
    parsed: capture.parsed,
    pii_tokens: capture.piiTokens,
    created_at: capture.createdAt,
  };
}

export async function loadContactsForCaptureJob(
  client: SupabaseServiceClient,
  userId: string
) {
  const { data, error } = await client.from("contacts").select("*").eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapContact(row as Record<string, unknown>));
}

export async function upsertCaptureFromExtractedText(params: {
  client: SupabaseServiceClient;
  job: CaptureExtractionJobRecord;
  contacts: Contact[];
  extractedText: string;
}) {
  const parsed = await parseInputWithProvider({
    text: params.extractedText,
    contacts: params.contacts,
    source: params.job.sourceType,
    allowCloudModel: false,
    now: new Date(),
  });
  const capture = {
    ...parsed.capture,
    id: params.job.captureId ?? parsed.capture.id,
  };

  const { error } = await params.client
    .from("capture_items")
    .upsert(captureRow(params.job.userId, capture));
  if (error) {
    throw new Error(error.message);
  }

  return capture;
}

export function signCaptureProviderCallbackBody(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function normalizeSignature(signature: string) {
  return signature.trim().replace(/^sha256=/i, "").toLowerCase();
}

export function verifyCaptureProviderCallbackSignature(params: {
  rawBody: string;
  secret?: string;
  signature?: string | null;
  token?: string | null;
}) {
  if (!params.secret) {
    return true;
  }

  if (params.token && params.token === params.secret) {
    return true;
  }

  if (!params.signature) {
    return false;
  }

  const expected = signCaptureProviderCallbackBody(params.rawBody, params.secret);
  const actual = normalizeSignature(params.signature);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  return expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function normalizeCaptureProviderCallback(
  payload: unknown,
  now = new Date()
): CaptureProviderCallback {
  const data = unwrapCallbackPayload(payload);
  const extractedText =
    text(data, "extractedText") ??
    text(data, "extracted_text") ??
    text(data, "text") ??
    text(data, "transcript") ??
    text(data, "content");
  const errorMessage =
    text(data, "errorMessage") ??
    text(data, "error_message") ??
    text(data, "error") ??
    text(data, "message");
  const confidence = numberValue(data, "confidence", Number.NaN);
  const statusValue = text(data, "status");
  const status =
    statusValue === "completed" || statusValue === "success"
      ? "completed"
      : statusValue === "failed" || statusValue === "error"
        ? "failed"
        : extractedText
          ? "completed"
          : "failed";
  const finalStatus = status === "completed" && !extractedText ? "failed" : status;

  return {
    jobId: text(data, "jobId") ?? text(data, "job_id") ?? text(data, "id") ?? "",
    status: finalStatus,
    extractedText,
    confidence: Number.isFinite(confidence) ? confidence : undefined,
    errorMessage: finalStatus === "failed"
      ? status === "completed" && !extractedText
        ? "OCR/ASR provider 回调未返回 extractedText。"
        : errorMessage
      : undefined,
    providerRequestId:
      text(data, "providerRequestId") ??
      text(data, "provider_request_id") ??
      text(data, "requestId") ??
      text(data, "request_id"),
    receivedAt: now.toISOString(),
    rawResult: rawResult(payload),
  };
}

export function captureProviderCallbackToWorkerResult(
  callback: CaptureProviderCallback
): CaptureWorkerResult {
  return {
    jobId: callback.jobId,
    status: callback.status,
    extractedText: callback.extractedText,
    confidence: Number.isFinite(callback.confidence) ? callback.confidence : undefined,
    errorMessage: callback.errorMessage,
    rawResult: callback.rawResult,
  };
}

export function createCaptureExtractionOpsAlert(params: {
  job: CaptureExtractionJobRecord;
  message: string;
  now?: Date;
}) {
  return {
    userId: params.job.userId,
    severity: "critical" as const,
    source: "capture_extraction",
    title: `OCR/ASR 抽取失败：${params.job.fileName ?? params.job.sourceType}`,
    message: params.message,
    entityTable: "capture_extraction_jobs",
    entityId: params.job.id,
    metadata: {
      provider: params.job.provider,
      sourceType: params.job.sourceType,
      jobType: params.job.jobType,
      attemptCount: params.job.attemptCount,
      maxAttempts: params.job.maxAttempts,
    },
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}

export function captureJobUpdatePayload(params: {
  job: CaptureExtractionJobRecord;
  result: CaptureWorkerResult;
  captureId?: string;
  attemptCount: number;
  nextAttemptAt?: string;
  exhausted?: boolean;
  callbackReceivedAt?: string;
  providerRequestId?: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const isCompleted = params.result.status === "completed";
  const isFailed = params.result.status === "failed";
  const status: "queued" | "failed" | "completed" = isCompleted
    ? "completed"
    : isFailed
      ? "failed"
      : "queued";

  return {
    capture_id: params.captureId ?? params.job.captureId ?? null,
    status,
    extracted_text: params.result.extractedText ?? null,
    error_message: isFailed ? params.result.errorMessage ?? null : null,
    raw_result: params.result.rawResult as Json,
    completed_at: isCompleted || params.exhausted ? now.toISOString() : null,
    provider_request_id: params.providerRequestId ?? params.job.providerRequestId ?? null,
    callback_received_at: params.callbackReceivedAt ?? params.job.callbackReceivedAt ?? null,
    attempt_count: params.attemptCount,
    next_attempt_at: params.nextAttemptAt ?? null,
    last_error: isFailed ? params.result.errorMessage ?? "OCR/ASR provider 抽取失败。" : null,
  };
}
