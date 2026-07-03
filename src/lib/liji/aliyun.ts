import crypto from "node:crypto";

import { env } from "./env";
import type { NotificationLog } from "./types";

type Fetcher = typeof fetch;

export type AliyunNotificationConfig = {
  accessKeyId?: string;
  accessKeySecret?: string;
  regionId?: string;
  smsSignName?: string;
  smsTemplateCode?: string;
  voiceCalledShowNumber?: string;
  voiceTtsCode?: string;
  defaultPhone?: string;
  externalEnabled?: boolean;
};

export type AliyunDeliveryResult = {
  channel: "sms" | "voice";
  status: "disabled" | "unconfigured" | "sent" | "failed";
  provider: "aliyun_sms" | "aliyun_voice";
  requestId?: string;
  receiptId?: string;
  providerStatus: "submitted" | "failed" | "unknown";
  providerMessage: string;
};

export type AliyunReceiptResult = {
  logId: string;
  channel: "sms" | "voice";
  status: "checked" | "skipped" | "failed";
  providerStatus: "pending" | "delivered" | "failed" | "unknown";
  requestId?: string;
  providerMessage: string;
  checkedAt: string;
  rawResult: Record<string, unknown>;
};

function resolveConfig(config: AliyunNotificationConfig = {}) {
  return {
    accessKeyId: config.accessKeyId ?? env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: config.accessKeySecret ?? env.ALIYUN_ACCESS_KEY_SECRET,
    regionId: config.regionId ?? env.ALIYUN_REGION_ID ?? "cn-hangzhou",
    smsSignName: config.smsSignName ?? env.ALIYUN_SMS_SIGN_NAME,
    smsTemplateCode: config.smsTemplateCode ?? env.ALIYUN_SMS_TEMPLATE_CODE,
    voiceCalledShowNumber:
      config.voiceCalledShowNumber ?? env.ALIYUN_VOICE_CALLED_SHOW_NUMBER,
    voiceTtsCode: config.voiceTtsCode ?? env.ALIYUN_VOICE_TTS_CODE,
    defaultPhone: config.defaultPhone ?? env.LIJI_DEFAULT_NOTIFY_PHONE,
    externalEnabled:
      config.externalEnabled ??
      env.LIJI_ENABLE_EXTERNAL_NOTIFICATIONS?.toLowerCase() === "true",
  };
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

function normalizeQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
}

