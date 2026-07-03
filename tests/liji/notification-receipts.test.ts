import { describe, expect, it } from "vitest";

import {
  normalizeAliyunPushedNotificationReceipts,
  notificationReceiptUpdatePayload,
  signNotificationReceiptBody,
  verifyNotificationReceiptSignature,
} from "../../src/lib/liji/notification-receipts";

describe("notification receipt push normalization", () => {
  it("normalizes Aliyun SMS HTTP batch receipts", () => {
    const receipts = normalizeAliyunPushedNotificationReceipts([
      {
        phone_number: "13811110000",
        success: true,
        err_code: "DELIVERED",
        err_msg: "The user received the message successfully.",
        biz_id: "biz-1",
        out_id: "out-1",
      },
    ], new Date("2026-07-03T10:00:00Z"));

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      provider: "aliyun_sms",
      channel: "sms",
      providerReceiptId: "biz-1",
      providerStatus: "delivered",
      recipientPhone: "13811110000",
      checkedAt: "2026-07-03T10:00:00.000Z",
    });
  });

  it("normalizes Aliyun VoiceReport receipts", () => {
    const receipts = normalizeAliyunPushedNotificationReceipts([
      {
        status_code: "200000",
        smart_status_code: "ANSWERED",
        duration: "10",
        call_id: "call-1",
        callee: "13900000000",
        status_msg: "用户听完语音",
      },
    ], new Date("2026-07-03T10:00:00Z"));

    expect(receipts[0]).toMatchObject({
      provider: "aliyun_voice",
      channel: "voice",
      providerReceiptId: "call-1",
      providerStatus: "delivered",
      recipientPhone: "13900000000",
    });
  });

  it("unwraps MNS-style message bodies", () => {
    const receipts = normalizeAliyunPushedNotificationReceipts({
      MessageBody: JSON.stringify({
        success: false,
        err_code: "UNDELIVERED",
        err_msg: "carrier failed",
        biz_id: "biz-2",
      }),
    });

    expect(receipts[0]).toMatchObject({
      provider: "aliyun_sms",
      providerReceiptId: "biz-2",
      providerStatus: "failed",
    });
  });

  it("verifies HMAC signatures and optional URL tokens", () => {
    const rawBody = JSON.stringify([{ biz_id: "biz-1", success: true }]);
    const signature = signNotificationReceiptBody(rawBody, "secret");

    expect(verifyNotificationReceiptSignature({ rawBody, secret: "secret", signature })).toBe(true);
    expect(verifyNotificationReceiptSignature({ rawBody, secret: "secret", signature: "bad" })).toBe(false);
    expect(verifyNotificationReceiptSignature({ rawBody, secret: "secret", token: "secret" })).toBe(true);
    expect(verifyNotificationReceiptSignature({ rawBody })).toBe(true);
  });

  it("builds idempotent notification log update payloads", () => {
    const [receipt] = normalizeAliyunPushedNotificationReceipts([
      { biz_id: "biz-1", success: false, err_code: "FAILED" },
    ], new Date("2026-07-03T10:00:00Z"));

    expect(notificationReceiptUpdatePayload({
      currentStatus: "sent",
      receipt,
    })).toMatchObject({
      status: "failed",
      provider_status: "failed",
      receipt_checked_at: "2026-07-03T10:00:00.000Z",
    });
    expect(notificationReceiptUpdatePayload({
      currentStatus: "sent",
      receipt,
    })).not.toHaveProperty("provider_request_id");
  });
});
