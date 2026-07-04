import { z } from "zod";

import { importSmsBillMessages } from "@/lib/liji/sms-bill-import";
import { SupabaseWorkspaceRepository } from "@/lib/liji/repository";
import { demoContacts } from "@/lib/liji/sample-data";
import { createSupabaseServerClient } from "@/lib/liji/supabase-server";

const messageSchema = z.object({
  text: z.string(),
  receivedAt: z.string().optional(),
  sender: z.string().optional(),
});

const requestSchema = z.object({
  text: z.string().optional(),
  receivedAt: z.string().optional(),
  sender: z.string().optional(),
  messages: z.array(messageSchema).optional(),
  allowCloudModel: z.boolean().default(false),
});

function captureRow(userId: string, capture: Awaited<ReturnType<typeof importSmsBillMessages>>["captures"][number]) {
  return {
    id: capture.id,
    user_id: userId,
    raw_text: capture.rawText,
    masked_text: capture.maskedText,
    source_type: capture.sourceType,
    status: capture.status,
    parsed: capture.parsed,
    pii_tokens: capture.piiTokens,
    created_at: capture.createdAt,
  };
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const messages = body.messages?.length
    ? body.messages
    : body.text
      ? [{ text: body.text, receivedAt: body.receivedAt, sender: body.sender }]
      : [];

  if (messages.length === 0) {
    return Response.json({ error: "sms text is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const repository = new SupabaseWorkspaceRepository(supabase);
      const workspace = await repository.getWorkspace(data.user.id);
      const result = await importSmsBillMessages({
        messages,
        contacts: workspace.contacts.length > 0 ? workspace.contacts : demoContacts,
        allowCloudModel: body.allowCloudModel && workspace.privacy.cloudModelEnabled,
        now: new Date(),
      });
      const { error } = await supabase
        .from("capture_items")
        .upsert(result.captures.map((capture) => captureRow(data.user.id, capture)));

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({
        source: "supabase",
        bridge: "native_sms_bridge",
        captures: result.captures,
        skipped: result.skipped,
        persisted: result.captures.length,
      });
    }
  }

  const result = await importSmsBillMessages({
    messages,
    contacts: demoContacts,
    allowCloudModel: false,
    now: new Date(),
  });

  return Response.json({
    source: "demo",
    bridge: "native_sms_bridge",
    captures: result.captures,
    skipped: result.skipped,
    persisted: 0,
    message: "PWA 无法直接监听系统短信；原生壳或短信 webhook 可调用该入口写入确认中心。",
  });
}
