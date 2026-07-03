export type IntegrationStatus = {
  provider:
    | "supabase"
    | "supabase_storage"
    | "openai"
    | "openai_embedding"
    | "aliyun_sms"
    | "aliyun_voice"
    | "aliyun_ocr"
    | "aliyun_asr"
    | "jd"
    | "taobao"
    | "meituan"
    | "ctrip"
    | "tongcheng"
    | "web_push";
  label: string;
  category: "data" | "ai" | "notification" | "fulfillment";
  mode: "configured" | "missing" | "search-link";
  detail: string;
};

export function getIntegrationStatuses(
  env: Record<string, string | undefined> = process.env
): IntegrationStatus[] {
  const hasSupabase = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      env.SUPABASE_SERVICE_ROLE_KEY
  );
  const hasAliyunBase = Boolean(env.ALIYUN_ACCESS_KEY_ID && env.ALIYUN_ACCESS_KEY_SECRET);
  const hasAliyunSms = Boolean(
    hasAliyunBase &&
      env.ALIYUN_SMS_SIGN_NAME &&
      env.ALIYUN_SMS_TEMPLATE_CODE &&
      env.LIJI_DEFAULT_NOTIFY_PHONE
  );
  const hasAliyunVoice = Boolean(
    hasAliyunBase &&
      env.ALIYUN_VOICE_CALLED_SHOW_NUMBER &&
      env.ALIYUN_VOICE_TTS_CODE &&
      env.LIJI_DEFAULT_NOTIFY_PHONE
  );

  return [
    {
      provider: "supabase",
      label: "Supabase 云端数据",
      category: "data",
      mode: hasSupabase ? "configured" : "missing",
      detail: hasSupabase ? "Auth、Postgres、RLS、Cron 落库可用。" : "未配置完整 Supabase 环境变量。",
    },
    {
      provider: "supabase_storage",
      label: "Supabase 对象存储",
      category: "data",
      mode: env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
      detail: env.SUPABASE_SERVICE_ROLE_KEY
        ? `采集附件可上传到 ${env.LIJI_CAPTURE_STORAGE_BUCKET ?? "liji-capture-attachments"} 并生成 signed URL。`
        : "未配置服务端存储权限，附件仅能排队或使用外部 contentUri。",
    },
    {
      provider: "openai",
      label: "OpenAI 结构化解析",
      category: "ai",
      mode: env.OPENAI_API_KEY ? "configured" : "missing",
      detail: env.OPENAI_API_KEY ? "用户授权后可调用公网模型。" : "未配置 OPENAI_API_KEY，使用本地规则。",
    },
    {
      provider: "openai_embedding",
      label: "OpenAI 记忆 Embedding",
      category: "ai",
      mode: env.OPENAI_API_KEY ? "configured" : "missing",
      detail: env.OPENAI_API_KEY ? "可生成 AI 记忆向量并通过 pgvector 召回。" : "未配置 OPENAI_API_KEY，AI 记忆使用词法召回。",
    },
    {
      provider: "web_push",
      label: "Web Push",
      category: "notification",
      mode: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "configured" : "missing",
      detail: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "浏览器 Push 注册入口可用。" : "未配置 VAPID public key。",
    },
    {
      provider: "aliyun_sms",
      label: "阿里云短信",
      category: "notification",
      mode: hasAliyunSms ? "configured" : "missing",
      detail: hasAliyunSms ? "短信 API 配置完整，可在外部通知开关开启后下发。" : "MVP 将使用 mock SMS。",
    },
    {
      provider: "aliyun_voice",
      label: "阿里云语音",
      category: "notification",
      mode: hasAliyunVoice ? "configured" : "missing",
      detail: hasAliyunVoice ? "语音 API 配置完整，可在外部通知开关开启后下发。" : "MVP 将使用 mock voice。",
    },
    {
      provider: "aliyun_ocr",
      label: "OCR 附件抽取",
      category: "ai",
      mode: env.LIJI_CAPTURE_OCR_PROVIDER && env.LIJI_CAPTURE_PROVIDER_ENDPOINT && env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
      detail: env.LIJI_CAPTURE_OCR_PROVIDER && env.LIJI_CAPTURE_PROVIDER_ENDPOINT && env.SUPABASE_SERVICE_ROLE_KEY ? "截图、账单附件会上传对象存储，进入 OCR worker 并回写确认中心。" : "截图和账单附件仍需对象存储、provider endpoint 或人工补文本。",
    },
    {
      provider: "aliyun_asr",
      label: "ASR 语音抽取",
      category: "ai",
      mode: env.LIJI_CAPTURE_ASR_PROVIDER && env.LIJI_CAPTURE_PROVIDER_ENDPOINT && env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
      detail: env.LIJI_CAPTURE_ASR_PROVIDER && env.LIJI_CAPTURE_PROVIDER_ENDPOINT && env.SUPABASE_SERVICE_ROLE_KEY ? "语音附件会上传对象存储，进入 ASR worker 并回写确认中心。" : "语音附件仍需对象存储、provider endpoint 或人工补文本。",
    },
    {
      provider: "jd",
      label: "京东联盟",
      category: "fulfillment",
      mode: env.JD_UNION_ID ? "configured" : "search-link",
      detail: env.JD_UNION_ID ? "京东 CPS 归因参数可写入履约链接。" : "当前使用搜索跳转链接。",
    },
    {
      provider: "taobao",
      label: "淘宝联盟",
      category: "fulfillment",
      mode: env.TAOBAO_PID ? "configured" : "search-link",
      detail: env.TAOBAO_PID ? "淘宝 PID 可写入履约链接。" : "当前使用搜索跳转链接。",
    },
    {
      provider: "meituan",
      label: "美团本地生活",
      category: "fulfillment",
      mode: env.MEITUAN_CPS_ID ? "configured" : "search-link",
      detail: env.MEITUAN_CPS_ID ? "美团 CPS ID 可写入履约链接。" : "MVP 使用搜索跳转，不保存支付凭证。",
    },
    {
      provider: "ctrip",
      label: "携程商旅",
      category: "fulfillment",
      mode: env.CTRIP_AFFILIATE_ID ? "configured" : "search-link",
      detail: env.CTRIP_AFFILIATE_ID ? "携程联盟 ID 可写入履约链接。" : "MVP 使用商旅搜索跳转。",
    },
    {
      provider: "tongcheng",
      label: "同程商旅",
      category: "fulfillment",
      mode: env.TONGCHENG_AFFILIATE_ID ? "configured" : "search-link",
      detail: env.TONGCHENG_AFFILIATE_ID ? "同程联盟 ID 可写入履约链接。" : "MVP 使用商旅搜索跳转。",
    },
  ];
}
