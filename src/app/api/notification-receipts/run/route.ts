import { z } from "zod";

import { queryAliyunNotificationReceipts } from "@/lib/liji/aliyun";
import { isCronAuthorized, unauthorizedCronResponse } from "@/lib/liji/cron";
import type { Json } from "@/lib/liji/database.types";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import { mapNotificationLog } from "@/lib/liji/supabase-mappers";
import type { NotificationLog } from "@/lib/liji/types";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  recipientPhone: z.string().optional(),
});

function updatePayload(params: {
  currentStatus: NotificationLog["status"];
  providerRequestId?: string;
  providerStatus: "pending" | "delivered" | "failed" | "unknown";
  providerMessage: string;
  checkedAt: string;
  rawResult: Record<string, unknown>;
}) {
  return {
    status: params.providerStatus === "failed" ? "failed" : params.currentStatus,
    provider_request_id: params.providerRequestId ?? null,
    provider_status: params.providerStatus,
    receipt_checked_at: params.checkedAt,
    provider_message: params.providerMessage,
    raw_provider_receipt: params.rawResult as Json,
  };
}

async function runSupabaseReceiptPolling(params: {
  limit: number;
  recipientPhone?: string;
}) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("notification_logs")
    .select("*")
    .in("provider", ["aliyun_sms", "aliyun_voice"])
    .in("provider_status", ["submitted", "pending", "unknown"])
    .not("provider_receipt_id", "is", null)
    .order("sent_at", { ascending: true })
    .limit(params.limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const logs = rows.map(mapNotificationLog);
  const receipts = await queryAliyunNotificationReceipts({
    logs,
    recipientPhone: params.recipientPhone,
  });
  const rowsById = new Map(rows.map((row) => [String(row.id), row]));
  const processed = [];

  for (const receipt of receipts) {
    const row = rowsById.get(receipt.logId);
    if (!row || receipt.status === "skipped") {
      processed.push({
        logId: receipt.logId,
        channel: receipt.channel,
        status: receipt.status,
        providerStatus: receipt.providerStatus,
        providerMessage: receipt.providerMessage,
      });
      continue;
    }

    const currentStatus = (
      typeof row.status === "string" ? row.status : "sent"
    ) as NotificationLog["status"];
    const { error: updateError } = await client
      .from("notification_logs")
      .update(updatePayload({
        currentStatus,
        providerRequestId: receipt.requestId,
        providerStatus: receipt.providerStatus,
        providerMessage: receipt.providerMessage,
        checkedAt: receipt.checkedAt,
        rawResult: receipt.rawResult,
      }))
      .eq("id", receipt.logId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    processed.push({
      logId: receipt.logId,
      channel: receipt.channel,
      status: receipt.status,
      providerStatus: receipt.providerStatus,
      providerMessage: receipt.providerMessage,
    });
  }

  return processed;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const processed = await runSupabaseReceiptPolling(body);
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，通知回执轮询处于 demo 模式。",
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const processed = await runSupabaseReceiptPolling({ limit: 50 });
  if (processed) {
    return Response.json({ source: "supabase", processed });
  }

  return Response.json({
    source: "demo",
    processed: [],
    message: "未配置 Supabase service role，通知回执轮询处于 demo 模式。",
  });
}
