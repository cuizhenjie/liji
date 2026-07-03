import { z } from "zod";

import { captureSourceSchema } from "@/lib/liji/ai";
import { extractCaptureText, type CaptureExtractionJob } from "@/lib/liji/capture-extraction";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  source: captureSourceSchema.default("text"),
  text: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  contentBase64: z.string().optional(),
});

function jobRow(userId: string, job: CaptureExtractionJob) {
  return {
    id: job.id,
    user_id: userId,
    source_type: job.source,
    job_type: job.jobType,
    provider: job.provider,
    status: job.status,
    file_name: job.fileName,
    mime_type: job.mimeType,
    content_hash: job.contentHash,
  };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const extraction = extractCaptureText(body);
  let persistedJob = false;

  if (extraction.job) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { error } = await supabase
          .from("capture_extraction_jobs")
          .upsert(jobRow(data.user.id, extraction.job));
        if (!error) {
          persistedJob = true;
        }
      }
    }
  }

  return Response.json({
    extraction,
    persistedJob,
  });
}
