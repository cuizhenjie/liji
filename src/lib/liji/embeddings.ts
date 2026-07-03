import { z } from "zod";

import { env } from "./env";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

const embeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })).min(1),
  usage: z
    .object({
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export type EmbeddingResult = {
  provider: "openai";
  status: "ready" | "disabled" | "failed" | "empty";
  model: string;
  dimensions: number;
  embedding?: number[];
  tokenUsage?: number;
  message: string;
};

export type CreateEmbeddingParams = {
  text: string;
  fetcher?: typeof fetch;
  apiKey?: string;
  model?: string;
  dimensions?: number;
};

export function normalizeEmbeddingText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}

function parseDimensions(value: string | undefined) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_EMBEDDING_DIMENSIONS;
}

export function embeddingToVectorLiteral(embedding: number[]) {
  return `[${embedding.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

export async function createOpenAIEmbedding({
  text,
  fetcher = fetch,
  apiKey = env.OPENAI_API_KEY,
  model = env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
  dimensions = parseDimensions(env.OPENAI_EMBEDDING_DIMENSIONS),
}: CreateEmbeddingParams): Promise<EmbeddingResult> {
  const input = normalizeEmbeddingText(text);
  if (!input) {
    return {
      provider: "openai",
      status: "empty",
      model,
      dimensions,
      message: "没有可生成 embedding 的文本。",
    };
  }

  if (!apiKey) {
    return {
      provider: "openai",
      status: "disabled",
      model,
      dimensions,
      message: "未配置 OPENAI_API_KEY，跳过云端 embedding。",
    };
  }

  try {
    const response = await fetcher("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
        dimensions,
      }),
    });

    if (!response.ok) {
      return {
        provider: "openai",
        status: "failed",
        model,
        dimensions,
        message: `OpenAI embedding 请求失败：${response.status}`,
      };
    }

    const payload = embeddingResponseSchema.parse(await response.json());
    const embedding = payload.data[0].embedding;
    return {
      provider: "openai",
      status: "ready",
      model,
      dimensions: embedding.length,
      embedding,
      tokenUsage: payload.usage?.total_tokens,
      message: "embedding 已生成。",
    };
  } catch (error) {
    return {
      provider: "openai",
      status: "failed",
      model,
      dimensions,
      message: error instanceof Error ? error.message : "OpenAI embedding 请求异常。",
    };
  }
}
