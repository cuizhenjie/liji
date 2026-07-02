import { describe, expect, it } from "vitest";

import { registerBrowserPushSubscription } from "../../src/lib/liji/push";

describe("push registration", () => {
  it("returns an explicit state when VAPID public key is missing", async () => {
    const result = await registerBrowserPushSubscription({ vapidPublicKey: "" });

    expect(result.status).toBe("unconfigured");
  });
});
