import type { Json } from "@/lib/liji/database.types";
import { env } from "@/lib/liji/env";
import {
  normalizeAliyunPushedNotificationReceipts,
  notificationReceiptUpdatePayload,
  verifyNotificationReceiptSignature,
  type PushedNotificationReceipt,
} from "@/lib/liji/notification-receipts";
import { createSupabaseServiceClient } from "@/lib/liji/supabase-server";
import type { NotificationLog } from "@/lib/liji/types";

type SupabaseServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

function aliyunAck(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json({ code: 0, msg: "Received successfully", ...body }, init);
}

function parseRawBody(rawBody: string) {
  if (!rawBody.trim()) {
    return [];
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function signatureFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    signature:
      request.headers.get("x-liji-signature") ??
      request.headers.get("x-aliyun-signature") ??
      url.searchParams.get("signature"),
    token: url.searchParams.get("token"),
  };
}

async function persistReceipt(
  client: SupabaseServiceClient | null,
  receipt: PushedNotificationReceipt
) {
  if (!client || !receipt.providerReceiptId) {
    return null;
  }

  const { data, error } = await client
    .from("notification_logs")
    .select("id,status")
    .eq("provider", receipt.provider)
    .eq("provider_receipt_id", receipt.providerReceiptId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return {
      providerReceiptId: receipt.providerReceiptId,
      provider: receipt.provider,
      status: "unmatched" as const,
      updated: 0,
    };
  }

  let updated = 0;
  for (const row of rows) {
    const currentStatus = (
      typeof row.status === "string" ? row.status : "sent"
    ) as NotificationLog["status"];
    const { error: updateError } = await client
      .from("notification_logs")
      .update({
        ...notificationReceiptUpdatePayload({ currentStatus, receipt }),
        raw_provider_receipt: receipt.rawResult as Json,
      })
      .eq("id", String(row.id));

    if (updateError) {
      throw new Error(updateError.message);
    }

    updated += 1;
  }

  return {
    providerReceiptId: receipt.providerReceiptId,
    provider: receipt.provider,
    status: "updated" as const,
    updated,
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const client = createSupabaseServiceClient();
  if (client && !env.LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET) {
    return Response.json({
      code: 401,
      msg: "LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET is required for persisted notification receipts",
    }, { status: 401 });
  }

  const { signature, token } = signatureFromRequest(request);
  const authorized = verifyNotificationReceiptSignature({
    rawBody,
    secret: env.LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET,
    signature,
    token,
  });

  if (!authorized) {
    return Response.json({ code: 401, msg: "invalid receipt signature" }, { status: 401 });
  }

  const receipts = normalizeAliyunPushedNotificationReceipts(parseRawBody(rawBody));
  const processed = [];
  let unmatched = 0;

  for (const receipt of receipts) {
    const result = await persistReceipt(client, receipt);
    if (!result) {
      unmatched += 1;
      processed.push({
        provider: receipt.provider,
        providerReceiptId: receipt.providerReceiptId,
        providerStatus: receipt.providerStatus,
        status: "queued_without_store",
      });
      continue;
    }

    if (result.status === "unmatched") {
      unmatched += 1;
    }
    processed.push(result);
  }

  return aliyunAck({
    source: client ? "supabase" : "demo",
    accepted: receipts.length,
    processed,
    unmatched,
  });
}
