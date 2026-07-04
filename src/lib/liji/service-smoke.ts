import { buildEntitlementReport } from "./entitlements";
import { buildProductionCheckReport } from "./production-check";
import { configuredFulfillmentProviderSyncConfigs } from "./fulfillment-provider-sync";
import { getNativeBridgeCapabilities, validateNativeBridgePayload } from "./native-bridge";
import {
  createNotificationGovernanceDecision,
  getNotificationFailureCodebook,
} from "./notification-governance";
import type { WorkspaceData } from "./types";

export type ServiceSmokeCheck = {
  id: string;
  label: string;
  category: "production" | "capture" | "notification" | "fulfillment" | "native" | "billing";
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type ServiceSmokeSuite = {
  mode: "dry_run";
  generatedAt: string;
  iterations: number;
  status: "pass" | "warn" | "fail";
  checks: ServiceSmokeCheck[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };
};

function check(params: Omit<ServiceSmokeCheck, "status"> & {
  ok: boolean;
  warn?: boolean;
}): ServiceSmokeCheck {
  return {
    id: params.id,
    label: params.label,
    category: params.category,
    detail: params.detail,
    status: params.ok ? "pass" : params.warn ? "warn" : "fail",
  };
}

export function runServiceSmokeSuite(params: {
  env?: Record<string, string | undefined>;
  data: WorkspaceData;
  iterations?: number;
  now?: Date;
}): ServiceSmokeSuite {
  const env = params.env ?? process.env;
  const iterations = Math.max(1, Math.min(20, params.iterations ?? 3));
  const production = buildProductionCheckReport({ env, now: params.now });
  const fulfillmentConfigs = configuredFulfillmentProviderSyncConfigs(env);
  const nativeCapabilities = getNativeBridgeCapabilities(env);
  const entitlementReport = buildEntitlementReport({
    data: params.data,
    planId: env.LIJI_BILLING_PLAN,
  });
  const notificationSamples = [
    createNotificationGovernanceDecision({
      log: {
        channel: "sms",
        providerStatus: "failed",
        providerMessage: "Aliyun SMS 失败：isv.BUSINESS_LIMIT_CONTROL 触发频控",
      },
    }),
    createNotificationGovernanceDecision({
      log: {
        channel: "sms",
        providerStatus: "failed",
        providerMessage: "Aliyun SMS 失败：isv.SMS_TEMPLATE_ILLEGAL 模板不合法",
      },
    }),
  ];
  const nativeUpload = validateNativeBridgePayload({
    source: "file_upload",
    fileName: "receipt.png",
    mimeType: "image/png",
    uploadedBytes: 512,
    totalBytes: 1024,
  });

  const checks: ServiceSmokeCheck[] = [
    check({
      id: "production-readiness",
      label: "生产 readiness 合约",
      category: "production",
      ok: production.status === "ready",
      warn: production.status === "needs_config",
      detail: `P0 actions: ${production.p0Actions.map((item) => `${item.id}:${item.status}`).join(", ")}`,
    }),
    check({
      id: "capture-provider-contract",
      label: "OCR/ASR provider 合约",
      category: "capture",
      ok: Boolean(env.LIJI_CAPTURE_PROVIDER_ENDPOINT && (env.LIJI_CAPTURE_OCR_PROVIDER || env.LIJI_CAPTURE_ASR_PROVIDER)),
      warn: true,
      detail: env.LIJI_CAPTURE_PROVIDER_ENDPOINT
        ? `已配置抽取 endpoint，dry-run 迭代 ${iterations} 次。`
        : "未配置抽取 endpoint，dry-run 仅校验队列和人工补录路径。",
    }),
    check({
      id: "notification-codebook-contract",
      label: "通知错误码治理",
      category: "notification",
      ok: notificationSamples.every((item) => item.failureClass !== "unknown") &&
        getNotificationFailureCodebook().length >= 5,
      detail: "频控、模板异常、号码异常、退订和语音回执延迟均有 SOP。",
    }),
    check({
      id: "fulfillment-provider-contract",
      label: "联盟订单拉单配置",
      category: "fulfillment",
      ok: fulfillmentConfigs.length > 0 && fulfillmentConfigs.every((item) => item.secret),
      warn: fulfillmentConfigs.length === 0,
      detail: fulfillmentConfigs.length > 0
        ? `已配置 ${fulfillmentConfigs.map((item) => item.provider).join("、")} 拉单 endpoint。`
        : "未配置订单 API，dry-run 使用 demo 归一化和对账。",
    }),
    check({
      id: "native-bridge-contract",
      label: "原生采集桥",
      category: "native",
      ok: nativeCapabilities.some((item) => item.id === "attachment_upload_progress" && item.status === "ready") &&
        nativeUpload.progressPercent === 50,
      detail: `附件上传进度 dry-run=${nativeUpload.progressPercent}%，短信/录音能力 ${nativeCapabilities.length} 项。`,
    }),
    check({
      id: "entitlement-metering-contract",
      label: "会员权益计量",
      category: "billing",
      ok: entitlementReport.usage.length > 0,
      warn: entitlementReport.upgradeRecommended,
      detail: `${entitlementReport.plan.label}，${entitlementReport.usage.filter((item) => item.status !== "ok").length} 项接近或超过额度。`,
    }),
  ];

  const failed = checks.filter((item) => item.status === "fail").length;
  const warnings = checks.filter((item) => item.status === "warn").length;
  const passed = checks.filter((item) => item.status === "pass").length;

  return {
    mode: "dry_run",
    generatedAt: (params.now ?? new Date()).toISOString(),
    iterations,
    status: failed > 0 ? "fail" : warnings > 0 ? "warn" : "pass",
    checks,
    summary: {
      passed,
      warnings,
      failed,
      total: checks.length,
    },
  };
}
