import { z } from "zod";

import { resolveRelativeChineseDate } from "./calendar";
import { maskPii } from "./pii";
import { parseNaturalLanguageInput } from "./parser";
import type { CaptureItem, Contact, ParsedInput, PiiToken } from "./types";

export const captureSourceSchema = z.enum([
  "text",
  "voice",
  "screenshot",
  "chat",
  "bill",
]);

export type CaptureSource = z.infer<typeof captureSourceSchema>;

function nullableString() {
  return z.string().nullable().optional().transform((value) => value ?? undefined);
}

function nullableNumber() {
  return z.number().nonnegative().nullable().optional().transform((value) => value ?? undefined);
}

const aiParsedResponseSchema = z.object({
  intent: z.enum(["event", "travel", "transaction", "memory", "bill"]),
  title: z.string().min(1),
  targetName: nullableString(),
  relation: nullableString(),
  date: nullableString(),
  endDate: nullableString(),
  amountCny: nullableNumber(),
  budgetCny: nullableNumber(),
  location: nullableString(),
  reminderLevel: z.enum(["level_1", "level_2", "level_3"]),
  frequency: nullableString(),
  notes: nullableString(),
  confidence: z.number().min(0).max(1),
});

export const aiCaptureSchema = z.object({
  parsed: aiParsedResponseSchema,
});

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseItem = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIResponseItem[];
};

export type ParseInputRequest = {
  text: string;
  contacts?: Contact[];
  source?: CaptureSource;
  allowCloudModel?: boolean;
  now?: Date;
  fetcher?: typeof fetch;
};

export type ParseInputResult = {
  capture: CaptureItem;
  provider: "local-rules" | "openai";
  piiTokens: PiiToken[];
};

function normalizeSourceText(text: string, source: CaptureSource) {
  const trimmed = text.trim();
  if (source === "voice") {
    return trimmed.replace(/[，。！？]+$/g, "");
  }
  if (source === "screenshot" || source === "chat") {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("；");
  }
  return trimmed;
}

function jsonSchemaForAiCapture() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["parsed"],
    properties: {
      parsed: {
        type: "object",
        additionalProperties: false,
        required: [
          "intent",
          "title",
          "targetName",
          "relation",
          "date",
          "endDate",
          "amountCny",
          "budgetCny",
          "location",
          "reminderLevel",
          "frequency",
          "notes",
          "confidence",
        ],
        properties: {
          intent: { type: "string", enum: ["event", "travel", "transaction", "memory", "bill"] },
          title: { type: "string" },
          targetName: { type: ["string", "null"] },
          relation: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          amountCny: { type: ["number", "null"] },
          budgetCny: { type: ["number", "null"] },
          location: { type: ["string", "null"] },
          reminderLevel: { type: "string", enum: ["level_1", "level_2", "level_3"] },
          frequency: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  };
}

function extractResponseText(payload: OpenAIResponsePayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => typeof content.text === "string")?.text;
}

function buildCaptureFromParsed(params: {
  rawText: string;
  maskedText: string;
  source: CaptureSource;
  parsed: ParsedInput;
  piiTokens: PiiToken[];
  now: Date;
}): CaptureItem {
  return {
    id: crypto.randomUUID?.() ?? `capture-${Date.now()}`,
    rawText: params.rawText,
    maskedText: params.maskedText,
    sourceType: params.source,
    status: "pending",
    parsed: params.parsed,
    piiTokens: params.piiTokens,
    createdAt: params.now.toISOString(),
  };
}

async function parseWithOpenAI(params: {
  text: string;
  maskedText: string;
  source: CaptureSource;
  now: Date;
  fetcher: typeof fetch;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await params.fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      input: [
        {
          role: "system",
          content:
            "你是礼记的结构化采集解析器。只根据脱敏文本抽取关系、日程、账单、记忆或差旅信息，不能编造个人身份。",
        },
        {
          role: "user",
          content: JSON.stringify({
            source: params.source,
            referenceDate: params.now.toISOString(),
            text: params.maskedText,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "liji_capture",
          strict: true,
          schema: jsonSchemaForAiCapture(),
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    return null;
  }

  const parsedPayload = aiCaptureSchema.parse(JSON.parse(outputText));
  return parsedPayload.parsed;
}

export async function parseInputWithProvider({
  text,
  contacts = [],
  source = "text",
  allowCloudModel = false,
  now = new Date("2026-07-01T09:00:00+08:00"),
  fetcher = fetch,
}: ParseInputRequest): Promise<ParseInputResult> {
  const normalizedText = normalizeSourceText(text, source);
  const pii = maskPii(normalizedText, contacts);

  if (allowCloudModel) {
    const parsed = await parseWithOpenAI({
      text: normalizedText,
      maskedText: pii.maskedText,
      source,
      now,
      fetcher,
    }).catch(() => null);

    if (parsed) {
      return {
        capture: buildCaptureFromParsed({
          rawText: normalizedText,
          maskedText: pii.maskedText,
          source,
          parsed: {
            ...parsed,
            date: parsed.date ?? resolveRelativeChineseDate(normalizedText, now),
          },
          piiTokens: pii.tokens,
          now,
        }),
        provider: "openai",
        piiTokens: pii.tokens,
      };
    }
  }

  return {
    capture: parseNaturalLanguageInput(normalizedText, contacts, now, source),
    provider: "local-rules",
    piiTokens: pii.tokens,
  };
}
