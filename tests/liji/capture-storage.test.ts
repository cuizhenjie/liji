import { describe, expect, it, vi } from "vitest";

import {
  buildCaptureStoragePath,
  uploadCaptureAttachmentToStorage,
  type CaptureStorageClient,
} from "../../src/lib/liji/capture-storage";

const job = {
  id: "capjob_123",
  source: "screenshot" as const,
  jobType: "ocr" as const,
  provider: "aliyun-ocr",
  status: "queued" as const,
  fileName: "客户账单 7月.png",
  mimeType: "image/png",
  contentHash: "hash",
};

describe("capture attachment storage", () => {
  it("builds user-scoped object paths", () => {
    const path = buildCaptureStoragePath({
      userId: "user-1",
      jobId: "capjob_123",
      fileName: "客户账单 7月.png",
      now: new Date("2026-07-03T10:00:00+08:00"),
    });

    expect(path).toBe("user-1/2026-07-03/capjob_123/7.png");
  });

  it("uploads base64 attachments and creates signed input uri", async () => {
    const upload = vi.fn(
      async (...args: [string, Buffer, { contentType?: string; upsert?: boolean }]) => ({
        data: { path: args[0] },
        error: null,
      })
    );
    const createSignedUrl = vi.fn(async (path: string) => ({
      data: { signedUrl: `https://storage.example.test/${path}?token=signed` },
      error: null,
    }));
    const client: CaptureStorageClient = {
      storage: {
        from: () => ({
          upload,
          createSignedUrl,
        }),
      },
    };

    const result = await uploadCaptureAttachmentToStorage({
      client,
      userId: "user-1",
      job,
      contentBase64: "data:image/png;base64,ZmFrZQ==",
      bucket: "bucket",
      signedUrlTtlSeconds: 60,
      now: new Date("2026-07-03T10:00:00+08:00"),
    });

    expect(result.status).toBe("uploaded");
    expect(result.status === "uploaded" ? result.inputUri : "").toContain("token=signed");
    expect(upload.mock.calls[0][0]).toBe("user-1/2026-07-03/capjob_123/7.png");
    expect(Buffer.isBuffer(upload.mock.calls[0][1])).toBe(true);
    expect(upload.mock.calls[0][2]).toEqual({ contentType: "image/png", upsert: false });
    expect(createSignedUrl).toHaveBeenCalledWith(
      "user-1/2026-07-03/capjob_123/7.png",
      60
    );
  });

  it("fails empty attachments before uploading", async () => {
    const upload = vi.fn();
    const client: CaptureStorageClient = {
      storage: {
        from: () => ({
          upload,
          createSignedUrl: vi.fn(),
        }),
      },
    };

    const result = await uploadCaptureAttachmentToStorage({
      client,
      userId: "user-1",
      job,
      contentBase64: "",
    });

    expect(result.status).toBe("failed");
    expect(upload).not.toHaveBeenCalled();
  });
});