function isoTimestamp(now = new Date()) {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildAliyunSmsRequest(params: {
  accessKeyId: string;
  accessKeySecret: string;
  phoneNumber: string;
  signName: string;
  templateCode: string;
  templateParam: Record<string, string>;
  outId?: string;
  now?: Date;
  nonce?: string;
}) {
  const endpoint = "https://dysmsapi.aliyuncs.com/";
  const query = normalizeQuery({
    PhoneNumbers: params.phoneNumber,
    SignName: params.signName,
    TemplateCode: params.templateCode,
    TemplateParam: JSON.stringify(params.templateParam),
    ...(params.outId ? { OutId: params.outId } : {}),
  });
  const nonce = params.nonce ?? crypto.randomUUID();
  const date = isoTimestamp(params.now);
  const payloadHash = crypto.createHash("sha256").update("").digest("hex");
  const signedHeaders =
    "host;x-acs-action;x-acs-content-sha256;x-acs-date;x-acs-signature-nonce;x-acs-version";
  const canonicalHeaders = [
    "host:dysmsapi.aliyuncs.com",
    "x-acs-action:SendSms",
    `x-acs-content-sha256:${payloadHash}`,
    `x-acs-date:${date}`,
    `x-acs-signature-nonce:${nonce}`,
    "x-acs-version:2017-05-25",
  ].join("\n");
  const canonicalRequest = [
    "POST",
    "/",
    query,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");
  const stringToSign = ["ACS3-HMAC-SHA256", hashedCanonicalRequest].join("\n");
  const signature = crypto
    .createHmac("sha256", params.accessKeySecret)
    .update(stringToSign)
    .digest("hex");
  const authorization = `ACS3-HMAC-SHA256 Credential=${params.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;

  return {
    url: `${endpoint}?${query}`,
    init: {
      method: "POST",
      headers: {
        Authorization: authorization,
        "x-acs-action": "SendSms",
        "x-acs-version": "2017-05-25",
        "x-acs-date": date,
        "x-acs-signature-nonce": nonce,
        "x-acs-content-sha256": payloadHash,
      },
    },
    canonicalRequest,
  };
}

export function buildAliyunSmsReceiptRequest(params: {
  accessKeyId: string;
  accessKeySecret: string;
  phoneNumber: string;
  sendDate: string;
  bizId?: string;
  now?: Date;
  nonce?: string;
}) {
  const endpoint = "https://dysmsapi.aliyuncs.com/";
  const query = normalizeQuery({
    PhoneNumber: params.phoneNumber,
    SendDate: params.sendDate,
    PageSize: "10",
    CurrentPage: "1",
    ...(params.bizId ? { BizId: params.bizId } : {}),
  });
  const nonce = params.nonce ?? crypto.randomUUID();
  const date = isoTimestamp(params.now);
  const payloadHash = crypto.createHash("sha256").update("").digest("hex");
  const action = "QuerySendDetails";
  const signedHeaders =
    "host;x-acs-action;x-acs-content-sha256;x-acs-date;x-acs-signature-nonce;x-acs-version";
  const canonicalHeaders = [
    "host:dysmsapi.aliyuncs.com",
    `x-acs-action:${action}`,
    `x-acs-content-sha256:${payloadHash}`,
    `x-acs-date:${date}`,
    `x-acs-signature-nonce:${nonce}`,
    "x-acs-version:2017-05-25",
  ].join("\n");
  const canonicalRequest = [
    "POST",
    "/",
    query,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");
  const stringToSign = ["ACS3-HMAC-SHA256", hashedCanonicalRequest].join("\n");
  const signature = crypto
    .createHmac("sha256", params.accessKeySecret)
    .update(stringToSign)
    .digest("hex");
  const authorization = `ACS3-HMAC-SHA256 Credential=${params.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;

  return {
    url: `${endpoint}?${query}`,
    init: {
      method: "POST",
      headers: {
        Authorization: authorization,
        "x-acs-action": action,
        "x-acs-version": "2017-05-25",
        "x-acs-date": date,
        "x-acs-signature-nonce": nonce,
        "x-acs-content-sha256": payloadHash,
      },
    },
    canonicalRequest,
  };
}

export function buildAliyunVoiceRequest(params: {
  accessKeyId: string;
  accessKeySecret: string;
  phoneNumber: string;
  calledShowNumber: string;
  ttsCode: string;
  ttsParam: Record<string, string>;
  regionId?: string;
  outId?: string;
  now?: Date;
  nonce?: string;
}) {
  const unsignedParams = {
    AccessKeyId: params.accessKeyId,
    Action: "SingleCallByTts",
    CalledNumber: params.phoneNumber,
    CalledShowNumber: params.calledShowNumber,
    Format: "JSON",
    OutId: params.outId ?? crypto.randomUUID(),
    RegionId: params.regionId ?? "cn-hangzhou",
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: params.nonce ?? crypto.randomUUID(),
    SignatureVersion: "1.0",
    Timestamp: isoTimestamp(params.now),
    TtsCode: params.ttsCode,
    TtsParam: JSON.stringify(params.ttsParam),
    Version: "2017-05-25",
  };
  const canonicalizedQueryString = normalizeQuery(unsignedParams);
  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalizedQueryString)}`;
  const signature = crypto
    .createHmac("sha1", `${params.accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");
  const query = `${canonicalizedQueryString}&Signature=${percentEncode(signature)}`;

  return {
    url: `https://dyvmsapi.aliyuncs.com/?${query}`,
    init: { method: "GET" },
    stringToSign,
  };
}

export function buildAliyunVoiceReceiptRequest(params: {
  accessKeyId: string;
  accessKeySecret: string;
  callId: string;
  queryDate: Date;
  regionId?: string;
  prodId?: string;
  now?: Date;
  nonce?: string;
}) {
  const unsignedParams = {
    AccessKeyId: params.accessKeyId,
    Action: "QueryCallDetailByCallId",
    CallId: params.callId,
    Format: "JSON",
    ProdId: params.prodId ?? "11000000300006",
    QueryDate: String(params.queryDate.getTime()),
    RegionId: params.regionId ?? "cn-hangzhou",
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: params.nonce ?? crypto.randomUUID(),
    SignatureVersion: "1.0",
    Timestamp: isoTimestamp(params.now),
    Version: "2017-05-25",
  };
  const canonicalizedQueryString = normalizeQuery(unsignedParams);
  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalizedQueryString)}`;
  const signature = crypto
    .createHmac("sha1", `${params.accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");
  const query = `${canonicalizedQueryString}&Signature=${percentEncode(signature)}`;

  return {
    url: `https://dyvmsapi.aliyuncs.com/?${query}`,
    init: { method: "GET" },
    stringToSign,
  };
}

function missingResult(channel: "sms" | "voice", message: string): AliyunDeliveryResult {
  return {
    channel,
    status: "unconfigured",
    provider: channel === "sms" ? "aliyun_sms" : "aliyun_voice",
    providerStatus: "unknown",
    providerMessage: message,
  };
}

async function parseAliyunResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as {
    Code?: string;
    Message?: string;
    RequestId?: string;
    BizId?: string;
    CallId?: string;
    Data?: unknown;
    SmsSendDetailDTOs?: {
      SmsSendDetailDTO?: unknown;
    };
  };

  return {
    ok: response.ok && (!payload.Code || payload.Code === "OK"),
    code: payload.Code,
    message: payload.Message ?? response.statusText,
    requestId: payload.RequestId,
    bizId: payload.BizId,
    callId: payload.CallId,
    payload: payload as Record<string, unknown>,
  };
}

