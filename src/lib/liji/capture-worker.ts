import { z } from "zod";

import { env } from "./env";
import type { CaptureSource } from "./types";

export type CaptureExtractionJobRecord = {
  id: string;
  userId: string;
  captureId?: string;
  sourceType: Exclude<CaptureSource, "text">;
  jobType: "ocr" | "asr";
  provider: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  fileName?: string;
  mimeType?: string;
  inputUri?: string;
  contentHash: string;
  queuedAt?: string;
};

export type CaptureWorkerResult = {
  jobId: string;
  status: "completed" | "failed" | "waiting_provider";
  extractedText?: string;
  confidence?: number;
  errorMessage?: string;
  rawResult: Record<string, unknown>;
};

const providerResponseSchema = z.object({
  status: z.enum(["completed", "failed"]).optional(),
  extractedText: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  errorMessage: z.string().optional(),
}).passthrough();

function compactJobPayload(job: CaptureExtractionJobRecord) {
  return {
    id: job.id,
    sourceType: job.sourceType,
    jobType: job.jobType,
    provider: job.provider,
    fileName: job.fileName,
    mimeType: job.mimeType,
    inputUri: job.inputUri,
    contentHash: job.contentHash,
  };
}

export async function processCaptureExtractionJob(params: {
  job: CaptureExtractionJobRecord;
  endpoint?: string;
  fetcher?: typeof fetch;
}): Promise<CaptureWorkerResult> {
  const endpoint = params.endpoint ?? env.LIJI_CAPTURE_PROVIDER_ENDPOINT;
  if (!endpoint) {
    return {
      jobId: params.job.id,
      status: "waiting_provider",
      errorMessage: "未配置 LIJI_CAPTURE_PROVIDER_ENDPOINT，等待 OCR/ASR worker 接入。",
      rawResult: {},
    };
  }

  if (!params.job.inputUri) {
    return {
      jobId: params.job.id,
      status: "failed",
      errorMessage: "缺少 inputUri，OCR/ASR provider 无法拉取附件。",
      rawResult: {},
    };
  }

  const fetcher = params.fetcher ?? fetch;
  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compactJobPayload(params.job)),
    });
    const payload = providerResponseSchema.parse(await response.json().catch(() => ({})));

    if (!response.ok || payload.status === "failed") {
      return {
        jobId: params.job.id,
        status: "failed",
        errorMessage: payload.errorMessage ?? `OCR/ASR provider 返回失败：${response.status}`,
        rawResult: payload,
      };
    }

    if (!payload.extractedText?.trim()) {
      return {
        jobId: params.job.id,
        status: "failed",
        errorMessage: "OCR/ASR provider 未返回 extractedText。",
        rawResult: payload,
      };
    }

    return {
      jobId: params.job.id,
      status: "completed",
      extractedText: payload.extractedText.trim(),
      confidence: payload.confidence,
      rawResult: payload,
    };
  } catch (error) {
    return {
      jobId: params.job.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "OCR/ASR provider 调用异常。",
      rawResult: {},
    };
  }
}
