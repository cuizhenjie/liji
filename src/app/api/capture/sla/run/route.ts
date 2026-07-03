import { z } from "zod";

import {
  createCaptureSlaOpsAlert,
  isCaptureProviderSlaBreached,
} from "@/lib/liji/capture-ops";
import {
  mapCaptureExtractionJobRow,
} from "@/lib/liji/capture-jobs";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { opsAlertRow } from "@/lib/liji/ops-alerts";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  staleMinutes: z.number().int().min(5).max(24 * 60).default(30),
  unblockProcessing: z.boolean().default(true),
});

async function runSupabaseCaptureSla(params: {
  limit: number;
  staleMinutes: number;
  unblockProcessing: boolean;
}) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const now = new Date();
  const { data, error } = await client
    .from("capture_extraction_jobs")
    .select("*")
    .in("status", ["queued", "processing"])
    .order("queued_at", { ascending: true })
    .limit(params.limit * 2);
  if (error) {
    throw new Error(error.message);
  }

  const processed = [];
  for (const row of data ?? []) {
    if (processed.length >= params.limit) {
      break;
    }

    const job = mapCaptureExtractionJobRow(row as Record<string, unknown>);
    if (!job || !isCaptureProviderSlaBreached({
      job,
      now,
      staleMinutes: params.staleMinutes,
    })) {
      continue;
    }

    const alert = createCaptureSlaOpsAlert({
      job,
      staleMinutes: params.staleMinutes,
      now,
    });
    const { error: alertError } = await client
      .from("ops_alerts")
      .insert(opsAlertRow(alert));
    if (alertError && alertError.code !== "23505") {
      throw new Error(alertError.message);
    }

    let unblocked = false;
    if (params.unblockProcessing && job.status === "processing") {
      const { error: updateError } = await client
        .from("capture_extraction_jobs")
        .update({
          status: "failed",
          next_attempt_at: now.toISOString(),
          last_error: `OCR/ASR provider SLA 超过 ${params.staleMinutes} 分钟，已释放为可重试。`,
        })
        .eq("id", job.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
      unblocked = true;
    }

    processed.push({
      jobId: job.id,
      provider: job.provider,
      status: job.status,
      alertSource: alert.source,
      unblocked,
    });
  }

  return processed;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const processed = await runSupabaseCaptureSla(body);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [{
      jobId: "demo-capture-job",
      provider: "aliyun-ocr",
      status: "processing",
      alertSource: "capture_sla",
      unblocked: true,
    }],
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const processed = await runSupabaseCaptureSla({
    limit: 50,
    staleMinutes: 30,
    unblockProcessing: true,
  });
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，采集 SLA worker 处于 demo 模式。",
  });
}
