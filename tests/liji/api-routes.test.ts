import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE as deleteContact, POST as saveContact } from "../../src/app/api/contacts/route";
import { GET as authCallback } from "../../src/app/auth/callback/route";
import { POST as batchAiMemories } from "../../src/app/api/ai-memories/batch/route";
import { POST as extractCapture } from "../../src/app/api/capture/extract/route";
import { POST as manualCompleteCapture } from "../../src/app/api/capture/manual-complete/route";
import { POST as captureProviderCallback } from "../../src/app/api/capture/provider-callback/route";
import { POST as processCaptureJobs } from "../../src/app/api/capture/process-jobs/route";
import { POST as runCaptureSla } from "../../src/app/api/capture/sla/run/route";
import { GET as getComplianceRules } from "../../src/app/api/compliance/rules/route";
import { POST as embedAiMemories } from "../../src/app/api/ai-memories/embed/route";
import { POST as maintainAiMemories } from "../../src/app/api/ai-memories/maintenance/route";
import { POST as reviewAiMemory } from "../../src/app/api/ai-memories/review/route";
import { POST as fulfillmentCallback } from "../../src/app/api/fulfillment/callback/route";
import { POST as clickFulfillment } from "../../src/app/api/fulfillment/click/route";
import { POST as reconcileFulfillment } from "../../src/app/api/fulfillment/reconcile/route";
import { POST as generatePlan } from "../../src/app/api/generate-plan/route";
import { GET as getHealth } from "../../src/app/api/health/route";
import { POST as searchAiMemories } from "../../src/app/api/ai-memories/search/route";
import { GET as getIntegrations } from "../../src/app/api/integrations/route";
import { GET as getMonthlyInsight } from "../../src/app/api/monthly-insight/route";
import { GET as getMonthlyReport } from "../../src/app/api/monthly-report/route";
import { POST as parseInput } from "../../src/app/api/parse-input/route";
import { POST as savePushSubscription } from "../../src/app/api/push-subscriptions/route";
import { POST as deletePrivacy } from "../../src/app/api/privacy/delete/route";
import { GET as exportPrivacy } from "../../src/app/api/privacy/export/route";
import { POST as savePrivacySettings } from "../../src/app/api/privacy/settings/route";
import { POST as sendNotification } from "../../src/app/api/send-notification/route";
import { POST as pushNotificationReceipts } from "../../src/app/api/notification-receipts/push/route";
import { POST as runNotificationReceipts } from "../../src/app/api/notification-receipts/run/route";
import { POST as runNotificationRetries } from "../../src/app/api/notification-retries/run/route";
import { POST as runReminderEscalations } from "../../src/app/api/reminder-escalations/run/route";
import { GET as getWorkspace } from "../../src/app/api/workspace/route";
import { POST as syncWorkspace } from "../../src/app/api/workspace/sync/route";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("productization API routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects auth callbacks back into the app", async () => {
    const response = await authCallback(
      new Request("http://localhost/auth/callback?code=test-code&next=/")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("rejects external auth callback redirect targets", async () => {
    const response = await authCallback(
      new Request("http://localhost/auth/callback?next=https://example.com/phish")
    );

    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("serves demo workspace and accepts demo contact/privacy writes without Supabase", async () => {
    const workspaceResponse = await getWorkspace();
    const workspace = await workspaceResponse.json();
    const contactResponse = await saveContact(
      jsonRequest("/api/contacts", {
        id: "11111111-1111-4111-8111-111111111111",
        name: "赵敏",
        relation: "合作伙伴",
        labels: ["重要客户"],
        calendarType: "solar",
        preferences: [],
        compliance: {
          riskTags: ["重要客户"],
          policyNote: "保留预算与发票记录。",
        },
        aiMemoryHealth: 80,
      })
    );
    const contact = await contactResponse.json();
    const deleteContactResponse = await deleteContact(
      new Request("http://localhost/api/contacts?id=11111111-1111-4111-8111-111111111111", {
        method: "DELETE",
      })
    );
    const deletedContact = await deleteContactResponse.json();
    const privacyResponse = await savePrivacySettings(
      jsonRequest("/api/privacy/settings", {
        piiMasking: true,
        cloudModelEnabled: false,
        webPushEnabled: true,
        smsEnabled: false,
        voiceCallEnabled: false,
        thirdPartyLinksEnabled: true,
        notificationPhone: "13800000000",
      })
    );
    const privacy = await privacyResponse.json();

    expect(workspace.source).toBe("demo");
    expect(workspace.workspace.contacts.length).toBeGreaterThan(0);
    expect(contact.source).toBe("demo");
    expect(contact.contact.name).toBe("赵敏");
    expect(deletedContact.deleted).toBe(true);
    expect(deletedContact.source).toBe("demo");
    expect(privacy.source).toBe("demo");
    expect(privacy.privacy.piiMasking).toBe(true);
    expect(privacy.privacy.notificationPhone).toBe("13800000000");
  });

  it("accepts workspace sync payloads in demo mode", async () => {
    const response = await syncWorkspace(
      jsonRequest("/api/workspace/sync", { workspace: demoWorkspace })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.sync.tables.contacts).toBe(demoWorkspace.contacts.length);
    expect(payload.sync.tables.plan_items).toBeGreaterThan(0);
  });

  it("uses demo fallback for parser, plan and monthly insight when unauthenticated", async () => {
    const extractResponse = await extractCapture(
      jsonRequest("/api/capture/extract", {
        text: "10:21 周明：下次宴请不吃香菜",
        source: "chat",
      })
    );
    const extracted = await extractResponse.json();
    const parseResponse = await parseInput(
      jsonRequest("/api/parse-input", {
        text: "下周五是女儿5岁生日，预算2000元",
        source: "text",
      })
    );
    const parsed = await parseResponse.json();
    const planResponse = await generatePlan(
      jsonRequest("/api/generate-plan", {
        scenario: "festival",
        budgetCny: 2000,
      })
    );
    const plan = await planResponse.json();
    const insightResponse = await getMonthlyInsight();
    const insight = await insightResponse.json();
    const customInsightResponse = await getMonthlyInsight(
      new Request("http://localhost/api/monthly-insight?period=2026-05")
    );
    const customInsight = await customInsightResponse.json();

    expect(extracted.extraction.extractedText).toContain("周明");
    expect(parsed.source).toBe("demo");
    expect(parsed.capture.parsed.intent).toBe("event");
    expect(parsed.capture.sourceType).toBe("text");
    expect(plan.source).toBe("demo");
    expect(plan.plan.items.length).toBeGreaterThan(0);
    expect(plan.fulfillmentLinks[0].trackingParams.cps_provider).toBeDefined();
    expect(plan.cpsSummary.totalTrackedAmountCny).toBeGreaterThan(0);
    expect(insight.source).toBe("demo");
    expect(insight.insight.healthScore).toBeGreaterThan(0);
    expect(customInsight.insight.period).toBe("2026-05");
  });

  it("returns integration status without exposing secrets", async () => {
    const response = await getIntegrations();
    const payload = await response.json();
    const healthResponse = await getHealth();
    const health = await healthResponse.json();

    expect(payload.integrations.length).toBeGreaterThan(0);
    expect(JSON.stringify(payload.integrations)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(health.checks.length).toBeGreaterThan(0);
    expect(health.summary.total).toBe(health.checks.length);
  });

  it("exports redacted data and creates deletion requests", async () => {
    const exportResponse = await exportPrivacy();
    const exported = await exportResponse.json();
    const deleteResponse = await deletePrivacy(jsonRequest("/api/privacy/delete", { scope: "local" }));
    const deleted = await deleteResponse.json();
    const cloudDeleteResponse = await deletePrivacy(jsonRequest("/api/privacy/delete", { scope: "cloud" }));
    const cloudDeleted = await cloudDeleteResponse.json();

    expect(exported.export.schema).toBe("liji.workspace.export.v1");
    expect(exported.export.data.contacts[0].name).toBe("[NAME]");
    expect(exported.source).toBe("demo");
    expect(deleted.deletion.status).toBe("queued");
    expect(cloudDeleted.source).toBe("demo");
    expect(cloudDeleted.deletedTables).toEqual([]);
  });

  it("queues notification delivery logs in demo mode", async () => {
    const response = await sendNotification(
      jsonRequest("/api/send-notification", {
        title: "客户宴请",
        level: "level_1",
        acknowledged: false,
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.channels).toEqual(["push", "sms", "voice"]);
    expect(payload.logs).toHaveLength(3);
    expect(payload.logs[0].provider).toBe("web_push");
    expect(payload.logs[1].providerStatus).toBe("not_applicable");
    expect(payload.escalationPlan.status).toBe("waiting_first_push");
    expect(payload.externalDelivery).toEqual([]);
    expect(payload.escalationJob.channels).toEqual(["sms", "voice"]);
  });

  it("accepts Aliyun HTTP batch notification receipts in demo mode", async () => {
    const response = await pushNotificationReceipts(
      jsonRequest("/api/notification-receipts/push", [
        {
          phone_number: "13811110000",
          success: true,
          err_code: "DELIVERED",
          biz_id: "biz-1",
        },
      ])
    );
    const payload = await response.json();

    expect(payload.code).toBe(0);
    expect(payload.source).toBe("demo");
    expect(payload.accepted).toBe(1);
    expect(payload.processed[0].providerStatus).toBe("delivered");
  });

  it("searches AI memories in demo mode", async () => {
    const response = await searchAiMemories(
      jsonRequest("/api/ai-memories/search", {
        query: "周明 香菜",
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.results[0].memory.content).toContain("周明");
  });

  it("reviews AI memories in demo mode", async () => {
    const response = await reviewAiMemory(
      jsonRequest("/api/ai-memories/review", {
        memoryId: "m-1",
        content: "周明不吃香菜，偏好安静包间。",
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.persisted).toBe(false);
    expect(payload.resolvedAlerts).toBe(0);
    expect(payload.memory.reviewStatus).toBe("healthy");
    expect(payload.memory.source).toBe("manual");
    expect(payload.memory.correctedAt).toBeDefined();
  });

  it("batch processes AI memories in demo mode", async () => {
    const response = await batchAiMemories(
      jsonRequest("/api/ai-memories/batch", {
        action: "ignore",
        memoryIds: ["m-1", "m-2"],
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.persisted).toBe(false);
    expect(payload.action).toBe("ignore");
    expect(payload.updated).toBeGreaterThan(0);
  });

  it("does not embed AI memories in demo mode", async () => {
    const response = await embedAiMemories(
      jsonRequest("/api/ai-memories/embed", {
        limit: 10,
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.provider).toBe("disabled");
    expect(payload.embedded).toBe(0);
  });

  it("returns queued extraction jobs when OCR provider is configured", async () => {
    vi.stubEnv("LIJI_CAPTURE_OCR_PROVIDER", "aliyun-ocr");

    const response = await extractCapture(
      jsonRequest("/api/capture/extract", {
        source: "screenshot",
        fileName: "receipt.png",
        mimeType: "image/png",
        contentBase64: "ZmFrZQ==",
      })
    );
    const payload = await response.json();

    expect(payload.extraction.provider).toBe("queued-provider");
    expect(payload.extraction.job.provider).toBe("aliyun-ocr");
    expect(payload.persistedJob).toBe(false);
  });

  it("accepts capture provider callbacks in demo mode", async () => {
    const response = await captureProviderCallback(
      jsonRequest("/api/capture/provider-callback", {
        jobId: "capjob-1",
        status: "completed",
        extractedText: "周明下次宴请不吃香菜",
        confidence: 0.9,
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.persisted).toBe(false);
    expect(payload.callback.jobId).toBe("capjob-1");
    expect(payload.callback.status).toBe("completed");
  });

  it("accepts manual capture completion in demo mode", async () => {
    const response = await manualCompleteCapture(
      jsonRequest("/api/capture/manual-complete", {
        jobId: "capjob-1",
        extractedText: "周明下次宴请不吃香菜",
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.persisted).toBe(false);
    expect(payload.job.status).toBe("completed");
    expect(payload.capture.rawText).toContain("周明");
  });

  it("serves compliance rules and demo workers without Supabase", async () => {
    const complianceResponse = await getComplianceRules(
      new Request("http://localhost/api/compliance/rules?label=国企高管")
    );
    const compliance = await complianceResponse.json();
    const captureWorkerResponse = await processCaptureJobs(
      jsonRequest("/api/capture/process-jobs", { limit: 5 })
    );
    const captureWorker = await captureWorkerResponse.json();
    const captureSlaResponse = await runCaptureSla(
      jsonRequest("/api/capture/sla/run", { limit: 5, staleMinutes: 30 })
    );
    const captureSla = await captureSlaResponse.json();
    const escalationWorkerResponse = await runReminderEscalations(
      jsonRequest("/api/reminder-escalations/run", { limit: 5 })
    );
    const escalationWorker = await escalationWorkerResponse.json();
    const receiptWorkerResponse = await runNotificationReceipts(
      jsonRequest("/api/notification-receipts/run", { limit: 5 })
    );
    const receiptWorker = await receiptWorkerResponse.json();
    const retryWorkerResponse = await runNotificationRetries(
      jsonRequest("/api/notification-retries/run", { limit: 5 })
    );
    const retryWorker = await retryWorkerResponse.json();
    const fulfillmentReconcileResponse = await reconcileFulfillment(
      jsonRequest("/api/fulfillment/reconcile", { period: "2026-07", limit: 5 })
    );
    const fulfillmentReconcile = await fulfillmentReconcileResponse.json();
    const maintenanceResponse = await maintainAiMemories(
      jsonRequest("/api/ai-memories/maintenance", { limitUsers: 5, embedMissing: false })
    );
    const maintenance = await maintenanceResponse.json();

    expect(compliance.source).toBe("demo");
    expect(compliance.profile.giftLimitCny).toBe(200);
    expect(captureWorker.source).toBe("demo");
    expect(captureSla.source).toBe("demo");
    expect(captureSla.processed[0].alertSource).toBe("capture_sla");
    expect(escalationWorker.source).toBe("demo");
    expect(receiptWorker.source).toBe("demo");
    expect(retryWorker.source).toBe("demo");
    expect(retryWorker.processed[0].retryCount).toBe(1);
    expect(fulfillmentReconcile.source).toBe("demo");
    expect(fulfillmentReconcile.reports[0].summary.refundedOrders).toBe(1);
    expect(maintenance.source).toBe("demo");
    expect(maintenance.processed[0].reviews.length).toBeGreaterThan(0);
  });

  it("accepts push subscriptions and fulfillment clicks", async () => {
    const pushResponse = await savePushSubscription(
      jsonRequest("/api/push-subscriptions", {
        endpoint: "https://push.example.test/subscription/1",
        keys: { p256dh: "p256dh", auth: "auth" },
        userAgent: "vitest",
      })
    );
    const push = await pushResponse.json();
    const clickResponse = await clickFulfillment(
      jsonRequest("/api/fulfillment/click", {
        planId: "p-1",
        planItemId: "pi-1",
        provider: "jd",
        targetUrl: "https://search.jd.com/Search?keyword=test",
      })
    );
    const click = await clickResponse.json();

    expect(push.subscription.enabled).toBe(true);
    expect(click.click.provider).toBe("jd");
    expect(click.audit.action).toBe("fulfill");
  });

  it("accepts fulfillment callback payloads in demo mode", async () => {
    const response = await fulfillmentCallback(
      jsonRequest("/api/fulfillment/callback", {
        provider: "jd",
        externalOrderId: "order-1",
        status: "paid",
        planId: "11111111-1111-4111-8111-111111111111",
        amountCny: 1200,
        commissionCny: 36,
        settlementStatus: "settled",
        settlementPeriod: "2026-07",
      })
    );
    const payload = await response.json();

    expect(payload.source).toBe("demo");
    expect(payload.callback.status).toBe("paid");
    expect(payload.callback.commissionCny).toBe(36);
    expect(payload.persisted).toBe(false);
  });

  it("generates monthly report objects for persistence", async () => {
    const response = await getMonthlyReport(
      new Request("http://localhost/api/monthly-report?period=2026-05")
    );
    const payload = await response.json();

    expect(payload.report.period).toBe("2026-05");
    expect(payload.report.insight.healthScore).toBeGreaterThan(0);
  });
});
