import { test, expect } from "@playwright/test";

/**
 * E2E Tests for 礼记 (Liji) MVP
 * 5 Core Scenarios as defined in DONGMI-PRODUCT-PLAN.md
 */

// Scenario 1: 女儿生日提醒与推荐
test.describe("场景1: 女儿生日提醒与推荐", () => {
  test("完整流程: 采集 → 解析 → 提醒 → 推荐 → 履约", async ({ request }) => {
    // Step 1: Parse natural language input
    const parseResponse = await request.post("/api/parse-input", {
      data: {
        text: "下周五是女儿5岁生日，预算2000元",
        source: "text",
      },
    });
    expect(parseResponse.ok()).toBeTruthy();
    const parseResult = await parseResponse.json();
    expect(parseResult.ok).toBeTruthy();
    expect(parseResult.events.length).toBeGreaterThan(0);
    expect(parseResult.events[0].title).toContain("生日");

    // Step 2: Get identity templates
    const templatesResponse = await request.get("/api/templates/identity");
    expect(templatesResponse.ok()).toBeTruthy();
    const templatesResult = await templatesResponse.json();
    expect(templatesResult.ok).toBeTruthy();
    expect(templatesResult.templates.length).toBeGreaterThan(0);

    // Step 3: Get gift recommendations
    const recommendResponse = await request.post("/api/skills/recommend", {
      data: {
        contactName: "女儿",
        occasion: "birthday",
        budget: 2000,
        identityTemplateId: "identity-family-child",
      },
    });
    expect(recommendResponse.ok()).toBeTruthy();
    const recommendResult = await recommendResponse.json();
    expect(recommendResult.ok).toBeTruthy();
    expect(recommendResult.recommendations.length).toBeGreaterThan(0);
    expect(recommendResult.greeting).toBeTruthy();

    // Step 4: Check compliance (should pass for family)
    expect(recommendResult.compliance.passed).toBeTruthy();
  });
});

// Scenario 2: 客户宴请安排
test.describe("场景2: 客户宴请安排", () => {
  test("完整流程: 餐厅推荐 → 合规检查 → 日程安排", async ({ request }) => {
    // Step 1: Get restaurant recommendations
    const restaurantResponse = await request.get(
      "/api/skills/restaurants?partySize=6&budget=3000&ambiance=business"
    );
    expect(restaurantResponse.ok()).toBeTruthy();
    const restaurantResult = await restaurantResponse.json();
    expect(restaurantResult.ok).toBeTruthy();
    expect(restaurantResult.restaurants.length).toBeGreaterThan(0);

    // Step 2: Get recommendations with business identity
    const recommendResponse = await request.post("/api/skills/recommend", {
      data: {
        contactName: "张总",
        contactTags: ["重要客户"],
        occasion: "dining",
        budget: 3000,
        identityTemplateId: "identity-private-client",
      },
    });
    expect(recommendResponse.ok()).toBeTruthy();
    const recommendResult = await recommendResponse.json();
    expect(recommendResult.ok).toBeTruthy();

    // Step 3: Verify compliance check for business
    expect(recommendResult.compliance).toBeTruthy();
  });
});

// Scenario 3: 节日问候与礼品推荐
test.describe("场景3: 节日问候与礼品推荐", () => {
  test("完整流程: 节日模板 → 礼品推荐 → 问候语生成", async ({ request }) => {
    // Step 1: Get upcoming festivals
    const festivalResponse = await request.get("/api/templates/festival?upcoming=true");
    expect(festivalResponse.ok()).toBeTruthy();
    const festivalResult = await festivalResponse.json();
    expect(festivalResult.ok).toBeTruthy();
    expect(festivalResult.festivals.length).toBeGreaterThan(0);

    // Step 2: Get gift templates
    const giftResponse = await request.get("/api/templates/gift?occasion=festival");
    expect(giftResponse.ok()).toBeTruthy();
    const giftResult = await giftResponse.json();
    expect(giftResult.ok).toBeTruthy();
    expect(giftResult.templates.length).toBeGreaterThan(0);

    // Step 3: Get scenario template for festival
    const scenarioResponse = await request.get("/api/templates/scenario?category=festival");
    expect(scenarioResponse.ok()).toBeTruthy();
    const scenarioResult = await scenarioResponse.json();
    expect(scenarioResult.ok).toBeTruthy();

    // Step 4: Get recommendations for festival
    const recommendResponse = await request.post("/api/skills/recommend", {
      data: {
        contactName: "李总",
        contactTags: ["国企高管"],
        occasion: "festival",
        budget: 500,
        identityTemplateId: "identity-soe-executive",
      },
    });
    expect(recommendResponse.ok()).toBeTruthy();
    const recommendResult = await recommendResponse.json();
    expect(recommendResult.ok).toBeTruthy();
    expect(recommendResult.greeting).toBeTruthy();
  });
});

