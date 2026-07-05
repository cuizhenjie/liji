import type { P0ReadinessAction, ReadinessCheck } from "./health";
import type { ProductionCheckReport } from "./production-check";

export type ProductionLaunchTaskStatus = "ready" | "blocked" | "needs_config";

export type ProductionLaunchTask = {
  id: string;
  title: string;
  priority: "P0" | "P1";
  category: ReadinessCheck["category"];
  status: ProductionLaunchTaskStatus;
  ownerRole: "技术负责人" | "运营负责人" | "财务负责人" | "产品负责人";
  missingEnvKeys: string[];
  callbackUrls: string[];
  commands: string[];
  checklist: string[];
};

export type ProductionLaunchChecklist = {
  status: ProductionLaunchTaskStatus;
  summary: {
    ready: number;
    blocked: number;
    needsConfig: number;
    missingEnvKeys: string[];
  };
  nextTask?: ProductionLaunchTask;
  tasks: ProductionLaunchTask[];
};

const envKeysByCheckId: Record<string, string[]> = {
  "supabase-public": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  "supabase-service": ["SUPABASE_SERVICE_ROLE_KEY"],
  "cron-secret": ["CRON_SECRET"],
  "openai": ["OPENAI_API_KEY"],
  "openai-embedding": ["OPENAI_API_KEY"],
  "capture-ocr": ["LIJI_CAPTURE_OCR_PROVIDER"],
  "capture-asr": ["LIJI_CAPTURE_ASR_PROVIDER"],
  "capture-provider-endpoint": ["LIJI_CAPTURE_PROVIDER_ENDPOINT"],
  "capture-provider-callback": ["SUPABASE_SERVICE_ROLE_KEY", "LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET"],
  "capture-provider-allowlist": ["LIJI_CAPTURE_PROVIDER_ALLOWED_IPS"],
  "public-app-url": ["LIJI_PUBLIC_APP_URL"],
  "capture-storage": ["SUPABASE_SERVICE_ROLE_KEY"],
  "web-push": ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
  "aliyun-sms": ["ALIYUN_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_SECRET", "ALIYUN_SMS_SIGN_NAME", "ALIYUN_SMS_TEMPLATE_CODE", "LIJI_DEFAULT_NOTIFY_PHONE"],
  "aliyun-voice": ["ALIYUN_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_SECRET", "ALIYUN_VOICE_CALLED_SHOW_NUMBER", "ALIYUN_VOICE_TTS_CODE", "LIJI_DEFAULT_NOTIFY_PHONE"],
  "external-notification-gate": ["LIJI_ENABLE_EXTERNAL_NOTIFICATIONS"],
  "notification-receipt-push": ["SUPABASE_SERVICE_ROLE_KEY", "LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET"],
  "fulfillment-callback-secret": ["FULFILLMENT_CALLBACK_SECRET"],
  "jd-cps": ["JD_UNION_ID"],
  "fulfillment-cps-providers": ["JD_UNION_ID", "TAOBAO_PID", "MEITUAN_CPS_ID", "CTRIP_AFFILIATE_ID", "TONGCHENG_AFFILIATE_ID"],
  "fulfillment-provider-sync-auth": [
    "JD_UNION_ORDER_API_ENDPOINT",
    "JD_UNION_ORDER_API_SECRET",
    "TAOBAO_ORDER_API_ENDPOINT",
    "TAOBAO_ORDER_API_SECRET",
    "MEITUAN_ORDER_API_ENDPOINT",
    "MEITUAN_ORDER_API_SECRET",
    "CTRIP_ORDER_API_ENDPOINT",
    "CTRIP_ORDER_API_SECRET",
    "TONGCHENG_ORDER_API_ENDPOINT",
    "TONGCHENG_ORDER_API_SECRET",
  ],
  "billing-checkout-provider": ["LIJI_BILLING_PROVIDER", "LIJI_BILLING_CHECKOUT_URL"],
  "billing-invoice-provider": ["LIJI_INVOICE_PROVIDER"],
};

