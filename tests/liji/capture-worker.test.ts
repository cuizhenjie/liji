import { describe, expect, it, vi } from "vitest";

import { processCaptureExtractionJob } from "../../src/lib/liji/capture-worker";

const job = {
  id: "capjob-1",
  userId: "user-1",
  sourceType: "screenshot" as const,
  jobType: "ocr" as const,
  provider: "aliyun-ocr",
  status: "queued" as const,
  fileName: "receipt.png",
  mimeType: "image/png",
  inputUri: "https://storage.example.test/receipt.png",
  contentHash: "hash",
};

describe("capture extraction worker", () => {
  it("waits when provider endpoint is not configured", async () => {
    const result = await processCaptureExtractionJob({ job, endpoint: "" });

    expect(result.status).toBe("waiting_provider");
  });

  it("calls provider endpoint and returns extracted text", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        status: "completed",
        extractedText: "周明下次宴请不吃香菜",
        confidence: 0.91,
      })
    ) as unknown as typeof fetch;

    const result = await processCaptureExtractionJob({
      job,
      endpoint: "https://ocr.example.test/jobs",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.status).toBe("completed");
    expect(result.extractedText).toContain("周明");
  });

  it("fails before provider call when input uri is missing", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const result = await processCaptureExtractionJob({
      job: { ...job, inputUri: undefined },
      endpoint: "https://ocr.example.test/jobs",
      fetcher,
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("inputUri");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails when provider returns no text", async () => {
    const result = await processCaptureExtractionJob({
      job,
      endpoint: "https://ocr.example.test/jobs",
      fetcher: (async () => Response.json({ status: "completed" })) as typeof fetch,
    });

    expect(result.status).toBe("failed");
  });
});
