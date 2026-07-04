export type NativeBridgeCapabilityId =
  | "sms_read"
  | "long_press_recording"
  | "attachment_upload_progress"
  | "pwa_system_fallback";

export type NativeBridgeCapability = {
  id: NativeBridgeCapabilityId;
  label: string;
  status: "ready" | "needs_native_shell" | "fallback";
  detail: string;
};

export type NativeBridgePayload = {
  source: "sms" | "recording" | "file_upload";
  text?: string;
  fileName?: string;
  mimeType?: string;
  totalBytes?: number;
  uploadedBytes?: number;
  durationSeconds?: number;
};

export type NativeBridgeValidation = {
  accepted: boolean;
  targetEndpoint: "/api/capture/sms-import" | "/api/capture/extract";
  progressPercent: number;
  warnings: string[];
};

function progressPercent(uploaded?: number, total?: number) {
  if (!uploaded || !total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((uploaded / total) * 100)));
}

export function getNativeBridgeCapabilities(
  env: Record<string, string | undefined> = process.env
): NativeBridgeCapability[] {
  const hasNativeBridgeSecret = Boolean(env.LIJI_NATIVE_BRIDGE_SECRET);
  const hasCaptureProvider = Boolean(env.LIJI_CAPTURE_OCR_PROVIDER || env.LIJI_CAPTURE_ASR_PROVIDER);

  return [
    {
      id: "sms_read",
      label: "移动端短信读取",
      status: hasNativeBridgeSecret ? "ready" : "needs_native_shell",
      detail: hasNativeBridgeSecret
        ? "原生壳可携带签名向短信账单导入接口投递。"
        : "Web/PWA 无法直接读取短信，需要原生壳或短信 webhook。",
    },
    {
      id: "long_press_recording",
      label: "长按录音采集",
      status: hasNativeBridgeSecret && hasCaptureProvider ? "ready" : "needs_native_shell",
      detail: hasCaptureProvider
        ? "语音文件可进入 ASR 队列，仍需原生侧录音入口。"
        : "缺少 ASR provider 时录音会进入人工补录。",
    },
    {
      id: "attachment_upload_progress",
      label: "附件上传进度",
      status: "ready",
      detail: "上传 payload 可携带 totalBytes/uploadedBytes，前端可展示百分比并进入确认中心。",
    },
    {
      id: "pwa_system_fallback",
      label: "PWA 系统级降级",
      status: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "ready" : "fallback",
      detail: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ? "Web Push 可作为系统提醒降级通道。"
        : "未配置 VAPID 时降级为站内提醒和短信/语音队列。",
    },
  ];
}

export function validateNativeBridgePayload(payload: NativeBridgePayload): NativeBridgeValidation {
  const warnings: string[] = [];
  const targetEndpoint = payload.source === "sms"
    ? "/api/capture/sms-import" as const
    : "/api/capture/extract" as const;

  if (payload.source === "sms" && !payload.text?.trim()) {
    warnings.push("短信读取 payload 缺少 text，将无法解析账单。");
  }

  if (payload.source === "recording") {
    if (!payload.fileName && !payload.text?.trim()) {
      warnings.push("录音 payload 缺少文件名或转写文本。");
    }
    if (payload.durationSeconds && payload.durationSeconds > 180) {
      warnings.push("录音超过 180 秒，建议原生端先分段上传。");
    }
  }

  if (payload.source === "file_upload" && !payload.fileName) {
    warnings.push("附件上传 payload 缺少 fileName。");
  }

  return {
    accepted: warnings.length === 0,
    targetEndpoint,
    progressPercent: progressPercent(payload.uploadedBytes, payload.totalBytes),
    warnings,
  };
}
