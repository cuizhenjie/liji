import { existsSync } from "node:fs";
import { join } from "node:path";

import { getP0ReadinessActions, getReadinessChecks, summarizeReadiness } from "./health";

export type ProductionCallbackRoute = {
  id: string;
  label: string;
  path: string;
  url?: string;
  configured: boolean;
};

export type ProductionMigrationCheck = {
  file: string;
  exists: boolean;
  purpose: string;
};

export type ProductionCheckReport = {
  generatedAt: string;
  status: "ready" | "blocked" | "needs_config";
  summary: ReturnType<typeof summarizeReadiness>;
  p0Actions: ReturnType<typeof getP0ReadinessActions>;
  callbacks: ProductionCallbackRoute[];
  migrations: ProductionMigrationCheck[];
  commands: string[];
};

const expectedMigrations: Array<{ file: string; purpose: string }> = [
  {
    file: "20260701193000_initial_liji_schema.sql",
    purpose: "核心业务表、RLS 与 pgvector 扩展。",
  },
  {
    file: "20260702110000_productization_extensions.sql",
    purpose: "集成账号、履约点击、月报和审计日志。",
  },
  {
    file: "20260703120000_real_service_readiness.sql",
    purpose: "OCR/ASR、Level 1 升级与 AI 记忆向量召回。",
  },
  {
    file: "20260703193000_capture_storage_bucket.sql",
    purpose: "采集附件私有 bucket 与对象隔离策略。",
  },
  {
    file: "20260703222000_fulfillment_settlement_reconciliation.sql",
    purpose: "履约订单更新和结算对账报表。",
  },
  {
    file: "20260703233000_notification_retry_ops.sql",
    purpose: "通知重试治理和停呼原因字段。",
  },
];

function appUrl(env: Record<string, string | undefined>) {
  return env.LIJI_PUBLIC_APP_URL?.replace(/\/+$/u, "");
}

function callbackRoutes(env: Record<string, string | undefined>): ProductionCallbackRoute[] {
  const baseUrl = appUrl(env);
  const routes = [
    {
      id: "capture-provider-callback",
      label: "OCR/ASR provider 回调",
      path: "/api/capture/provider-callback",
    },
    {
      id: "notification-receipts-push",
      label: "短信/语音回执推送",
      path: "/api/notification-receipts/push",
    },
    {
      id: "fulfillment-callback",
      label: "履约订单回调",
      path: "/api/fulfillment/callback",
    },
  ];

  return routes.map((route) => ({
    ...route,
    configured: Boolean(baseUrl),
    url: baseUrl ? `${baseUrl}${route.path}` : undefined,
  }));
}

function migrationChecks(cwd = process.cwd()): ProductionMigrationCheck[] {
  return expectedMigrations.map((migration) => ({
    ...migration,
    exists: existsSync(join(cwd, "supabase", "migrations", migration.file)),
  }));
}

export function buildProductionCheckReport(params: {
  env?: Record<string, string | undefined>;
  cwd?: string;
  now?: Date;
} = {}): ProductionCheckReport {
  const env = params.env ?? process.env;
  const checks = getReadinessChecks(env);
  const summary = summarizeReadiness(checks);
  const p0Actions = getP0ReadinessActions(checks);
  const migrations = migrationChecks(params.cwd);
  const missingMigrations = migrations.filter((item) => !item.exists);
  const blockedActions = p0Actions.filter((item) => item.status === "blocked");

  return {
    generatedAt: (params.now ?? new Date()).toISOString(),
    status: summary.productionReady && missingMigrations.length === 0
      ? p0Actions.some((item) => item.status === "needs_config")
        ? "needs_config"
        : "ready"
      : blockedActions.length > 0 || missingMigrations.length > 0
        ? "blocked"
        : "needs_config",
    summary,
    p0Actions,
    callbacks: callbackRoutes(env),
    migrations,
    commands: [
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run e2e",
      "npm run prod:check",
    ],
  };
}
