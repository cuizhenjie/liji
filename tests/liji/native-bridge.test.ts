import { describe, expect, it } from "vitest";

import {
  getNativeBridgeCapabilities,
  validateNativeBridgePayload,
} from "../../src/lib/liji/native-bridge";

describe("native capture bridge", () => {
  it("reports native shell dependent capabilities", () => {
    const capabilities = getNativeBridgeCapabilities({
      LIJI_NATIVE_BRIDGE_SECRET: "native-secret",
      LIJI_CAPTURE_ASR_PROVIDER: "aliyun-asr",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "vapid",
    });

    expect(capabilities.find((item) => item.id === "sms_read")?.status).toBe("ready");
    expect(capabilities.find((item) => item.id === "long_press_recording")?.status).toBe("ready");
    expect(capabilities.find((item) => item.id === "pwa_system_fallback")?.status).toBe("ready");
  });

  it("validates upload progress and missing payload fields", () => {
    expect(validateNativeBridgePayload({
      source: "file_upload",
      fileName: "receipt.png",
      uploadedBytes: 512,
      totalBytes: 1024,
    })).toMatchObject({
      accepted: true,
      progressPercent: 50,
      targetEndpoint: "/api/capture/extract",
    });
    expect(validateNativeBridgePayload({ source: "sms" }).accepted).toBe(false);
  });
});
