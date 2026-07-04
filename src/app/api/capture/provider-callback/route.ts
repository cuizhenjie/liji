import { env } from "@/lib/liji/env";
import {
  captureJobUpdatePayload,
  captureProviderCallbackToWorkerResult,
  createCaptureExtractionOpsAlert,
  isCaptureProviderCallbackSourceAllowed,
  loadContactsForCaptureJob,
  mapCaptureExtractionJobRow,
  normalizeCaptureProviderCallback,
  planCaptureExtractionRetry,
  upsertCaptureFromExtractedText,
  verifyCaptureProviderCallbackSignature,
} from "@/lib/liji/capture-jobs";
import { opsAlertRow } from "@/lib/liji/ops-alerts";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";

function parseRawBody(rawBody: string) {
  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function signatureFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    signature:
      request.headers.get("x-liji-signature") ??
      request.headers.get("x-provider-signature") ??
      url.searchParams.get("signature"),
    token: url.searchParams.get("token"),
  };
}

export async function POST(request: Request) {
  const sourceAllowed = isCaptureProviderCallbackSourceAllowed({
    request,
    allowedIps: env.LIJI_CAPTURE_PROVIDER_ALLOWED_IPS,
  });
  if (!sourceAllowed.allowed) {
    return Response.json({
      error: "capture callback source not allowed",
      requestIps: sourceAllowed.requestIps,
    }, { status: 403 });
  }

  const rawBody = await request.text();
  const client = createSupabaseServiceClient();
  if (client && !env.LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET) {
    return Response.json({
      error: "LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET is required for persisted capture callbacks",
    }, { status: 401 });
  }

  const { signature, token } = signatureFromRequest(request);
  const authorized = verifyCaptureProviderCallbackSignature({
    rawBody,
    secret: env.LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET,
    signature,
    token,
  });

  if (!authorized) {
    return Response.json({ error: "invalid capture callback signature" }, { status: 401 });
  }

  const callback = normalizeCaptureProviderCallback(parseRawBody(rawBody));
  if (!callback.jobId) {
    return Response.json({ error: "missing capture job id" }, { status: 400 });
  }

  if (!client) {
    return Response.json({
      source: "demo",
      persisted: false,
      callback,
      message: "未配置 Supabase service role，provider 回调仅完成验签和解析。",
    });
  }

  const { data, error } = await client
    .from("capture_extraction_jobs")
    .select("*")
    .eq("id", callback.jobId)
    .maybeSingle();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const job = data ? mapCaptureExtractionJobRow(data as Record<string, unknown>) : null;
  if (!job) {
    return Response.json({
      source: "supabase",
      persisted: false,
      callback,
      status: "unmatched",
    });
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return Response.json({
      source: "supabase",
      persisted: false,
      callback,
      status: "ignored_terminal",
      jobStatus: job.status,
    });
  }

  const result = captureProviderCallbackToWorkerResult(callback);
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

  const attemptCount = result.status === "failed"
    ? Math.max(job.attemptCount, 1)
    : job.attemptCount;
  const retry = result.status === "failed"
    ? planCaptureExtractionRetry({ attemptCount, maxAttempts: job.maxAttempts })
    : null;
  const { error: updateError } = await client
    .from("capture_extraction_jobs")
    .update(captureJobUpdatePayload({
      job,
      result,
      captureId,
      attemptCount,
      nextAttemptAt: retry?.nextAttemptAt,
      exhausted: retry?.exhausted,
      callbackReceivedAt: callback.receivedAt,
      providerRequestId: callback.providerRequestId,
      now: new Date(callback.receivedAt),
    }))
    .eq("id", job.id);
  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  if (retry?.exhausted) {
    const alert = createCaptureExtractionOpsAlert({
      job: { ...job, attemptCount },
      message: result.errorMessage ?? "OCR/ASR provider 回调失败且已耗尽重试次数。",
      now: new Date(callback.receivedAt),
    });
    const { error: alertError } = await client.from("ops_alerts").insert(opsAlertRow(alert));
    if (alertError && alertError.code !== "23505") {
      return Response.json({ error: alertError.message }, { status: 500 });
    }
  }

  return Response.json({
    source: "supabase",
    persisted: true,
    callback,
    captureId,
    nextAttemptAt: retry?.nextAttemptAt,
    exhausted: retry?.exhausted ?? false,
  });
}
