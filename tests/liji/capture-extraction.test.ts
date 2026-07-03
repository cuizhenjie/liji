import { afterEach, describe, expect, it, vi } from "vitest";

import { extractCaptureText } from "../../src/lib/liji/capture-extraction";

describe("capture extraction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes voice commands before parsing", () => {
    const result = extractCaptureText({
      source: "voice",
      text: "帮我记一下，下周五是女儿生日，预算2000元。",
    });

    expect(result.extractedText).toBe("下周五是女儿生日，预算2000元");
    expect(result.requiresManualReview).toBe(true);
  });

  it("cleans chat transcript timestamps and keeps speaker context", () => {
    const result = extractCaptureText({
      source: "chat",
      text: "10:21 周明：下次宴请不吃香菜\n10:22 我：收到",
    });

    expect(result.extractedText).toContain("周明 下次宴请不吃香菜");
  });

  it("marks binary attachments as provider-required", () => {
    const result = extractCaptureText({
      source: "screenshot",
      fileName: "receipt.png",
      mimeType: "image/png",
      contentBase64: "ZmFrZQ==",
    });

    expect(result.provider).toBe("provider-required");
    expect(result.requiresManualReview).toBe(true);
  });

  it("queues binary attachments when OCR provider is configured", () => {
    vi.stubEnv("LIJI_CAPTURE_OCR_PROVIDER", "aliyun-ocr");

    const result = extractCaptureText({
      source: "screenshot",
      fileName: "receipt.png",
      mimeType: "image/png",
      contentBase64: "ZmFrZQ==",
    });

    expect(result.provider).toBe("queued-provider");
    expect(result.job?.jobType).toBe("ocr");
    expect(result.job?.provider).toBe("aliyun-ocr");
    expect(result.job?.contentHash).toHaveLength(64);
  });
});
