import { NextResponse } from "next/server";

// Gift template type
interface GiftTemplate {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  priceRange: { min: number; max: number; typical: number };
  providers: string[];
  suitableIdentities: string[];
  suitableOccasions: string[];
  tags: string[];
  description?: string;
  imageUrl?: string;
  purchaseUrl?: string;
  isPremium?: boolean;
}

// Preset gift templates
const presetGiftTemplates: GiftTemplate[] = [
  {
    id: "gift-tea-set",
    name: "茶叶礼盒",
    category: "食品",
    subcategory: "茶叶",
    priceRange: { min: 100, max: 500, typical: 300 },
    providers: ["京东", "淘宝"],
    suitableIdentities: ["business", "social"],
    suitableOccasions: ["birthday", "festival", "housewarming"],
    tags: ["传统", "健康", "商务"],
    description: "精选名茶礼盒，适合商务送礼和长辈馈赠",
    isPremium: false,
  },
  {
    id: "gift-health-supplement",
    name: "保健品礼盒",
    category: "健康",
    subcategory: "保健品",
    priceRange: { min: 200, max: 1000, typical: 500 },
    providers: ["京东", "美团"],
    suitableIdentities: ["family"],
    suitableOccasions: ["birthday", "festival", "get-well"],
    tags: ["健康", "关怀", "长辈"],
    description: "高品质保健品，适合长辈健康关怀",
    isPremium: false,
  },
  {
    id: "gift-cake",
    name: "生日蛋糕",
    category: "食品",
    subcategory: "蛋糕",
    priceRange: { min: 150, max: 500, typical: 280 },
    providers: ["美团", "饿了么"],
    suitableIdentities: ["family", "social"],
    suitableOccasions: ["birthday"],
    tags: ["生日", "庆祝", "甜蜜"],
    description: "精美生日蛋糕，支持同城配送",
    isPremium: false,
  },
  {
    id: "gift-wine",
    name: "红酒礼盒",
    category: "酒水",
    subcategory: "红酒",
    priceRange: { min: 200, max: 800, typical: 400 },
    providers: ["京东", "天猫"],
    suitableIdentities: ["business", "social"],
    suitableOccasions: ["birthday", "festival", "celebration"],
    tags: ["高端", "商务", "庆祝"],
    description: "进口红酒礼盒，适合商务宴请和节日送礼",
    isPremium: true,
  },
  {
    id: "gift-book",
    name: "精品书籍",
    category: "文化",
    subcategory: "书籍",
    priceRange: { min: 50, max: 200, typical: 100 },
    providers: ["京东", "当当"],
    suitableIdentities: ["business", "social", "family"],
    suitableOccasions: ["birthday", "festival", "graduation"],
    tags: ["知识", "文化", "品味"],
    description: "精选好书，适合各年龄段馈赠",
    isPremium: false,
  },
  {
    id: "gift-flower",
    name: "鲜花花束",
    category: "鲜花",
    subcategory: "花束",
    priceRange: { min: 100, max: 500, typical: 200 },
    providers: ["美团", "饿了么", "花加"],
    suitableIdentities: ["social", "family"],
    suitableOccasions: ["birthday", "anniversary", "mothers-day", "valentines"],
    tags: ["浪漫", "美丽", "祝福"],
    description: "精美鲜花花束，支持同城速递",
    isPremium: false,
  },
  {
    id: "gift-experience-spa",
    name: "SPA体验券",
    category: "体验",
    subcategory: "美容养生",
    priceRange: { min: 300, max: 1000, typical: 500 },
    providers: ["美团", "大众点评"],
    suitableIdentities: ["social", "family"],
    suitableOccasions: ["birthday", "anniversary", "mothers-day"],
    tags: ["放松", "享受", "体验"],
    description: "高端SPA体验，适合亲密关系馈赠",
    isPremium: true,
  },
  {
    id: "gift-tech-gadget",
    name: "智能小家电",
    category: "数码",
    subcategory: "小家电",
    priceRange: { min: 200, max: 1000, typical: 500 },
    providers: ["京东", "小米"],
    suitableIdentities: ["family", "social"],
    suitableOccasions: ["birthday", "housewarming", "festival"],
    tags: ["科技", "实用", "现代"],
    description: "智能小家电，提升生活品质",
    isPremium: true,
  },
];

// GET /api/templates/gift - List gift templates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const identity = searchParams.get("identity");
  const occasion = searchParams.get("occasion");
  const maxPrice = searchParams.get("maxPrice");

  let filtered = [...presetGiftTemplates];

  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (identity) {
    filtered = filtered.filter((t) => t.suitableIdentities.includes(identity));
  }
  if (occasion) {
    filtered = filtered.filter((t) => t.suitableOccasions.includes(occasion));
  }
  if (maxPrice) {
    const max = parseInt(maxPrice, 10);
    filtered = filtered.filter((t) => t.priceRange.min <= max);
  }

  return NextResponse.json({
    ok: true,
    count: filtered.length,
    templates: filtered,
  });
}

// POST /api/templates/gift - Create custom gift template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, priceRange, providers, suitableIdentities, suitableOccasions, tags } = body;

    if (!name || !category || !priceRange) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: name, category, priceRange" },
        { status: 400 }
      );
    }

    // In production, this would save to database
    const newTemplate: GiftTemplate = {
      id: `gift-custom-${Date.now()}`,
      name,
      category,
      priceRange: {
        min: priceRange.min || 0,
        max: priceRange.max || 0,
        typical: priceRange.typical || (priceRange.min + priceRange.max) / 2,
      },
      providers: providers || [],
      suitableIdentities: suitableIdentities || [],
      suitableOccasions: suitableOccasions || [],
      tags: tags || [],
      description: body.description,
      imageUrl: body.imageUrl,
      purchaseUrl: body.purchaseUrl,
      isPremium: body.isPremium || false,
    };

    return NextResponse.json({
      ok: true,
      template: newTemplate,
      message: "Gift template created (demo mode - not persisted)",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
