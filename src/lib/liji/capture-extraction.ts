import { createHash, randomUUID } from "node:crypto";

import type { CaptureSource } from "./types";

export type CaptureExtractionRequest = {
  source: CaptureSource;
  text?: string;
  fileName?: string;
  mimeType?: string;
  contentUri?: string;
  contentBase64?: string;
};

export type CaptureExtractionResult = {
  source: CaptureSource;
  provider: "local-normalizer" | "provider-required" | "queued-provider";
  extractedText: string;
  confidence: number;
  requiresManualReview: boolean;
  warnings: string[];
  job?: CaptureExtractionJob;
};

export type CaptureExtractionJob = {
  id: string;
  source: Exclude<CaptureSource, "text">;
  jobType: "ocr" | "asr";
  provider: string;
  status: "queued";
  fileName?: string;
  mimeType?: string;
  inputUri?: string;
  contentHash: string;
};

const noisyScreenshotLines = [
  /^微信$/,
  /^支付宝$/,
  /^中国移动|中国联通|中国电信/,
  /^\d{1,2}:\d{2}$/,
  /^\d+%$/,
];

function cleanLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeVoice(text: string) {
  return compactText(text)
    .replace(/^(请帮我记一下|帮我记一下|请帮我|提醒我|记一下|帮我)[，,。 ]*/u, "")
    .replace(/[，。！？,.!?]+$/u, "");
}

function normalizeScreenshot(text: string) {
  return cleanLines(text)
    .filter((line) => !noisyScreenshotLines.some((pattern) => pattern.test(line)))
    .join("；");
}

function normalizeChat(text: string) {
  return cleanLines(text)
    .map((line) =>
      line
        .replace(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}\s*/u, "")
        .replace(/^\d{1,2}:\d{2}\s*/u, "")
        .replace(/^([\u4e00-\u9fa5A-Za-z0-9_ -]{1,12})[:：]\s*/u, "$1 ")
    )
    .join("；");
}

function normalizeBill(text: string) {
  const normalized = cleanLines(text).join("；");
  const amount = normalized.match(/(?:¥|￥|人民币|支付|扣款|消费)?\s*(\d+(?:\.\d{1,2})?)\s*(?:元)?/u)?.[1];
  const merchant = normalized.match(/(?:商户|收款方|付款给|对方户名)[:： ]*([^；]+)/u)?.[1];
  const parts = [merchant ? `商户${merchant}` : "", amount ? `金额${amount}元` : "", normalized]
    .filter(Boolean);

  return Array.from(new Set(parts)).join("；");
}

function contentHash(contentBase64: string) {
  return createHash("sha256").update(contentBase64).digest("hex");
}

function providerForSource(source: CaptureSource) {
  if (source === "voice") {
    return {
      jobType: "asr" as const,
      provider: process.env.LIJI_CAPTURE_ASR_PROVIDER,
    };
  }

  if (source === "screenshot" || source === "bill" || source === "chat") {
    return {
      jobType: "ocr" as const,
      provider: process.env.LIJI_CAPTURE_OCR_PROVIDER,
    };
  }

  return null;
}

export function extractCaptureText(input: CaptureExtractionRequest): CaptureExtractionResult {
  const rawText = input.text?.trim() ?? "";
  const warnings: string[] = [];

  if (!rawText && input.contentBase64) {
    const provider = providerForSource(input.source);
    if (provider?.provider) {
      const hash = contentHash(input.contentBase64);
      const source = input.source === "text" ? null : input.source;
      if (!source) {
        warnings.push("文本采集不需要 OCR/ASR provider。");
        return {
          source: input.source,
          provider: "provider-required",
          extractedText: "",
          confidence: 0,
          requiresManualReview: true,
          warnings,
        };
      }
      warnings.push(`${input.fileName ?? input.mimeType ?? "附件"} 已进入 ${provider.provider} 抽取队列。`);
      return {
        source: input.source,
        provider: "queued-provider",
        extractedText: "",
        confidence: 0,
        requiresManualReview: true,
        warnings,
        job: {
          id: `capjob_${randomUUID()}`,
          source,
          jobType: provider.jobType,
          provider: provider.provider,
          status: "queued",
          fileName: input.fileName,
          mimeType: input.mimeType,
          inputUri: input.contentUri,
          contentHash: hash,
        },
      };
    }

    warnings.push(`${input.fileName ?? input.mimeType ?? "附件"} 需要接入 OCR/ASR provider 后自动抽取。`);
    return {
      source: input.source,
      provider: "provider-required",
      extractedText: "",
      confidence: 0,
      requiresManualReview: true,
      warnings,
    };
  }

  const extractedText =
    input.source === "voice"
      ? normalizeVoice(rawText)
      : input.source === "screenshot"
        ? normalizeScreenshot(rawText)
        : input.source === "chat"
          ? normalizeChat(rawText)
          : input.source === "bill"
            ? normalizeBill(rawText)
            : compactText(rawText);

  if (!extractedText) {
    warnings.push("未抽取到可解析文本，请手动补充。");
  }

  return {
    source: input.source,
    provider: "local-normalizer",
    extractedText,
    confidence: extractedText ? (input.source === "text" ? 0.98 : 0.76) : 0,
    requiresManualReview: input.source !== "text",
    warnings,
  };
}