const ownerByCategory: Record<ReadinessCheck["category"], ProductionLaunchTask["ownerRole"]> = {
  data: "技术负责人",
  ai: "技术负责人",
  notification: "运营负责人",
  fulfillment: "运营负责人",
  security: "技术负责人",
  ops: "产品负责人",
};

const callbackIdsByActionId: Record<string, string[]> = {
  "capture-provider-production": ["capture-provider-callback"],
  "notification-production": ["notification-receipts-push"],
  "fulfillment-settlement": ["fulfillment-callback"],
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function taskStatusFromAction(action: P0ReadinessAction): ProductionLaunchTaskStatus {
  if (action.status === "ready") return "ready";
  if (action.status === "blocked") return "blocked";
  return "needs_config";
}

function statusWeight(status: ProductionLaunchTaskStatus) {
  if (status === "blocked") return 0;
  if (status === "needs_config") return 1;
  return 2;
}

function missingEnvKeys(action: P0ReadinessAction, checks: ReadinessCheck[]) {
  const byId = new Map(checks.map((check) => [check.id, check]));

  return unique(
    action.checkIds.flatMap((checkId) => {
      const check = byId.get(checkId);
      if (!check || check.status === "pass") return [];
      return envKeysByCheckId[checkId] ?? [];
    })
  );
}

function callbackUrls(action: P0ReadinessAction, report: ProductionCheckReport) {
  const callbackIds = callbackIdsByActionId[action.id] ?? [];

  return report.callbacks
    .filter((callback) => callbackIds.includes(callback.id) && callback.url)
    .map((callback) => callback.url as string);
}

function checklist(action: P0ReadinessAction, missingKeys: string[]) {
  return unique([
    ...missingKeys.map((key) => `配置 ${key}`),
    ...action.blockers,
    ...action.nextSteps,
  ]);
}

export function buildProductionLaunchChecklist(report: ProductionCheckReport): ProductionLaunchChecklist {
  const p0Tasks: ProductionLaunchTask[] = report.p0Actions.map((action) => {
    const missingKeys = missingEnvKeys(action, report.checks);

    return {
      id: action.id,
      title: action.title,
      priority: "P0",
      category: action.category,
      status: taskStatusFromAction(action),
      ownerRole: ownerByCategory[action.category],
      missingEnvKeys: missingKeys,
      callbackUrls: callbackUrls(action, report),
      commands: report.commands,
      checklist: checklist(action, missingKeys),
    };
  });
  const p1Tasks: ProductionLaunchTask[] = report.checks
    .filter((check) => !check.requiredForProduction && check.status !== "pass")
    .map((check) => {
      const missingKeys = envKeysByCheckId[check.id] ?? [];

      return {
        id: `p1:${check.id}`,
        title: check.label,
        priority: "P1",
        category: check.category,
        status: check.status === "fail" ? "blocked" : "needs_config",
        ownerRole: ownerByCategory[check.category],
        missingEnvKeys: missingKeys,
        callbackUrls: [],
        commands: report.commands.filter((command) => command === "npm run prod:check"),
        checklist: unique([
          ...missingKeys.map((key) => `配置 ${key}`),
          check.detail,
          "完成配置后重新运行 npm run prod:check。",
        ]),
      };
    });
  const sortedP1Tasks = p1Tasks.sort((left, right) => {
    const byStatus = statusWeight(left.status) - statusWeight(right.status);
    if (byStatus !== 0) return byStatus;
    return left.title.localeCompare(right.title, "zh-CN");
  });
  const tasks = [...p0Tasks, ...sortedP1Tasks];
  const missingEnvKeysSummary = unique(tasks.flatMap((task) => task.missingEnvKeys));
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const needsConfig = tasks.filter((task) => task.status === "needs_config").length;
  const ready = tasks.filter((task) => task.status === "ready").length;

  return {
    status: blocked > 0 ? "blocked" : needsConfig > 0 ? "needs_config" : "ready",
    summary: {
      ready,
      blocked,
      needsConfig,
      missingEnvKeys: missingEnvKeysSummary,
    },
    nextTask: tasks.find((task) => task.status !== "ready"),
    tasks,
  };
}
