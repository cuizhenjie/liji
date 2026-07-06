import { NextResponse } from "next/server";

// LLM streaming recommendation API
// This endpoint uses Server-Sent Events (SSE) to stream recommendation results

interface RecommendRequest {
  contactName: string;
  contactTags?: string[];
  occasion: string;
  budget: number;
  identityTemplateId?: string;
  preferences?: {
    giftCategories?: string[];
    avoidCategories?: string[];
    dietaryRestrictions?: string[];
  };
  location?: {
    city?: string;
    district?: string;
  };
}

interface RecommendationChunk {
  type: "thinking" | "compliance" | "suggestion" | "greeting" | "action" | "complete" | "error";
  content: string;
  data?: Record<string, unknown>;
}

// Simulate LLM streaming response
// In production, this would call an actual LLM API (OpenAI, Claude, etc.)
async function* generateRecommendationStream(req: RecommendRequest): AsyncGenerator<RecommendationChunk> {
  // Step 1: Thinking phase
  yield {
    type: "thinking",
    content: `正在为 ${req.contactName} 的${formatOccasion(req.occasion)}分析最佳方案...`,
  };

  await delay(500);

  // Step 2: Compliance check
  const isBusiness = req.contactTags?.some((t) => ["国企高管", "重要客户", "上市公司高管"].includes(t)) ?? false;
  const complianceLimit = isBusiness ? 200 : req.budget;

  yield {
    type: "compliance",
    content: isBusiness
      ? `检测到商务关系，合规限额 ¥200。已调整推荐方案。`
      : `无商务合规限制，预算 ¥${req.budget}。`,
    data: {
      isBusiness,
      limit: complianceLimit,
      passed: req.budget <= complianceLimit || !isBusiness,
    },
  };

  await delay(500);

  // Step 3: Generate suggestions based on occasion and identity
  const suggestions = generateSuggestions(req, isBusiness);

  for (let i = 0; i < suggestions.length; i++) {
    yield {
      type: "suggestion",
      content: `推荐方案 ${i + 1}: ${suggestions[i].label}`,
      data: suggestions[i],
    };
    await delay(300);
  }

  // Step 4: Generate greeting
  const greeting = generateGreeting(req.contactName, req.occasion, req.contactTags);
  yield {
    type: "greeting",
    content: greeting,
    data: { template: greeting },
  };

  await delay(300);

  // Step 5: Suggest actions
  const actions = generateActions(req.occasion);
  for (const action of actions) {
    yield {
      type: "action",
      content: action,
    };
    await delay(200);
  }

  // Step 6: Complete
  yield {
    type: "complete",
    content: "推荐方案生成完成。祝一切顺利！",
    data: {
      totalSuggestions: suggestions.length,
      estimatedBudget: suggestions.reduce((sum, s) => sum + (s.priceRange?.[0] || 0), 0),
    },
  };
}

function formatOccasion(occasion: string): string {
  const map: Record<string, string> = {
    birthday: "生日",
    festival: "节日",
    anniversary: "纪念日",
    housewarming: "乔迁",
    graduation: "毕业",
    get_well: "康复",
    dining: "宴请",
    default: "活动",
  };
  return map[occasion] || map.default;
}

function generateSuggestions(req: RecommendRequest, isBusiness: boolean) {
  const budget = Math.min(req.budget, isBusiness ? 200 : req.budget);

  const suggestionSets: Record<string, Array<{ label: string; category: string; priceRange: [number, number]; providers: string[]; reason: string; purchaseUrl: string }>> = {
    birthday: [
      { label: "精选茶叶礼盒", category: "茶叶", priceRange: [150, 300], providers: ["京东"], reason: "经典商务礼品，符合合规要求", purchaseUrl: "https://jd.com" },
      { label: "高端笔记本套装", category: "办公", priceRange: [100, 200], providers: ["京东"], reason: "实用商务礼品", purchaseUrl: "https://jd.com" },
      { label: "定制蛋糕", category: "蛋糕", priceRange: [200, 400], providers: ["美团"], reason: "生日庆祝必备", purchaseUrl: "https://meituan.com" },
    ],
    festival: [
      { label: "年货礼盒", category: "食品", priceRange: [200, 500], providers: ["京东", "淘宝"], reason: "节日传统礼品", purchaseUrl: "https://jd.com" },
      { label: "进口红酒", category: "酒水", priceRange: [300, 600], providers: ["京东"], reason: "节日聚餐佳选", purchaseUrl: "https://jd.com" },
      { label: "保健品礼盒", category: "健康", priceRange: [300, 800], providers: ["京东"], reason: "关怀长辈健康", purchaseUrl: "https://jd.com" },
    ],
    dining: [
      { label: "高端中餐厅", category: "餐饮", priceRange: [500, 1500], providers: ["美团", "大众点评"], reason: "商务宴请首选", purchaseUrl: "https://meituan.com" },
      { label: "特色私房菜", category: "餐饮", priceRange: [300, 800], providers: ["美团"], reason: "私密性好，适合商务", purchaseUrl: "https://meituan.com" },
    ],
    default: [
      { label: "精品茶叶", category: "茶叶", priceRange: [100, 300], providers: ["京东"], reason: "通用礼品，适合各场合", purchaseUrl: "https://jd.com" },
      { label: "鲜花花束", category: "鲜花", priceRange: [150, 400], providers: ["美团"], reason: "表达心意", purchaseUrl: "https://meituan.com" },
    ],
  };

  const suggestions = suggestionSets[req.occasion] || suggestionSets.default;
  return suggestions.filter((s) => s.priceRange[0] <= budget * 1.5);
}

function generateGreeting(name: string, occasion: string, tags?: string[]): string {
  const isElder = tags?.includes("长辈") || tags?.includes("家庭长辈");
  const isBusiness = tags?.some((t) => ["国企高管", "重要客户"].includes(t));

  if (occasion === "birthday") {
    if (isElder) return `祝${name}生日快乐！身体健康，福寿绵长。`;
    if (isBusiness) return `尊敬的${name}，祝您生日快乐，事业蒸蒸日上。`;
    return `亲爱的${name}，生日快乐！愿你每一天都开心快乐。`;
  }
  if (occasion === "festival") {
    return `值此佳节，祝${name}及家人节日快乐，万事如意！`;
  }
  return `祝${name}一切顺利！`;
}

function generateActions(occasion: string): string[] {
  const actions: Record<string, string[]> = {
    birthday: ["发送生日祝福", "准备礼品", "预订蛋糕", "安排庆祝活动"],
    festival: ["发送节日祝福", "准备年货礼品", "安排聚餐", "拜访亲友"],
    dining: ["预订餐厅", "确认人数和忌口", "准备话题", "安排接送"],
    default: ["发送问候", "准备礼品"],
  };
  return actions[occasion] || actions.default;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/ai/recommend - Streaming recommendation endpoint
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendRequest;

    if (!body.contactName || !body.occasion) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: contactName, occasion" },
        { status: 400 }
      );
    }

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generateRecommendationStream(body)) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorChunk: RecommendationChunk = {
            type: "error",
            content: error instanceof Error ? error.message : "Unknown error",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