// Scenario 4: 长辈健康关怀
test.describe("场景4: 长辈健康关怀", () => {
  test("完整流程: 健康场景 → 体检推荐 → 提醒设置", async ({ request }) => {
    // Step 1: Get health care scenario
    const scenarioResponse = await request.get("/api/templates/scenario?category=health");
    expect(scenarioResponse.ok()).toBeTruthy();
    const scenarioResult = await scenarioResponse.json();
    expect(scenarioResult.ok).toBeTruthy();
    expect(scenarioResult.templates.length).toBeGreaterThan(0);

    // Step 2: Get gift recommendations for health
    const giftResponse = await request.get("/api/templates/gift?identity=family&category=健康");
    expect(giftResponse.ok()).toBeTruthy();
    const giftResult = await giftResponse.json();
    expect(giftResult.ok).toBeTruthy();

    // Step 3: Get recommendations for elder care
    const recommendResponse = await request.post("/api/skills/recommend", {
      data: {
        contactName: "妈妈",
        contactTags: ["家庭长辈"],
        occasion: "get-well",
        budget: 2000,
        identityTemplateId: "identity-family-elder",
      },
    });
    expect(recommendResponse.ok()).toBeTruthy();
    const recommendResult = await recommendResponse.json();
    expect(recommendResult.ok).toBeTruthy();
    expect(recommendResult.compliance.passed).toBeTruthy(); // No compliance limit for family
  });
});

// Scenario 5: 运营台生产巡检
test.describe("场景5: 运营台生产巡检", () => {
  test("完整流程: 生产巡检 → 状态检查 → 告警处理", async ({ request }) => {
    // Step 1: Run production check
    const prodCheckResponse = await request.get("/api/ops/production-check");
    expect(prodCheckResponse.ok()).toBeTruthy();
    const prodCheckResult = await prodCheckResponse.json();
    expect(prodCheckResult).toHaveProperty("ok");
    expect(prodCheckResult).toHaveProperty("checks");

    // Step 2: Check health endpoint
    const healthResponse = await request.get("/api/health");
    expect(healthResponse.ok()).toBeTruthy();
    const healthResult = await healthResponse.json();
    expect(healthResult).toHaveProperty("status");

    // Step 3: Check integrations status
    const integrationsResponse = await request.get("/api/integrations");
    expect(integrationsResponse.ok()).toBeTruthy();
    const integrationsResult = await integrationsResponse.json();
    expect(integrationsResult).toHaveProperty("integrations");

    // Step 4: Check billing entitlements
    const billingResponse = await request.get("/api/billing/entitlements");
    expect(billingResponse.ok()).toBeTruthy();
    const billingResult = await billingResponse.json();
    expect(billingResult).toHaveProperty("plan");
  });
});

// Additional: LLM Streaming API Test
test.describe("LLM 流式推荐 API", () => {
  test("SSE 流式返回推荐结果", async ({ request }) => {
    const response = await request.post("/api/ai/recommend", {
      data: {
        contactName: "王先生",
        occasion: "birthday",
        budget: 1000,
      },
    });
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("text/event-stream");

    // Read the stream
    const text = await response.text();
    expect(text).toContain("data:");
    expect(text).toContain("[DONE]");
  });
});

// Additional: Template CRUD Operations
test.describe("模板 CRUD 操作", () => {
  test("创建自定义礼品模板", async ({ request }) => {
    const response = await request.post("/api/templates/gift", {
      data: {
        name: "测试礼品",
        category: "测试",
        priceRange: { min: 100, max: 500, typical: 300 },
        providers: ["京东"],
        suitableIdentities: ["family"],
        suitableOccasions: ["birthday"],
        tags: ["测试"],
      },
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.ok).toBeTruthy();
    expect(result.template.name).toBe("测试礼品");
  });

  test("创建自定义场景模板", async ({ request }) => {
    const response = await request.post("/api/templates/scenario", {
      data: {
        name: "测试场景",
        description: "测试场景描述",
        category: "birthday",
        applicableIdentities: ["family"],
        budgetGuidance: { min: 200, max: 1000, typical: 500, currency: "CNY" },
      },
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.ok).toBeTruthy();
    expect(result.template.name).toBe("测试场景");
  });
});
