import { NextResponse } from "next/server";

// Scenario template type
interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: "birthday" | "festival" | "business" | "family" | "health" | "travel" | "dining";
  
  // Applicable identity categories
  applicableIdentities: string[];
  
  // Default budget guidance
  budgetGuidance: {
    min: number;
    max: number;
    typical: number;
    currency: string;
  };
  
  // Recommended actions
  recommendedActions: {
    type: "gift" | "dining" | "greeting" | "activity" | "travel";
    label: string;
    priority: "required" | "recommended" | "optional";
    estimatedCost?: number;
  }[];
  
  // Gift suggestions
  giftSuggestions: {
    category: string;
    label: string;
    priceRange: [number, number];
    providers: string[];
    reason: string;
  }[];
  
  // Greeting templates
  greetingTemplates: string[];
  
  // Timeline guidance
  timelineGuidance: {
    preparationDays: number;
    reminderDays: number[];
  };
  
  // Compliance notes
  complianceNotes?: string;
  
  // Tags for filtering
  tags: string[];
}

// Preset scenario templates
const presetScenarioTemplates: ScenarioTemplate[] = [
  {
    id: "scenario-business-birthday",
    name: "客户生日宴请",
    description: "为重要客户安排生日宴请，兼顾商务礼仪与合规要求",
    category: "business",
    applicableIdentities: ["business"],
    budgetGuidance: { min: 500, max: 2000, typical: 1000, currency: "CNY" },
    recommendedActions: [
      { type: "greeting", label: "发送生日祝福", priority: "required" },
      { type: "gift", label: "准备商务礼品", priority: "required", estimatedCost: 300 },
      { type: "dining", label: "安排生日宴请", priority: "recommended", estimatedCost: 800 },
    ],
    giftSuggestions: [
      { category: "茶叶", label: "高端茶叶礼盒", priceRange: [200, 500], providers: ["京东"], reason: "商务送礼首选，符合合规要求" },
      { category: "酒水", label: "进口红酒", priceRange: [300, 600], providers: ["京东", "天猫"], reason: "适合商务宴请场合" },
      { category: "文化", label: "精品书籍/文创", priceRange: [100, 300], providers: ["京东", "当当"], reason: "体现品味，不触合规红线" },
    ],
    greetingTemplates: [
      "X总，祝您生日快乐！事业蒸蒸日上，身体健康。",
      "尊敬的X总，值此生日之际，谨致以最诚挚的祝福。",
    ],
    timelineGuidance: { preparationDays: 7, reminderDays: [7, 3, 1] },
    complianceNotes: "商务宴请需符合公司合规政策，礼品不超过规定限额。",
    tags: ["商务", "生日", "宴请", "客户"],
  },
  {
    id: "scenario-family-birthday",
    name: "家庭生日庆祝",
    description: "为家庭成员安排温馨的生日庆祝活动",
    category: "family",
    applicableIdentities: ["family"],
    budgetGuidance: { min: 200, max: 2000, typical: 800, currency: "CNY" },
    recommendedActions: [
      { type: "greeting", label: "准备生日祝福", priority: "required" },
      { type: "gift", label: "挑选生日礼物", priority: "required", estimatedCost: 300 },
      { type: "activity", label: "安排庆祝活动", priority: "recommended", estimatedCost: 500 },
    ],
    giftSuggestions: [
      { category: "蛋糕", label: "定制生日蛋糕", priceRange: [150, 400], providers: ["美团", "饿了么"], reason: "生日必备，可定制个性化款式" },
      { category: "鲜花", label: "鲜花花束", priceRange: [100, 300], providers: ["美团", "花加"], reason: "增添仪式感" },
      { category: "体验", label: "体验类礼物", priceRange: [200, 800], providers: ["美团", "大众点评"], reason: "创造美好回忆" },
    ],
    greetingTemplates: [
      "亲爱的，生日快乐！愿你每一天都开心快乐。",
      "祝我最爱的XX生日快乐，永远健康幸福！",
    ],
    timelineGuidance: { preparationDays: 5, reminderDays: [5, 3, 1] },
    tags: ["家庭", "生日", "庆祝", "温馨"],
  },
  {
    id: "scenario-spring-festival",
    name: "春节送礼拜访",
    description: "春节期间走亲访友、客户拜访的完整安排",
    category: "festival",
    applicableIdentities: ["business", "family", "social"],
    budgetGuidance: { min: 200, max: 3000, typical: 1000, currency: "CNY" },
    recommendedActions: [
      { type: "greeting", label: "发送新年祝福", priority: "required" },
      { type: "gift", label: "准备年货礼品", priority: "required", estimatedCost: 500 },
      { type: "dining", label: "安排年夜饭/聚餐", priority: "recommended", estimatedCost: 1000 },
    ],
    giftSuggestions: [
      { category: "年货", label: "年货礼盒", priceRange: [200, 600], providers: ["京东", "淘宝"], reason: "春节传统礼品" },
      { category: "酒水", label: "白酒/红酒", priceRange: [300, 1000], providers: ["京东"], reason: "节日聚餐必备" },
      { category: "健康", label: "保健品", priceRange: [300, 1000], providers: ["京东"], reason: "适合长辈，表达关怀" },
    ],
    greetingTemplates: [
      "新春快乐！祝您和家人身体健康、万事如意。",
      "给您拜年了！新的一年事业顺利、阖家幸福。",
      "恭祝新春大吉，财源广进！",
    ],
    timelineGuidance: { preparationDays: 14, reminderDays: [14, 7, 3, 1] },
    complianceNotes: "春节期间商务送礼需注意合规限额，建议不超过日常标准的150%。",
    tags: ["春节", "节日", "送礼", "拜访"],
  },
  {
    id: "scenario-health-care",
    name: "长辈健康关怀",
    description: "为长辈安排健康关怀计划，包括体检、保健品等",
    category: "health",
    applicableIdentities: ["family"],
    budgetGuidance: { min: 500, max: 5000, typical: 2000, currency: "CNY" },
    recommendedActions: [
      { type: "activity", label: "预约体检套餐", priority: "required", estimatedCost: 1000 },
      { type: "gift", label: "保健品/营养品", priority: "recommended", estimatedCost: 500 },
      { type: "greeting", label: "定期电话问候", priority: "required" },
    ],
    giftSuggestions: [
      { category: "体检", label: "全面体检套餐", priceRange: [800, 3000], providers: ["美团", "阿里健康"], reason: "关注长辈健康" },
      { category: "保健品", label: "钙片/维生素", priceRange: [100, 300], providers: ["京东"], reason: "日常营养补充" },
      { category: "器械", label: "血压计/血糖仪", priceRange: [200, 500], providers: ["京东"], reason: "居家健康监测" },
    ],
    greetingTemplates: [
      "XX，最近身体怎么样？记得按时吃药，多休息。",
      "天气转凉了，注意保暖，有空我回去看您。",
    ],
    timelineGuidance: { preparationDays: 7, reminderDays: [7, 3, 1] },
    tags: ["健康", "长辈", "关怀", "体检"],
  },
  {
    id: "scenario-child-birthday",
    name: "孩子生日派对",
    description: "为孩子安排有趣的生日庆祝活动",
    category: "family",
    applicableIdentities: ["family"],
    budgetGuidance: { min: 500, max: 5000, typical: 2000, currency: "CNY" },
    recommendedActions: [
      { type: "gift", label: "准备生日礼物", priority: "required", estimatedCost: 300 },
      { type: "activity", label: "安排生日派对", priority: "recommended", estimatedCost: 1000 },
      { type: "dining", label: "预订亲子餐厅", priority: "optional", estimatedCost: 500 },
    ],
    giftSuggestions: [
      { category: "玩具", label: "益智玩具/乐高", priceRange: [100, 500], providers: ["京东", "淘宝"], reason: "开发智力，孩子喜欢" },
      { category: "教育", label: "绘本/课程", priceRange: [100, 500], providers: ["京东", "当当"], reason: "寓教于乐" },
      { category: "运动", label: "运动装备", priceRange: [100, 400], providers: ["京东", "迪卡侬"], reason: "鼓励运动，健康成长" },
    ],
    greetingTemplates: [
      "宝贝，生日快乐！愿你健康快乐成长。",
      "祝我们的小公主/小王子生日快乐，天天开心！",
    ],
    timelineGuidance: { preparationDays: 7, reminderDays: [7, 3, 1] },
    tags: ["孩子", "生日", "派对", "亲子"],
  },
];

