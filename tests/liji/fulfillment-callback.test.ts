import { describe, expect, it } from "vitest";

import {
  signFulfillmentCallback,
  verifyFulfillmentCallbackSignature,
} from "../../src/lib/liji/fulfillment-callback";

describe("fulfillment callback signatures", () => {
  it("verifies HMAC signatures when a callback secret is configured", () => {
    const rawBody = JSON.stringify({
      provider: "jd",
      externalOrderId: "order-1",
      status: "paid",
    });
    const signature = signFulfillmentCallback(rawBody, "secret");

    expect(
      verifyFulfillmentCallbackSignature({ rawBody, secret: "secret", signature })
    ).toBe(true);
    expect(
      verifyFulfillmentCallbackSignature({ rawBody, secret: "secret", signature: "bad" })
    ).toBe(false);
  });

  it("allows unsigned callbacks only when no secret is configured", () => {
    expect(
      verifyFulfillmentCallbackSignature({ rawBody: "{}", signature: null })
    ).toBe(true);
  });
});
