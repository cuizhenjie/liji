import crypto from "node:crypto";

export type PushedNotificationReceipt = {
  provider: "aliyun_sms" | "aliyun_voice";
  channel: "sms" | "voice";
  providerReceiptId?: string;
  providerRequestId?: string;
  providerStatus: "pending" | "delivered" | "failed" | "unknown";
  providerMessage: string;
  checkedAt: string;
  rawResult: Record<string, unknown>;
  recipientPhone?: string;
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapMessageBody(payload: Record<string, unknown>) {
  for (const key of ["MessageBody", "messageBody", "message_body", "Message", "message", "body", "arg"]) {
    const value = payload[key];
    if (typeof value === "string") {
      const parsed = parseJsonString(value);
      if (parsed !== value) return parsed;
    }

    if (isRecord(value) || Array.isArray(value)) {
      return value;
    }
  }

  return null;
}

function looksLikeReceiptRecord(payload: Record<string, unknown>) {
  return Boolean(
    payload.biz_id ||
      payload.BizId ||
      payload.call_id ||
      payload.CallId ||
      payload.status_code ||
      payload.phone_number ||
      payload.success !== undefined ||
      payload.SendStatus !== undefined
  );
}

function collectReceiptRecords(payload: unknown): Record<string, unknown>[] {
  const parsed = typeof payload === "string" ? parseJsonString(payload) : payload;
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => collectReceiptRecords(item));
  }

  if (!isRecord(parsed)) {
    return [];
  }

  for (const key of ["receipts", "reports", "messages", "data", "Data"]) {
    const value = parsed[key];
    if (Array.isArray(value)) {
      return value.flatMap((item) => collectReceiptRecords(item));
    }
  }

  const unwrapped = unwrapMessageBody(parsed);
  if (unwrapped) {
    return collectReceiptRecords(unwrapped);
  }

  return looksLikeReceiptRecord(parsed) ? [parsed] : [];
}

function smsStatus(record: Record<string, unknown>): PushedNotificationReceipt["providerStatus"] {
  const sendStatus = numberValue(record.SendStatus ?? record.send_status);
  if (sendStatus === 1) return "pending";
  if (sendStatus === 2) return "failed";
  if (sendStatus === 3) return "delivered";

  const success = booleanValue(record.success ?? record.Success);
  if (success === true) return "delivered";
  if (success === false) return "failed";

  return "unknown";
}

function voiceStatus(record: Record<string, unknown>): PushedNotificationReceipt["providerStatus"] {
  const duration = numberValue(record.duration ?? record.Duration ?? record.b_duration);
  const statusCode = stringValue(record.status_code ?? record.StatusCode);
  const smartStatus = stringValue(record.smart_status_code ?? record.SmartStatusCode);
  const state = stringValue(record.state ?? record.State);

  if ((duration ?? 0) > 0 || statusCode === "200000" || smartStatus === "ANSWERED" || state === "200") {
    return "delivered";
  }

  if (statusCode || smartStatus || state) {
    return "failed";
  }

  return "unknown";
}

function normalizeSmsReceipt(
  record: Record<string, unknown>,
  checkedAt: string
): PushedNotificationReceipt {
  const providerStatus = smsStatus(record);
  const code = stringValue(record.err_code ?? record.ErrCode);
  const message = stringValue(record.err_msg ?? record.ErrMsg);

  return {
    provider: "aliyun_sms",
    channel: "sms",
    providerReceiptId: stringValue(record.biz_id ?? record.BizId),
    providerRequestId: stringValue(record.request_id ?? record.RequestId),
    providerStatus,
    providerMessage: [
      `Aliyun SMS 推送回执：${providerStatus}`,
      code ? `(${code})` : "",
      message ?? "",
    ].filter(Boolean).join(" "),
    checkedAt,
    rawResult: record,
    recipientPhone: stringValue(record.phone_number ?? record.PhoneNumber),
  };
}

function normalizeVoiceReceipt(
  record: Record<string, unknown>,
  checkedAt: string
): PushedNotificationReceipt {
  const providerStatus = voiceStatus(record);
  const code = stringValue(record.status_code ?? record.StatusCode ?? record.state ?? record.State);
  const message = stringValue(record.status_msg ?? record.StatusMsg ?? record.stateDesc);

  return {
    provider: "aliyun_voice",
    channel: "voice",
    providerReceiptId: stringValue(record.call_id ?? record.CallId),
    providerRequestId: stringValue(record.request_id ?? record.RequestId),
    providerStatus,
    providerMessage: [
      `Aliyun Voice 推送回执：${providerStatus}`,
      code ? `(${code})` : "",
      message ?? "",
    ].filter(Boolean).join(" "),
    checkedAt,
    rawResult: record,
    recipientPhone: stringValue(record.callee ?? record.Callee),
  };
}

export function normalizeAliyunPushedNotificationReceipts(
  payload: unknown,
  now = new Date()
): PushedNotificationReceipt[] {
  const checkedAt = now.toISOString();
  return collectReceiptRecords(payload).map((record) => {
    const isVoiceReceipt = Boolean(
      record.call_id ||
        record.CallId ||
        record.status_code ||
        record.StatusCode ||
        record.smart_status_code ||
        record.SmartStatusCode
    );

    return isVoiceReceipt
      ? normalizeVoiceReceipt(record, checkedAt)
      : normalizeSmsReceipt(record, checkedAt);
  });
}

function normalizeSignature(signature: string) {
  return signature.trim().replace(/^sha256=/i, "").toLowerCase();
}

export function signNotificationReceiptBody(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyNotificationReceiptSignature(params: {
  rawBody: string;
  secret?: string;
  signature?: string | null;
  token?: string | null;
}) {
  if (!params.secret) {
    return true;
  }

  if (params.token && params.token === params.secret) {
    return true;
  }

  if (!params.signature) {
    return false;
  }

  const expected = signNotificationReceiptBody(params.rawBody, params.secret);
  const actual = normalizeSignature(params.signature);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  return expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function notificationReceiptUpdatePayload(params: {
  currentStatus: "queued" | "sent" | "confirmed" | "escalated" | "failed";
  receipt: PushedNotificationReceipt;
}) {
  return {
    status: params.receipt.providerStatus === "failed" ? "failed" : params.currentStatus,
    ...(params.receipt.providerRequestId
      ? { provider_request_id: params.receipt.providerRequestId }
      : {}),
    provider_status: params.receipt.providerStatus,
    receipt_checked_at: params.receipt.checkedAt,
    provider_message: params.receipt.providerMessage,
    raw_provider_receipt: params.receipt.rawResult,
  };
}