// GET /api/templates/scenario - List scenario templates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const identity = searchParams.get("identity");
  const tag = searchParams.get("tag");

  let filtered = [...presetScenarioTemplates];

  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (identity) {
    filtered = filtered.filter((t) => t.applicableIdentities.includes(identity));
  }
  if (tag) {
    filtered = filtered.filter((t) => t.tags.includes(tag));
  }

  return NextResponse.json({
    ok: true,
    count: filtered.length,
    templates: filtered,
  });
}

// POST /api/templates/scenario - Create custom scenario template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, category, budgetGuidance, recommendedActions, giftSuggestions } = body;

    if (!name || !category) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: name, category" },
        { status: 400 }
      );
    }

    const newTemplate: ScenarioTemplate = {
      id: `scenario-custom-${Date.now()}`,
      name,
      description: description || "",
      category,
      applicableIdentities: body.applicableIdentities || [],
      budgetGuidance: budgetGuidance || { min: 0, max: 0, typical: 0, currency: "CNY" },
      recommendedActions: recommendedActions || [],
      giftSuggestions: giftSuggestions || [],
      greetingTemplates: body.greetingTemplates || [],
      timelineGuidance: body.timelineGuidance || { preparationDays: 7, reminderDays: [7, 3, 1] },
      complianceNotes: body.complianceNotes,
      tags: body.tags || [],
    };

    return NextResponse.json({
      ok: true,
      template: newTemplate,
      message: "Scenario template created (demo mode - not persisted)",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
