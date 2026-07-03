import { z } from "zod";

import { captureSourceSchema } from "@/lib/liji/ai";
import {
  uploadCaptureAttachmentToStorage,
  type CaptureStorageUploadResult,
} from "@/lib/liji/capture-storage";
import { extractCaptureText, type CaptureExtractionJob } from "@/lib/liji/capture-extraction";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/liji/supabase-server";

const requestSchema = z.object({
  source: captureSourceSchema.default("text"),
  text: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  contentUri: z.string().url().optional(),
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
    input_uri: job.inputUri,
    content_hash: job.contentHash,
  };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const extraction = extractCaptureText(body);
  let persistedJob = false;
  let storageUpload: CaptureStorageUploadResult | null = null;

  if (extraction.job) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        if (body.contentBase64 && !extraction.job.inputUri) {
          storageUpload = await uploadCaptureAttachmentToStorage({
            client: createSupabaseServiceClient() ?? supabase,
            userId: data.user.id,
            job: extraction.job,
            contentBase64: body.contentBase64,
          });

          if (storageUpload.status === "uploaded") {
            extraction.job.inputUri = storageUpload.inputUri;
            extraction.warnings.push("附件已上传到对象存储，OCR/ASR worker 可通过 signed URL 拉取。");
          } else {
            extraction.warnings.push(`附件对象存储上传失败：${storageUpload.errorMessage}`);
          }
        }

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
    storageUpload,
  });
}
