import { describe, expect, it } from "vitest";

import { sendWebPushNotifications } from "../../src/lib/liji/web-push-server";

describe("server web push adapter", () => {
  it("reports unconfigured state without VAPID private key", async () => {
    const result = await sendWebPushNotifications({
      subscriptions: [
        {
          endpoint: "https://push.example.test/subscription/1",
          p256dh: "p256dh",
          auth: "auth",
        },
      ],
      title: "礼记提醒",
      body: "请打开礼记确认。",
      vapid: {},
    });

    expect(result.status).toBe("unconfigured");
    expect(result.attempted).toBe(0);
  });
});
