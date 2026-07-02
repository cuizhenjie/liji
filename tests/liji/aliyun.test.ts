import { describe, expect, it } from "vitest";

import {
  buildAliyunSmsRequest,
  buildAliyunVoiceRequest,
  sendAliyunNotifications,
} from "../../src/lib/liji/aliyun";
import type { NotificationLog } from "../../src/lib/liji/types";

const smsLog: NotificationLog = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "客户宴请",
  channel: "sms",
  status: "queued",
  level: "level_1",
  sentAt: "2026-07-02T00:00:00Z",
  providerMessage: "",
};

const voiceLog: NotificationLog = {
  ...smsLog,
  id: "22222222-2222-4222-8222-222222222222",
  channel: "voice",
};

describe("Aliyun notification adapter", () => {
  it("builds signed SMS and voice requests", () => {
    const sms = buildAliyunSmsRequest({
      accessKeyId: "testid",
      accessKeySecret: "testsecret",
      phoneNumber: "13900000000",
      signName: "礼记",
      templateCode: "SMS_123",
      templateParam: { title: "客户宴请" },
      now: new Date("2026-07-02T00:00:00Z"),
      nonce: "nonce",
    });
    const voice = buildAliyunVoiceRequest({
      accessKeyId: "testid",
      accessKeySecret: "testsecret",
      phoneNumber: "13900000000",
      calledShowNumber: "057112345678",
      ttsCode: "TTS_123",
      ttsParam: { title: "客户宴请" },
      now: new Date("2026-07-02T00:00:00Z"),
      nonce: "nonce",
      outId: "out-id",
    });

    expect(sms.url).toContain("https://dysmsapi.aliyuncs.com/");
    expect(sms.init.headers.Authorization).toContain("ACS3-HMAC-SHA256");
    expect(voice.url).toContain("https://dyvmsapi.aliyuncs.com/");
    expect(voice.stringToSign).toContain("SingleCallByTts");
  });

  it("keeps external delivery disabled unless explicitly enabled", async () => {
    const result = await sendAliyunNotifications({
      logs: [smsLog, voiceLog],
      title: "客户宴请",
      config: {
        externalEnabled: false,
        accessKeyId: "testid",
        accessKeySecret: "testsecret",
        defaultPhone: "13900000000",
      },
    });

    expect(result.map((item) => item.status)).toEqual(["disabled", "disabled"]);
  });

  it("sends SMS and voice through injected fetcher when configured", async () => {
    const requests: string[] = [];
    const result = await sendAliyunNotifications({
      logs: [smsLog, voiceLog],
      title: "客户宴请",
      config: {
        externalEnabled: true,
        accessKeyId: "testid",
        accessKeySecret: "testsecret",
        defaultPhone: "13900000000",
        smsSignName: "礼记",
        smsTemplateCode: "SMS_123",
        voiceCalledShowNumber: "057112345678",
        voiceTtsCode: "TTS_123",
      },
      fetcher: (async (url: RequestInfo | URL) => {
        requests.push(String(url));
        return Response.json({ Code: "OK", RequestId: `req-${requests.length}` });
      }) as typeof fetch,
    });

    expect(requests).toHaveLength(2);
    expect(result.map((item) => item.status)).toEqual(["sent", "sent"]);
  });
});
