import crypto from "node:crypto";

export type FulfillmentCallbackStatus =
  | "clicked"
  | "reserved"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded"
  | "failed";

export type FulfillmentSettlementStatus =
  | "pending"
  | "eligible"
  | "settled"
  | "reversed"
  | "disputed"
  | "not_applicable";

export type FulfillmentCallbackPayload = {
  provider: "jd" | "taobao" | "meituan" | "ctrip" | "tongcheng";
  externalOrderId: string;
  status: FulfillmentCallbackStatus;
  planId?: string;
  planItemId?: string;
  amountCny?: number;
  commissionCny?: number;
  refundedAmountCny?: number;
  settlementStatus?: FulfillmentSettlementStatus;
  settlementPeriod?: string;
  occurredAt?: string;
};

export function signFulfillmentCallback(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyFulfillmentCallbackSignature(params: {
  rawBody: string;
  secret?: string;
  signature?: string | null;
}) {
  if (!params.secret) {
    return true;
  }

  if (!params.signature) {
    return false;
  }

  const expected = signFulfillmentCallback(params.rawBody, params.secret);
  const actualBuffer = Buffer.from(params.signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
