import { describe, expect, it } from "vitest";

import {
  classifyNotificationFailure,
  createNotificationGovernanceDecision,
  getNotificationFailureCodebook,
  lookupNotificationFailureCode,
  parseNotificationStopKeywords,
} from "../../src/lib/liji/notification-governance";

describe("notification governance", () => {
  it("stops user opt-out and permanent recipient failures", () => {
    const stopKeywords = parseNotificationStopKeywords("别打了");
    const optOut = createNotificationGovernanceDecision({
      log: {
        channel: "sms",
        providerStatus: "failed",
        providerMessage: "用户回复：别打了",
      },
      stopKeywords,
    });
    const invalidPhone = createNotificationGovernanceDecision({
      log: {
        channel: "voice",
        providerStatus: "failed",
        providerMessage: "Aliyun Voice 失败：MOBILE_NUMBER_ILLEGAL 手机号非法",
      },
    });

    expect(optOut).toMatchObject({
      failureClass: "user_opt_out",
      retryAllowed: false,
      stopReason: "user_opt_out",
      alertSeverity: "warning",
    });
    expect(invalidPhone).toMatchObject({
      failureClass: "permanent_recipient",
      retryAllowed: false,
      stopReason: "permanent_recipient_error",
    });
  });

  it("circuit-breaks template and provider configuration failures", () => {
    const decision = createNotificationGovernanceDecision({
      log: {
        channel: "sms",
        providerStatus: "failed",
        providerMessage: "Aliyun SMS 失败：isv.SMS_TEMPLATE_ILLEGAL 模板不合法",
      },
    });

    expect(decision).toMatchObject({
      failureClass: "template_or_provider",
      retryAllowed: false,
      stopReason: "template_or_provider_error",
      alertSeverity: "critical",
    });
  });

  it("keeps transient and rate-limited failures retryable with different backoff", () => {
    const rateLimited = createNotificationGovernanceDecision({
      log: {
        channel: "sms",
        providerStatus: "failed",
        providerMessage: "Aliyun SMS 失败：isv.BUSINESS_LIMIT_CONTROL 触发天级流控",
      },
    });
    const transient = createNotificationGovernanceDecision({
      log: {
        channel: "voice",
        providerStatus: "failed",
        providerMessage: "network timeout",
      },
    });

    expect(rateLimited).toMatchObject({
      failureClass: "rate_limited",
      retryAllowed: true,
      retryDelayMultiplier: 3,
    });
    expect(transient).toMatchObject({
      failureClass: "retryable",
      retryAllowed: true,
      retryDelayMultiplier: 1,
    });
  });

  it("classifies unknown non-failed records without forcing a stop", () => {
    expect(classifyNotificationFailure({
      providerStatus: "submitted",
      providerMessage: "Aliyun SMS 已提交。",
    })).toBe("unknown");
  });

  it("exposes an operator codebook for notification SOPs", () => {
    const codebook = getNotificationFailureCodebook();
    const entry = lookupNotificationFailureCode("Aliyun SMS 失败：isv.SMS_TEMPLATE_ILLEGAL");

    expect(codebook.length).toBeGreaterThanOrEqual(5);
    expect(entry).toMatchObject({
      failureClass: "template_or_provider",
      retryPolicy: "circuit_break",
    });
    expect(entry?.sop.length).toBeGreaterThan(0);
  });
});
