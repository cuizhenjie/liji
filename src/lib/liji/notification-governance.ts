import type { NotificationLog } from "./types";

export type NotificationFailureClass =
  | "retryable"
  | "rate_limited"
  | "template_or_provider"
  | "permanent_recipient"
  | "user_opt_out"
  | "external_disabled"
  | "unknown";

export type NotificationGovernanceDecision = {
  failureClass: NotificationFailureClass;
  retryAllowed: boolean;
  stopReason?: string;
  alertSeverity?: "warning" | "critical";
  alertMessage?: string;
  retryDelayMultiplier: number;
};

export type NotificationFailureCodebookEntry = {
  code: string;
  provider: "aliyun_sms" | "aliyun_voice" | "generic";
  failureClass: NotificationFailureClass;
  severity: "info" | "warning" | "critical";
  retryPolicy: "retry" | "backoff" | "stop" | "circuit_break";
  operatorAction: string;
  sop: string[];
};

const DEFAULT_STOP_KEYWORDS = [
  "退订",
  "拒收",
  "停呼",
  "unsubscribe",
  "opt out",
  "opt-out",
  "blacklist",
  "black list",
  "do not call",
  "stop calling",
];

const RATE_LIMIT_PATTERNS = [
  "business_limit_control",
  "frequency",
  "rate limit",
  "too many",
  "流控",
  "限流",
  "频控",
  "触发天级流控",
  "触发小时级流控",
];

const TEMPLATE_OR_PROVIDER_PATTERNS = [
  "sms_template",
  "template",
  "签名",
  "模板",
  "tts",
  "called_show_number",
  "out_of_service",
  "product_un_subscript",
  "ram_permission",
  "permission",
  "account",
  "余额",
  "未开通",
  "未授权",
  "外部通知发送开关未开启",
  "未配置",
];

const PERMANENT_RECIPIENT_PATTERNS = [
  "mobile_number_illegal",
  "phone_number_illegal",
  "invalid phone",
  "invalid mobile",
  "空号",
  "号码不存在",
  "号码格式",
  "手机号非法",
];

const TRANSIENT_PATTERNS = [
  "timeout",
  "timed out",
  "network",
  "temporarily",
  "temporary",
  "service unavailable",
  "系统繁忙",
  "网络",
  "超时",
];

export const notificationFailureCodebook: NotificationFailureCodebookEntry[] = [
  {
    code: "isv.BUSINESS_LIMIT_CONTROL",
    provider: "aliyun_sms",
    failureClass: "rate_limited",
    severity: "warning",
    retryPolicy: "backoff",
    operatorAction: "降低重试频率并检查同一手机号/模板的发送频次。",
    sop: ["确认是否触发小时或天级流控", "保留重试但放大退避", "必要时切换站内提醒或人工确认"],
  },
  {
    code: "isv.SMS_TEMPLATE_ILLEGAL",
    provider: "aliyun_sms",
    failureClass: "template_or_provider",
    severity: "critical",
    retryPolicy: "circuit_break",
    operatorAction: "暂停该模板继续发送，检查模板 Code、变量名和审核状态。",
    sop: ["核对阿里云模板 Code", "检查模板变量与请求参数", "修复后用内部号码压测"],
  },
  {
    code: "isv.SMS_SIGNATURE_ILLEGAL",
    provider: "aliyun_sms",
    failureClass: "template_or_provider",
    severity: "critical",
    retryPolicy: "circuit_break",
    operatorAction: "暂停短信发送，检查签名名称与审核状态。",
    sop: ["核对短信签名", "确认签名审核通过", "恢复前执行 /api/ops/service-smoke dry-run"],
  },
  {
    code: "MOBILE_NUMBER_ILLEGAL",
    provider: "generic",
    failureClass: "permanent_recipient",
    severity: "warning",
    retryPolicy: "stop",
    operatorAction: "停止重试并请用户校验通知手机号。",
    sop: ["标记该日志为停呼", "联系用户确认号码", "更新隐私中心通知手机号后再恢复"],
  },
  {
    code: "USER_OPT_OUT",
    provider: "generic",
    failureClass: "user_opt_out",
    severity: "warning",
    retryPolicy: "stop",
    operatorAction: "尊重用户退订/拒收意愿，停止短信或语音触达。",
    sop: ["保留站内提醒", "不要自动恢复外部通知", "如用户主动授权再重新开启"],
  },
  {
    code: "QueryCallDetailByCallId.empty",
    provider: "aliyun_voice",
    failureClass: "retryable",
    severity: "info",
    retryPolicy: "retry",
    operatorAction: "语音回执可能延迟，等待下一轮轮询。",
    sop: ["检查 CallId 是否存在", "等待下一次回执轮询", "超过 SLA 后人工确认"],
  },
];

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

