import { z } from "zod";

import { processCaptureExtractionJob } from "@/lib/liji/capture-worker";
import {
  captureJobUpdatePayload,
  createCaptureExtractionOpsAlert,
  isCaptureExtractionJobDue,
  loadContactsForCaptureJob,
  mapCaptureExtractionJobRow,
  planCaptureExtractionRetry,
  upsertCaptureFromExtractedText,
} from "@/lib/liji/capture-jobs";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { opsAlertRow } from "@/lib/liji/ops-alerts";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

async function runSupabaseCaptureJobs(limit: number) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("capture_extraction_jobs")
    .select("*")
    .in("status", ["queued", "failed"])
    .order("queued_at", { ascending: true })
    .limit(limit * 2);

  if (error) {
    throw new Error(error.message);
  }

  const processed = [];
  const now = new Date();
  for (const row of data ?? []) {
    const job = mapCaptureExtractionJobRow(row as Record<string, unknown>);
    if (!job || !isCaptureExtractionJobDue(job, now)) {
      continue;
    }

    if (processed.length >= limit) {
      break;
    }

    const attemptCount = job.attemptCount + 1;
    const { error: processingError } = await client
      .from("capture_extraction_jobs")
      .update({
        status: "processing",
        attempt_count: attemptCount,
        last_error: null,
      })
      .eq("id", job.id);
    if (processingError) {
      throw new Error(processingError.message);
    }

    const result = await processCaptureExtractionJob({ job });
    const finalAttemptCount = result.status === "waiting_provider"
      ? job.attemptCount
      : attemptCount;
    let captureId = job.captureId;

    if (result.status === "completed" && result.extractedText) {
      const contacts = await loadContactsForCaptureJob(client, job.userId);
      const capture = await upsertCaptureFromExtractedText({
        client,
        job,
        contacts,
        extractedText: result.extractedText,
      });
      captureId = capture.id;
    }

    const retry = result.status === "failed"
      ? planCaptureExtractionRetry({ attemptCount: finalAttemptCount, maxAttempts: job.maxAttempts, now })
      : null;
    const { error: updateError } = await client
      .from("capture_extraction_jobs")
      .update(captureJobUpdatePayload({
        job,
        result,
        captureId,
        attemptCount: finalAttemptCount,
        nextAttemptAt: retry?.nextAttemptAt,
        exhausted: retry?.exhausted,
        now,
      }))
      .eq("id", job.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (retry?.exhausted) {
      const alert = createCaptureExtractionOpsAlert({
        job: { ...job, attemptCount: finalAttemptCount },
        message: result.errorMessage ?? "OCR/ASR 抽取失败且已耗尽重试次数。",
        now,
      });
      const { error: alertError } = await client.from("ops_alerts").insert(opsAlertRow(alert));
      if (alertError && alertError.code !== "23505") {
        throw new Error(alertError.message);
      }
    }

    processed.push({
      ...result,
      captureId,
      attemptCount: finalAttemptCount,
      nextAttemptAt: retry?.nextAttemptAt,
      exhausted: retry?.exhausted ?? false,
    });
  }

  return processed;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const processed = await runSupabaseCaptureJobs(body.limit);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，采集 worker 处于 demo 模式。",
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const processed = await runSupabaseCaptureJobs(10);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，采集 worker 处于 demo 模式。",
  });
}
