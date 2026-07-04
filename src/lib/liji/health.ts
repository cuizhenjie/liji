export type ReadinessStatus = "pass" | "warn" | "fail";

export type ReadinessCheck = {
  id: string;
  label: string;
  category: "data" | "ai" | "notification" | "fulfillment" | "security" | "ops";
  status: ReadinessStatus;
  requiredForProduction: boolean;
  detail: string;
};

function has(...values: Array<string | undefined>) {
  return values.every((value) => Boolean(value?.trim()));
}

function check(params: Omit<ReadinessCheck, "status"> & { ok: boolean; warn?: boolean }): ReadinessCheck {
  return {
    id: params.id,
    label: params.label,
    category: params.category,
    requiredForProduction: params.requiredForProduction,
    detail: params.detail,
    status: params.ok ? "pass" : params.warn ? "warn" : "fail",
  };
}

export function getReadinessChecks(
  env: Record<string, string | undefined> = process.env
): ReadinessCheck[] {
  const hasSupabasePublic = has(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasSupabaseService = has(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const captureStorageBucket = env.LIJI_CAPTURE_STORAGE_BUCKET ?? "liji-capture-attachments";
  const hasVapid = has(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT);
  const hasAliyunBase = has(env.ALIYUN_ACCESS_KEY_ID, env.ALIYUN_ACCESS_KEY_SECRET);
  const hasAliyunSms = hasAliyunBase && has(env.ALIYUN_SMS_SIGN_NAME, env.ALIYUN_SMS_TEMPLATE_CODE, env.LIJI_DEFAULT_NOTIFY_PHONE);
  const hasAliyunVoice = hasAliyunBase && has(env.ALIYUN_VOICE_CALLED_SHOW_NUMBER, env.ALIYUN_VOICE_TTS_CODE, env.LIJI_DEFAULT_NOTIFY_PHONE);
  const externalNotificationsEnabled = env.LIJI_ENABLE_EXTERNAL_NOTIFICATIONS === "true";
  const hasNotificationReceiptPush = hasSupabaseService && has(env.LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET);
  const hasCaptureCallback = hasSupabaseService && has(env.LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET);
  const hasAnyCpsProvider = [
    env.JD_UNION_ID,
    env.TAOBAO_PID,
    env.MEITUAN_CPS_ID,
    env.CTRIP_AFFILIATE_ID,
    env.TONGCHENG_AFFILIATE_ID,
  ].some((value) => has(value));

  return [
    check({
      id: "supabase-public",
      label: "Supabase Auth / Browser Client",
      category: "data",
      requiredForProduction: true,
      ok: hasSupabasePublic,
      detail: hasSupabasePublic ? "浏览器端 Auth 与工作区读取已配置。" : "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    }),
    check({
      id: "supabase-service",
      label: "Supabase Service Role / Cron",
      category: "data",
      requiredForProduction: true,
      ok: hasSupabaseService,
      detail: hasSupabaseService ? "服务端 Cron、月报和审计落库可用。" : "缺少 SUPABASE_SERVICE_ROLE_KEY，Cron 只能走 demo/mock。",
    }),
    check({
      id: "cron-secret",
      label: "Cron 调用密钥",
      category: "ops",
      requiredForProduction: true,
      ok: has(env.CRON_SECRET),
      detail: env.CRON_SECRET ? "Cron 请求需要携带密钥。" : "未配置 CRON_SECRET，service role 环境会拒绝 Cron 写任务。",
    }),
    check({
      id: "openai",
      label: "云端结构化解析",
      category: "ai",
      requiredForProduction: false,
      ok: has(env.OPENAI_API_KEY),
      warn: true,
      detail: env.OPENAI_API_KEY ? "用户授权后可调用云端模型。" : "未配置 OPENAI_API_KEY，将使用本地规则解析。",
    }),
    check({
      id: "openai-embedding",
      label: "AI 记忆向量召回",
      category: "ai",
      requiredForProduction: false,
      ok: has(env.OPENAI_API_KEY),
      warn: true,
      detail: env.OPENAI_API_KEY ? "可生成 AI 记忆 embedding 并写入 pgvector。" : "未配置 OPENAI_API_KEY，AI 记忆使用本地词法召回。",
    }),
    check({
      id: "capture-ocr",
      label: "OCR 附件抽取",
      category: "ai",
      requiredForProduction: false,
      ok: has(env.LIJI_CAPTURE_OCR_PROVIDER),
      warn: true,
      detail: env.LIJI_CAPTURE_OCR_PROVIDER ? "截图、聊天和账单附件可进入 OCR 抽取队列。" : "未配置 LIJI_CAPTURE_OCR_PROVIDER，附件会等待人工补录。",
    }),
    check({
      id: "capture-asr",
      label: "ASR 语音抽取",
      category: "ai",
      requiredForProduction: false,
      ok: has(env.LIJI_CAPTURE_ASR_PROVIDER),
      warn: true,
      detail: env.LIJI_CAPTURE_ASR_PROVIDER ? "语音附件可进入 ASR 抽取队列。" : "未配置 LIJI_CAPTURE_ASR_PROVIDER，语音附件会等待人工补录。",
    }),
    check({
      id: "capture-provider-endpoint",
      label: "OCR/ASR Worker Endpoint",
      category: "ai",
      requiredForProduction: false,
      ok: has(env.LIJI_CAPTURE_PROVIDER_ENDPOINT),
      warn: true,
      detail: env.LIJI_CAPTURE_PROVIDER_ENDPOINT ? "采集抽取 worker 可调用外部 provider。" : "未配置 LIJI_CAPTURE_PROVIDER_ENDPOINT，抽取 job 会停留在队列中。",
    }),
    check({
      id: "capture-provider-callback",
      label: "OCR/ASR Provider 回调",
      category: "ai",
      requiredForProduction: false,
      ok: hasCaptureCallback,
      warn: true,
      detail: hasCaptureCallback
        ? "OCR/ASR provider 回调可验签、回写抽取结果并触发重试/告警。"
        : "未配置回调密钥或 Supabase service role，provider 异步回调只能 demo 接收。",
    }),
    check({
      id: "capture-storage",
      label: "采集附件对象存储",
      category: "data",
      requiredForProduction: false,
      ok: hasSupabaseService,
      warn: true,
      detail: hasSupabaseService
        ? `采集附件会上传到 ${captureStorageBucket} 并生成短期 signed URL。`
        : "未配置 Supabase service role，附件无法由服务端写入对象存储。",
    }),
    check({
      id: "web-push",
      label: "Web Push",
      category: "notification",
      requiredForProduction: true,
      ok: hasVapid,
      detail: hasVapid ? "VAPID 公私钥完整，浏览器 Push 可真实发送。" : "缺少 VAPID public/private/subject，Push 只能提示未配置。",
    }),
    check({
      id: "aliyun-sms",
      label: "阿里云短信",
      category: "notification",
      requiredForProduction: false,
      ok: hasAliyunSms,
      warn: true,
      detail: hasAliyunSms ? "短信模板、签名和默认手机号已配置。" : "短信配置不完整，Level 1/2 会停留在 mock 或队列态。",
    }),
    check({
      id: "aliyun-voice",
      label: "阿里云语音",
      category: "notification",
      requiredForProduction: false,
      ok: hasAliyunVoice,
      warn: true,
      detail: hasAliyunVoice ? "语音主叫号码和 TTS 模板已配置。" : "语音配置不完整，Level 1 语音升级会停留在 mock 或队列态。",
    }),
    check({
      id: "external-notification-gate",
      label: "外部通知总开关",
      category: "security",
      requiredForProduction: true,
      ok: externalNotificationsEnabled,
      detail: externalNotificationsEnabled ? "外部短信/语音允许真实下发。" : "LIJI_ENABLE_EXTERNAL_NOTIFICATIONS 未开启，外部短信/语音不会真实发送。",
    }),
    check({
      id: "notification-receipt-push",
      label: "通知回执推送入口",
      category: "notification",
      requiredForProduction: false,
      ok: hasNotificationReceiptPush,
      warn: true,
      detail: hasNotificationReceiptPush
        ? "阿里云 SMS/Voice HTTP/MNS 回执可验签并更新投递日志。"
        : "未配置回执推送密钥或 Supabase service role，HTTP/MNS 回执只能 demo 接收。",
    }),
    check({
      id: "fulfillment-callback-secret",
      label: "履约回调签名",
      category: "fulfillment",
      requiredForProduction: true,
      ok: has(env.FULFILLMENT_CALLBACK_SECRET),
      detail: env.FULFILLMENT_CALLBACK_SECRET ? "第三方履约回调需要 HMAC 签名。" : "未配置 FULFILLMENT_CALLBACK_SECRET，生产落库会拒绝履约回调。",
    }),
    check({
      id: "jd-cps",
      label: "京东联盟 CPS",
      category: "fulfillment",
      requiredForProduction: false,
      ok: has(env.JD_UNION_ID),
      warn: true,
      detail: env.JD_UNION_ID ? "京东 CPS 参数可接入推广链路。" : "未配置 JD_UNION_ID，继续使用搜索跳转。",
    }),
    check({
      id: "fulfillment-cps-providers",
      label: "履约联盟归因",
      category: "fulfillment",
      requiredForProduction: false,
      ok: hasAnyCpsProvider,
      warn: true,
      detail: hasAnyCpsProvider ? "至少一个联盟归因参数已配置。" : "未配置联盟归因参数，链接仍保留礼记追踪参数。",
    }),
  ];
}

export function summarizeReadiness(checks: ReadinessCheck[]) {
  const required = checks.filter((item) => item.requiredForProduction);
  const failedRequired = required.filter((item) => item.status !== "pass");
  const warnings = checks.filter((item) => item.status === "warn");

  return {
    productionReady: failedRequired.length === 0,
    failedRequired: failedRequired.length,
    warnings: warnings.length,
    passed: checks.filter((item) => item.status === "pass").length,
    total: checks.length,
  };
}
