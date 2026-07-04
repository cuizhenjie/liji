import { z } from "zod";

import {
  getNativeBridgeCapabilities,
  validateNativeBridgePayload,
} from "@/lib/liji/native-bridge";

const requestSchema = z.object({
  source: z.enum(["sms", "recording", "file_upload"]),
  text: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  totalBytes: z.number().nonnegative().optional(),
  uploadedBytes: z.number().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
});

export async function GET() {
  return Response.json({
    capabilities: getNativeBridgeCapabilities(),
  });
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));

  return Response.json({
    validation: validateNativeBridgePayload(body),
    capabilities: getNativeBridgeCapabilities(),
  });
}