export function parseNotificationStopKeywords(value?: string) {
  const custom = value
    ?.split(/[,\n|，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...(custom ?? []), ...DEFAULT_STOP_KEYWORDS])];
}

export function getNotificationFailureCodebook() {
  return notificationFailureCodebook;
}

export function lookupNotificationFailureCode(messageOrCode: string) {
  const normalized = normalize(messageOrCode);
  return notificationFailureCodebook.find((entry) =>
    normalized.includes(entry.code.toLowerCase()) ||
    normalized.includes(entry.failureClass)
  );
}

export function classifyNotificationFailure(params: {
  providerMessage?: string;
  providerStatus?: NotificationLog["providerStatus"];
  channel?: NotificationLog["channel"];
  stopKeywords?: string[];
}): NotificationFailureClass {
  const message = normalize(params.providerMessage);
  if (!message && params.providerStatus !== "failed") {
    return "unknown";
  }

  const codebookEntry = message ? lookupNotificationFailureCode(message) : undefined;
  if (codebookEntry) {
    return codebookEntry.failureClass;
  }

  const stopKeywords = params.stopKeywords ?? DEFAULT_STOP_KEYWORDS;
  if (includesAny(message, stopKeywords)) {
    return "user_opt_out";
  }

  if (includesAny(message, PERMANENT_RECIPIENT_PATTERNS)) {
    return "permanent_recipient";
  }

  if (message.includes("外部通知发送开关未开启")) {
    return "external_disabled";
  }

  if (includesAny(message, TEMPLATE_OR_PROVIDER_PATTERNS)) {
    return "template_or_provider";
  }

  if (includesAny(message, RATE_LIMIT_PATTERNS)) {
    return "rate_limited";
  }

  if (includesAny(message, TRANSIENT_PATTERNS)) {
    return "retryable";
  }

  if (params.providerStatus === "failed") {
    return "retryable";
  }

  return "unknown";
}

export function createNotificationGovernanceDecision(params: {
  log: Pick<NotificationLog, "channel" | "providerMessage" | "providerStatus">;
  stopKeywords?: string[];
  templateCircuitBreakerEnabled?: boolean;
}): NotificationGovernanceDecision {
  const failureClass = classifyNotificationFailure({
    providerMessage: params.log.providerMessage,
    providerStatus: params.log.providerStatus,
    channel: params.log.channel,
    stopKeywords: params.stopKeywords,
  });

  if (failureClass === "user_opt_out") {
    return {
      failureClass,
      retryAllowed: false,
      stopReason: "user_opt_out",
      alertSeverity: "warning",
      alertMessage: "用户疑似已退订或拒收外部通知，已停止继续短信/语音触达。",
      retryDelayMultiplier: 1,
    };
  }

  if (failureClass === "permanent_recipient") {
    return {
      failureClass,
      retryAllowed: false,
      stopReason: "permanent_recipient_error",
      alertSeverity: "warning",
      alertMessage: "接收号码疑似无效或不可达，请人工确认后再恢复通知。",
      retryDelayMultiplier: 1,
    };
  }

  if (failureClass === "external_disabled") {
    return {
      failureClass,
      retryAllowed: false,
      stopReason: "external_notifications_disabled",
      alertSeverity: "warning",
      alertMessage: "外部通知总开关关闭，已停止本次短信/语音重试。",
      retryDelayMultiplier: 1,
    };
  }

  if (failureClass === "template_or_provider") {
    if (params.templateCircuitBreakerEnabled === false) {
      return {
        failureClass,
        retryAllowed: true,
        alertSeverity: "warning",
        alertMessage: "通知模板或供应商配置异常，但模板熔断开关未开启，保留重试。",
        retryDelayMultiplier: 2,
      };
    }

    return {
      failureClass,
      retryAllowed: false,
      stopReason: "template_or_provider_error",
      alertSeverity: "critical",
      alertMessage: "通知模板、签名、权限或供应商配置异常，已熔断该通知重试并需要运营处理。",
      retryDelayMultiplier: 1,
    };
  }

  if (failureClass === "rate_limited") {
    return {
      failureClass,
      retryAllowed: true,
      alertSeverity: "warning",
      alertMessage: "供应商触发频控或限流，保留重试但放大退避间隔。",
      retryDelayMultiplier: 3,
    };
  }

  return {
    failureClass,
    retryAllowed: true,
    retryDelayMultiplier: 1,
  };
}
