import type { CaptureExtractionJobRecord } from "./capture-worker";

export function isCaptureProviderSlaBreached(params: {
  job: CaptureExtractionJobRecord;
  now?: Date;
  staleMinutes?: number;
}) {
  const now = params.now ?? new Date();
  const staleMinutes = params.staleMinutes ?? 30;
  const queuedAt = params.job.queuedAt ? new Date(params.job.queuedAt).getTime() : Number.NaN;

  if (
    params.job.status === "completed" ||
    params.job.status === "cancelled" ||
    params.job.status === "failed" ||
    params.job.callbackReceivedAt ||
    !Number.isFinite(queuedAt)
  ) {
    return false;
  }

  return now.getTime() - queuedAt >= staleMinutes * 60_000;
}

export function createCaptureSlaOpsAlert(params: {
  job: CaptureExtractionJobRecord;
  staleMinutes: number;
  now?: Date;
}) {
  const queuedAt = params.job.queuedAt ?? "unknown";

  return {
    userId: params.job.userId,
    severity: "warning" as const,
    source: "capture_sla",
    title: `OCR/ASR 超时：${params.job.fileName ?? params.job.sourceType}`,
    message: `采集任务等待 provider 回调已超过 ${params.staleMinutes} 分钟，需要检查供应商 SLA 或人工补录。`,
    entityTable: "capture_extraction_jobs",
    entityId: params.job.id,
    metadata: {
      provider: params.job.provider,
      providerRequestId: params.job.providerRequestId,
      sourceType: params.job.sourceType,
      jobType: params.job.jobType,
      status: params.job.status,
      queuedAt,
      staleMinutes: params.staleMinutes,
    },
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}

export function manualCaptureCompletionResult(params: {
  job: CaptureExtractionJobRecord;
  extractedText: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  return {
    jobId: params.job.id,
    status: "completed" as const,
    extractedText: params.extractedText.trim(),
    confidence: 1,
    errorMessage: undefined,
    rawResult: {
      source: "manual_completion",
      completedAt: now.toISOString(),
    },
  };
}
