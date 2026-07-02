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
  requestId?: string;
  providerMessage: string;
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

function missingResult(channel: "sms" | "voice", message: string): AliyunDeliveryResult {
  return {
    channel,
    status: "unconfigured",
    providerMessage: message,
  };
}

async function parseAliyunResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as {
    Code?: string;
    Message?: string;
    RequestId?: string;
  };

  return {
    ok: response.ok && (!payload.Code || payload.Code === "OK"),
    code: payload.Code,
    message: payload.Message ?? response.statusText,
    requestId: payload.RequestId,
  };
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
        requestId: parsed.requestId,
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
        requestId: parsed.requestId,
        providerMessage: parsed.ok
          ? "Aliyun Voice 已提交。"
          : `Aliyun Voice 失败：${parsed.code ?? ""} ${parsed.message}`,
      });
    }
  }

  return results;
}
