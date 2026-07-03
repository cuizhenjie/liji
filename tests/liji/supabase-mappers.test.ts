import { describe, expect, it } from "vitest";

import {
  mapBudget,
  mapCapture,
  mapContact,
  mapEvent,
  mapNotificationLog,
  mapPlan,
  mapPrivacy,
} from "../../src/lib/liji/supabase-mappers";

describe("Supabase mappers", () => {
  it("maps relational rows into workspace domain models", () => {
    const contact = mapContact({
      id: "c-1",
      name: "周明",
      relation: "重要客户",
      labels: ["国企高管"],
      calendar_type: "solar",
      preferences: [{ category: "food", label: "不吃香菜", source: "ai", confidence: 0.8 }],
      compliance: { riskTags: ["国企高管"], policyNote: "限额" },
      ai_memory_health: 90,
    });
    const event = mapEvent({
      id: "e-1",
      title: "客户宴请",
      event_date: "2026-07-03",
      reminder_level: "level_1",
      status: "scheduled",
      source: "manual",
      budget_cny: "500",
    });
    const budget = mapBudget({
      id: "b-1",
      label: "人情关怀",
      category: "relationship",
      total_cny: "6000",
      spent_cny: "2468",
      period: "2026-07",
    });

    expect(contact.labels).toEqual(["国企高管"]);
    expect(event.budgetCny).toBe(500);
    expect(budget.category).toBe("relationship");
  });

  it("maps nested plans and parsed capture JSON", () => {
    const plan = mapPlan({
      id: "p-1",
      scenario: "festival",
      title: "生日方案",
      budget_cny: 2000,
      status: "pending_confirmation",
      risk_level: "low",
      warnings: [],
      created_at: "2026-07-01T00:00:00Z",
      plan_items: [
        {
          id: "pi-1",
          title: "礼物",
          category: "gift",
          amount_cny: 1200,
          rationale: "匹配偏好",
          provider: "京东",
          url: "https://example.com",
        },
      ],
    });
    const capture = mapCapture({
      id: "cap-1",
      raw_text: "今天吃饭花了125元",
      masked_text: "今天吃饭花了125元",
      source_type: "voice",
      status: "pending",
      parsed: {
        intent: "transaction",
        title: "餐饮消费",
        amountCny: 125,
        reminderLevel: "level_3",
        confidence: 0.8,
      },
      pii_tokens: [],
      created_at: "2026-07-01T00:00:00Z",
    });

    expect(plan.items[0].provider).toBe("京东");
    expect(capture.parsed.intent).toBe("transaction");
    expect(capture.sourceType).toBe("voice");
  });

  it("uses locked-down defaults when cloud privacy settings are missing", () => {
    const privacy = mapPrivacy(null);

    expect(privacy.piiMasking).toBe(true);
    expect(privacy.cloudModelEnabled).toBe(false);
    expect(privacy.smsEnabled).toBe(false);
    expect(privacy.voiceCallEnabled).toBe(false);
    expect(privacy.notificationPhone).toBeUndefined();
  });

  it("maps user notification phone routing from privacy settings", () => {
    const privacy = mapPrivacy({
      pii_masking: true,
      cloud_model_enabled: false,
      web_push_enabled: true,
      sms_enabled: true,
      voice_call_enabled: true,
      third_party_links_enabled: true,
      notification_phone: "13800000000",
    });

    expect(privacy.notificationPhone).toBe("13800000000");
  });

  it("maps notification provider receipt metadata", () => {
    const log = mapNotificationLog({
      id: "n-1",
      title: "客户宴请",
      channel: "sms",
      status: "sent",
      level: "level_1",
      sent_at: "2026-07-01T00:00:00Z",
      provider_message: "Aliyun SMS 回执：delivered",
      provider: "aliyun_sms",
      provider_request_id: "req-1",
      provider_receipt_id: "biz-1",
      provider_status: "delivered",
      receipt_checked_at: "2026-07-01T00:05:00Z",
      raw_provider_receipt: { SendStatus: 3 },
    });

    expect(log.provider).toBe("aliyun_sms");
    expect(log.providerReceiptId).toBe("biz-1");
    expect(log.providerStatus).toBe("delivered");
    expect(log.rawProviderReceipt).toEqual({ SendStatus: 3 });
  });
});
