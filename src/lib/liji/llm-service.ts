/**
 * LLM Service for Liji
 * Supports OpenAI and Claude APIs with streaming
 */

export type LLMProvider = "openai" | "claude" | "mock";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMStreamChunk {
  type: "text" | "done" | "error";
  content?: string;
  error?: string;
}

/**
 * Get the configured LLM provider from environment variables
 */
export function getConfiguredProvider(): LLMProvider {
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "claude";
  }
  return "mock";
}

/**
 * Get the model for a given provider
 */
function getModel(provider: LLMProvider, model?: string): string {
  if (model) return model;
  
  switch (provider) {
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-4o-mini";
    case "claude":
      return process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307";
    default:
      return "mock";
  }
}

/**
 * Stream a response from OpenAI
 */
async function* streamOpenAI(
  messages: LLMMessage[],
  options: LLMStreamOptions
): AsyncGenerator<LLMStreamChunk> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    yield { type: "error", error: "OpenAI API key not configured" };
    return;
  }

  const model = getModel("openai", options.model);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `OpenAI API error: ${response.status} - ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: "text", content };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    yield { type: "error", error: `OpenAI stream error: ${error}` };
  }
}

/**
 * Stream a response from Claude (Anthropic)
 */
async function* streamClaude(
  messages: LLMMessage[],
  options: LLMStreamOptions
): AsyncGenerator<LLMStreamChunk> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    yield { type: "error", error: "Anthropic API key not configured" };
    return;
  }

  const model = getModel("claude", options.model);

  // Extract system message
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 1000,
        system: systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `Claude API error: ${response.status} - ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === "content_block_delta") {
              const content = parsed.delta?.text;
              if (content) {
                yield { type: "text", content };
              }
            } else if (parsed.type === "message_stop") {
              yield { type: "done" };
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    yield { type: "error", error: `Claude stream error: ${error}` };
  }
}

/**
 * Mock stream for development/testing
 */
async function* streamMock(
  messages: LLMMessage[],
  _options: LLMStreamOptions
): AsyncGenerator<LLMStreamChunk> {
  // Simulate streaming by yielding chunks of a mock response
  const userMessage = messages.find((m) => m.role === "user")?.content || "";
  
  let response = "";
  
  if (userMessage.includes("礼品") || userMessage.includes("推荐")) {
    response = `根据您的需求，我为您推荐以下方案：

**推荐礼品**
1. 精选茶叶礼盒 - ¥388，适合商务场合
2. 健康保健品套装 - ¥588，适合长辈
3. 生日蛋糕预订 - ¥268，甜蜜祝福

**推荐理由**
- 符合合规要求（单件不超过限额）
- 匹配对方偏好和关系亲密度
- 考虑了节日/场合的特殊性

**问候语建议**
"祝您生日快乐，身体健康，万事如意！"

需要我帮您生成详细的履约方案吗？`;
  } else if (userMessage.includes("问候") || userMessage.includes("祝福")) {
    response = `为您生成个性化问候语：

**正式场合**
"尊敬的XX，值此佳节，谨向您致以最诚挚的祝福。愿您事业顺利，身体健康，阖家幸福。"

**亲密关系**
"亲爱的XX，节日快乐！希望你每天都开开心心，心想事成。想你了！"

**商务客户**
"XX总，感谢您的信任与支持。祝您工作顺利，生活美满。期待继续合作！"

需要调整语气或内容吗？`;
  } else {
    response = `我是礼记 AI 助手，可以帮您：

1. **礼品推荐** - 根据关系、场合、预算推荐合适的礼品
2. **问候语生成** - 生成个性化的祝福语
3. **日程管理** - 提醒重要日期和待办事项
4. **合规检查** - 确保礼品赠送符合规定

请告诉我您需要什么帮助？`;
  }

  // Simulate streaming by yielding word by word
  const words = response.split(/(\s+)/);
  for (const word of words) {
    if (word.trim()) {
      yield { type: "text", content: word };
      // Simulate typing delay
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  yield { type: "done" };
}

/**
 * Main function to stream LLM response
 */
export async function* streamLLMResponse(
  messages: LLMMessage[],
  options: LLMStreamOptions = {}
): AsyncGenerator<LLMStreamChunk> {
  const provider = options.provider ?? getConfiguredProvider();

  switch (provider) {
    case "openai":
      yield* streamOpenAI(messages, options);
      break;
    case "claude":
      yield* streamClaude(messages, options);
      break;
    case "mock":
    default:
      yield* streamMock(messages, options);
      break;
  }
}

/**
 * Non-streaming LLM call for simple use cases
 */
export async function callLLM(
  messages: LLMMessage[],
  options: LLMStreamOptions = {}
): Promise<string> {
  const chunks: string[] = [];
  
  for await (const chunk of streamLLMResponse(messages, options)) {
    if (chunk.type === "text" && chunk.content) {
      chunks.push(chunk.content);
    } else if (chunk.type === "error") {
      throw new Error(chunk.error);
    }
  }

  return chunks.join("");
}
