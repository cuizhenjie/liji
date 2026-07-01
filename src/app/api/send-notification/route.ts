import { z } from "zod";

import { channelsForLevel } from "@/lib/liji/reminders";

const requestSchema = z.object({
  title: z.string(),
  level: z.enum(["level_1", "level_2", "level_3"]),
  acknowledged: z.boolean().default(false),
});

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());

  return Response.json({
    provider: "mock",
    title: body.title,
    channels: channelsForLevel(body.level, body.acknowledged),
    status: "queued",
    message: "MVP 使用 mock provider；可替换为阿里云短信/语音服务适配器。",
  });
}