function formatAliyunSmsSendDate(value: string, timeZone = "Asia/Shanghai") {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}${byType.get("month")}${byType.get("day")}`;
}

function smsDetailFromPayload(payload: Record<string, unknown>) {
  const detailContainer = payload.SmsSendDetailDTOs;
  if (!detailContainer || typeof detailContainer !== "object") {
    return undefined;
  }

  const detail = (detailContainer as { SmsSendDetailDTO?: unknown }).SmsSendDetailDTO;
  if (Array.isArray(detail)) {
    return detail.find((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
    );
  }

  return typeof detail === "object" && detail !== null
    ? detail as Record<string, unknown>
    : undefined;
}

function smsReceiptStatus(detail: Record<string, unknown> | undefined): AliyunReceiptResult["providerStatus"] {
  const status = Number(detail?.SendStatus);
  if (status === 1) return "pending";
  if (status === 2) return "failed";
  if (status === 3) return "delivered";
  return "unknown";
}

function voiceDataFromPayload(payload: Record<string, unknown>) {
  const data = payload.Data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? parsed as Record<string, unknown>
        : undefined;
    } catch {
      return undefined;
    }
  }

  return typeof data === "object" && data !== null
    ? data as Record<string, unknown>
    : undefined;
}

function voiceReceiptStatus(data: Record<string, unknown> | undefined): AliyunReceiptResult["providerStatus"] {
  if (!data) return "unknown";
  const duration = Number(data.duration ?? 0);
  const state = String(data.state ?? data.stateDesc ?? "");
  if (duration > 0 || state === "200") return "delivered";
  if (state) return "failed";
  return "unknown";
}

export async function sendAliyunNotifications(params: {
  logs: NotificationLog[];
  title: string;
  recipientPhone?: string;
  templateParams?: Record<string, string>;
  config?: AliyunNotificationConfig;
  fetcher?: Fetcher;
}): Promise<AliyunDeliveryResult[]> {
  const config = resolveConfig(params.config);
  const phoneNumber = params.recipientPhone ?? config.defaultPhone;
  const fetcher = params.fetcher ?? fetch;
  const templateParams = params.templateParams ?? { title: params.title };
  const externalChannels = params.logs
    .map((log) => log.channel)
    .filter((channel): channel is "sms" | "voice" => channel === "sms" || channel === "voice");

  if (externalChannels.length === 0) {
    return [];
  }

  if (!config.externalEnabled) {
    return externalChannels.map((channel) => ({
      channel,
      status: "disabled",
      provider: channel === "sms" ? "aliyun_sms" as const : "aliyun_voice" as const,
      providerStatus: "failed" as const,
      providerMessage: "外部通知发送开关未开启。",
    }));
  }

  if (!config.accessKeyId || !config.accessKeySecret || !phoneNumber) {
    return externalChannels.map((channel) =>
      missingResult(channel, "阿里云访问密钥或接收手机号未配置。")
    );
  }

  const results: AliyunDeliveryResult[] = [];

  if (externalChannels.includes("sms")) {
    if (!config.smsSignName || !config.smsTemplateCode) {
      results.push(missingResult("sms", "短信签名或模板 Code 未配置。"));
    } else {
      const request = buildAliyunSmsRequest({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        phoneNumber,
        signName: config.smsSignName,
        templateCode: config.smsTemplateCode,
        templateParam: templateParams,
      });
      const parsed = await parseAliyunResponse(await fetcher(request.url, request.init));
      results.push({
        channel: "sms",
        status: parsed.ok ? "sent" : "failed",
        provider: "aliyun_sms",
        requestId: parsed.requestId,
        receiptId: parsed.bizId,
        providerStatus: parsed.ok ? "submitted" : "failed",
        providerMessage: parsed.ok
          ? "Aliyun SMS 已提交。"
          : `Aliyun SMS 失败：${parsed.code ?? ""} ${parsed.message}`,
      });
    }
  }

  if (externalChannels.includes("voice")) {
    if (!config.voiceCalledShowNumber || !config.voiceTtsCode) {
      results.push(missingResult("voice", "语音主叫号码或 TTS 模板未配置。"));
    } else {
      const request = buildAliyunVoiceRequest({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        phoneNumber,
        calledShowNumber: config.voiceCalledShowNumber,
        ttsCode: config.voiceTtsCode,
        ttsParam: templateParams,
        regionId: config.regionId,
      });
      const parsed = await parseAliyunResponse(await fetcher(request.url, request.init));
      results.push({
        channel: "voice",
        status: parsed.ok ? "sent" : "failed",
        provider: "aliyun_voice",
        requestId: parsed.requestId,
        receiptId: parsed.callId,
        providerStatus: parsed.ok ? "submitted" : "failed",
        providerMessage: parsed.ok
          ? "Aliyun Voice 已提交。"
          : `Aliyun Voice 失败：${parsed.code ?? ""} ${parsed.message}`,
      });
    }
  }

  return results;
}

export async function queryAliyunNotificationReceipts(params: {
  logs: NotificationLog[];
  recipientPhone?: string;
  config?: AliyunNotificationConfig;
  fetcher?: Fetcher;
  now?: Date;
}): Promise<AliyunReceiptResult[]> {
  const config = resolveConfig(params.config);
  const phoneNumber = params.recipientPhone ?? config.defaultPhone;
  const fetcher = params.fetcher ?? fetch;
  const checkedAt = (params.now ?? new Date()).toISOString();
  const results: AliyunReceiptResult[] = [];

  for (const log of params.logs) {
    if (log.channel !== "sms" && log.channel !== "voice") {
      continue;
    }

    const provider = log.channel === "sms" ? "aliyun_sms" : "aliyun_voice";
    if (log.provider && log.provider !== provider) {
      continue;
    }

    if (!config.accessKeyId || !config.accessKeySecret) {
      results.push({
        logId: log.id,
        channel: log.channel,
        status: "skipped",
        providerStatus: "unknown",
        providerMessage: "阿里云访问密钥未配置，无法查询回执。",
        checkedAt,
        rawResult: {},
      });
      continue;
    }

    if (!log.providerReceiptId) {
      results.push({
        logId: log.id,
        channel: log.channel,
        status: "skipped",
        providerStatus: "unknown",
        providerMessage: "缺少 BizId/CallId，无法查询 provider 回执。",
        checkedAt,
        rawResult: {},
      });
      continue;
    }

    if (log.channel === "sms") {
      if (!phoneNumber) {
        results.push({
          logId: log.id,
          channel: "sms",
          status: "skipped",
          providerStatus: "unknown",
          providerMessage: "缺少短信接收手机号，无法调用 QuerySendDetails。",
          checkedAt,
          rawResult: {},
        });
        continue;
      }

      const request = buildAliyunSmsReceiptRequest({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        phoneNumber,
        sendDate: formatAliyunSmsSendDate(log.sentAt),
        bizId: log.providerReceiptId,
      });
      const parsed = await parseAliyunResponse(await fetcher(request.url, request.init));
      const detail = smsDetailFromPayload(parsed.payload);
      const providerStatus = parsed.ok ? smsReceiptStatus(detail) : "failed";
      results.push({
        logId: log.id,
        channel: "sms",
        status: parsed.ok ? "checked" : "failed",
        providerStatus,
        requestId: parsed.requestId,
        providerMessage: parsed.ok
          ? `Aliyun SMS 回执：${providerStatus}`
          : `Aliyun SMS 回执查询失败：${parsed.code ?? ""} ${parsed.message}`,
        checkedAt,
        rawResult: detail ?? parsed.payload,
      });
      continue;
    }

    const request = buildAliyunVoiceReceiptRequest({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      callId: log.providerReceiptId,
      queryDate: new Date(log.sentAt),
      regionId: config.regionId,
    });
    const parsed = await parseAliyunResponse(await fetcher(request.url, request.init));
    const data = voiceDataFromPayload(parsed.payload);
    const providerStatus = parsed.ok ? voiceReceiptStatus(data) : "failed";
    results.push({
      logId: log.id,
      channel: "voice",
      status: parsed.ok ? "checked" : "failed",
      providerStatus,
      requestId: parsed.requestId,
      providerMessage: parsed.ok
        ? `Aliyun Voice 回执：${providerStatus}`
        : `Aliyun Voice 回执查询失败：${parsed.code ?? ""} ${parsed.message}`,
      checkedAt,
      rawResult: data ?? parsed.payload,
    });
  }

  return results;
}
