import { describe, expect, it } from "vitest";

import { demoWorkspace } from "../../src/lib/liji/sample-data";
import { runServiceSmokeSuite } from "../../src/lib/liji/service-smoke";

describe("service smoke suite", () => {
  it("runs dry-run checks without calling real providers", () => {
    const suite = runServiceSmokeSuite({
      data: demoWorkspace,
      iterations: 5,
      env: {
        LIJI_CAPTURE_PROVIDER_ENDPOINT: "https://provider.example.test/extract",
        LIJI_CAPTURE_OCR_PROVIDER: "aliyun-ocr",
        MEITUAN_ORDER_API_ENDPOINT: "https://provider.example.test/orders",
        MEITUAN_ORDER_API_SECRET: "secret",
      },
      now: new Date("2026-07-04T10:00:00.000Z"),
    });

    expect(suite.mode).toBe("dry_run");
    expect(suite.iterations).toBe(5);
    expect(suite.checks.find((item) => item.id === "notification-codebook-contract")?.status).toBe("pass");
    expect(suite.checks.find((item) => item.id === "fulfillment-provider-contract")?.status).toBe("pass");
  });
});
