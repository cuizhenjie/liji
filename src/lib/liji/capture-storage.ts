import { Buffer } from "node:buffer";

import { env } from "./env";
import type { CaptureExtractionJob } from "./capture-extraction";

export const DEFAULT_CAPTURE_STORAGE_BUCKET = "liji-capture-attachments";
export const DEFAULT_CAPTURE_SIGNED_URL_TTL_SECONDS = 60 * 60;

export type CaptureStorageUploadResult =
  | {
      status: "uploaded";
      bucket: string;
      path: string;
      inputUri: string;
      signedUrlExpiresAt: string;
      sizeBytes: number;
    }
  | {
      status: "failed";
      bucket: string;
      path?: string;
      errorMessage: string;
    };

type StorageBucketClient = {
  upload: (
    path: string,
    body: Buffer,
    options: {
      contentType?: string;
      upsert?: boolean;
    }
  ) => Promise<{ data: { path?: string } | null; error: { message: string } | null }>;
  createSignedUrl: (
    path: string,
    expiresIn: number
  ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
};

export type CaptureStorageClient = {
  storage: {
    from: (bucket: string) => StorageBucketClient;
  };
};

function captureStorageBucket(bucket?: string) {
  return bucket ?? env.LIJI_CAPTURE_STORAGE_BUCKET ?? DEFAULT_CAPTURE_STORAGE_BUCKET;
}

function captureSignedUrlTtlSeconds(ttlSeconds?: number) {
  if (ttlSeconds) {
    return ttlSeconds;
  }

  const parsed = Number(env.LIJI_CAPTURE_STORAGE_SIGNED_URL_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CAPTURE_SIGNED_URL_TTL_SECONDS;
}

function decodeBase64(contentBase64: string) {
  const base64 = contentBase64.includes(",")
    ? contentBase64.slice(contentBase64.indexOf(",") + 1)
    : contentBase64;
  return Buffer.from(base64, "base64");
}

function safePathSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+(\.[^.]+)$/g, "$1")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function extensionFromMime(mimeType?: string) {
  const subtype = mimeType?.split(";")[0]?.split("/")[1];
  if (!subtype) return "bin";
  return safePathSegment(subtype.replace("jpeg", "jpg")) || "bin";
}

export function buildCaptureStoragePath(params: {
  userId: string;
  jobId: string;
  fileName?: string;
  mimeType?: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const day = now.toISOString().slice(0, 10);
  const rawFileName =
    params.fileName?.trim() ||
    `attachment.${extensionFromMime(params.mimeType)}`;
  const fileName = safePathSegment(rawFileName) || `attachment.${extensionFromMime(params.mimeType)}`;

  return [
    safePathSegment(params.userId) || "unknown-user",
    day,
    safePathSegment(params.jobId) || "capture-job",
    fileName,
  ].join("/");
}

export async function uploadCaptureAttachmentToStorage(params: {
  client: CaptureStorageClient;
  userId: string;
  job: CaptureExtractionJob;
  contentBase64: string;
  bucket?: string;
  signedUrlTtlSeconds?: number;
  now?: Date;
}): Promise<CaptureStorageUploadResult> {
  const bucket = captureStorageBucket(params.bucket);
  const path = buildCaptureStoragePath({
    userId: params.userId,
    jobId: params.job.id,
    fileName: params.job.fileName,
    mimeType: params.job.mimeType,
    now: params.now,
  });
  const body = decodeBase64(params.contentBase64);

  if (body.length === 0) {
    return {
      status: "failed",
      bucket,
      path,
      errorMessage: "附件内容为空，无法上传到对象存储。",
    };
  }

  const storage = params.client.storage.from(bucket);
  const upload = await storage.upload(path, body, {
    contentType: params.job.mimeType,
    upsert: false,
  });

  if (upload.error) {
    return {
      status: "failed",
      bucket,
      path,
      errorMessage: upload.error.message,
    };
  }

  const ttlSeconds = captureSignedUrlTtlSeconds(params.signedUrlTtlSeconds);
  const signed = await storage.createSignedUrl(path, ttlSeconds);
  if (signed.error || !signed.data?.signedUrl) {
    return {
      status: "failed",
      bucket,
      path,
      errorMessage: signed.error?.message ?? "对象存储未返回 signed URL。",
    };
  }

  return {
    status: "uploaded",
    bucket,
    path: upload.data?.path ?? path,
    inputUri: signed.data.signedUrl,
    signedUrlExpiresAt: new Date((params.now ?? new Date()).getTime() + ttlSeconds * 1000).toISOString(),
    sizeBytes: body.length,
  };
}
