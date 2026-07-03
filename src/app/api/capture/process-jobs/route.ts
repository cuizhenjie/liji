import { z } from "zod";

import { parseInputWithProvider } from "@/lib/liji/ai";
import type { Json } from "@/lib/liji/database.types";
import {
  processCaptureExtractionJob,
  type CaptureExtractionJobRecord,
} from "@/lib/liji/capture-worker";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import { mapContact } from "@/lib/liji/supabase-mappers";
import type { CaptureItem, Contact } from "@/lib/liji/types";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function mapJob(row: Record<string, unknown>): CaptureExtractionJobRecord | null {
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
    queuedAt: text(row, "queued_at"),
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

async function loadContacts(userId: string, client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>) {
  const { data, error } = await client.from("contacts").select("*").eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapContact(row as Record<string, unknown>));
}

async function upsertCaptureFromExtractedText(params: {
  client: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
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

async function runSupabaseCaptureJobs(limit: number) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("capture_extraction_jobs")
    .select("*")
    .eq("status", "queued")
    .order("queued_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const processed = [];
  for (const row of data ?? []) {
    const job = mapJob(row as Record<string, unknown>);
    if (!job) {
      continue;
    }

    await client
      .from("capture_extraction_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    const result = await processCaptureExtractionJob({ job });
    let captureId = job.captureId;

    if (result.status === "completed" && result.extractedText) {
      const contacts = await loadContacts(job.userId, client);
      const capture = await upsertCaptureFromExtractedText({
        client,
        job,
        contacts,
        extractedText: result.extractedText,
      });
      captureId = capture.id;
    }

    const { error: updateError } = await client
      .from("capture_extraction_jobs")
      .update({
        capture_id: captureId,
        status: result.status === "completed" ? "completed" : result.status === "failed" ? "failed" : "queued",
        extracted_text: result.extractedText,
        error_message: result.errorMessage,
        raw_result: result.rawResult as Json,
        completed_at: result.status === "completed" || result.status === "failed" ? new Date().toISOString() : null,
      })
      .eq("id", job.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    processed.push({ ...result, captureId });
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
