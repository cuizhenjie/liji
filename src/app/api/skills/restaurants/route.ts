import { NextResponse } from "next/server";

// Restaurant recommendation skill
// Provides restaurant recommendations based on location, party size, budget, and dietary restrictions

interface RestaurantRecommendRequest {
  city?: string;
  district?: string;
  partySize: number;
  budget: number;
  cuisine?: string;
  dietaryRestrictions?: string[];
  occasion?: string;
  ambiance?: "casual" | "business" | "romantic" | "family";
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceRange: { min: number; max: number; avgPerPerson: number };
  rating: number;
  reviewCount: number;
  address: string;
  district: string;
  tags: string[];
  features: string[];
  suitableFor: string[];
  phone?: string;
  bookingUrl?: string;
  imageUrl?: string;
  reason: string;
}

// Preset restaurant database (demo data)
const presetRestaurants: Restaurant[] = [
  {
    id: "rest-001",
    name: "京雅堂",
    cuisine: "粤菜",
    priceRange: { min: 300, max: 800, avgPerPerson: 500 },
    rating: 4.8,
    reviewCount: 1200,
    address: "东城区王府井大街138号",
    district: "东城区",
    tags: ["米其林", "高端", "商务"],
    features: ["包间", "停车场", "可带酒水"],
    suitableFor: ["business", "romantic"],
    phone: "010-6512xxxx",
    bookingUrl: "https://meituan.com",
    reason: "米其林一星，环境优雅，适合高端商务宴请",
  },
  {
    id: "rest-002",
    name: "大董(王府井店)",
    cuisine: "烤鸭",
    priceRange: { min: 200, max: 500, avgPerPerson: 350 },
    rating: 4.7,
    reviewCount: 3500,
    address: "东城区王府井大街219号",
    district: "东城区",
    tags: ["老字号", "北京特色", "商务"],
    features: ["包间", "停车场", "WiFi"],
    suitableFor: ["business", "family"],
    phone: "010-6522xxxx",
    bookingUrl: "https://meituan.com",
    reason: "正宗北京烤鸭，适合招待外地客户",
  },
  {
    id: "rest-003",
    name: "海底捞(望京店)",
    cuisine: "火锅",
    priceRange: { min: 100, max: 200, avgPerPerson: 150 },
    rating: 4.5,
    reviewCount: 8000,
    address: "朝阳区望京街9号",
    district: "朝阳区",
    tags: ["连锁", "服务好评", "聚餐"],
    features: ["美甲", "变脸", "停车场"],
    suitableFor: ["casual", "family"],
    phone: "010-6478xxxx",
    bookingUrl: "https://meituan.com",
    reason: "服务一流，适合家庭聚餐和朋友聚会",
  },
  {
    id: "rest-004",
    name: "四季民福(故宫店)",
    cuisine: "烤鸭",
    priceRange: { min: 150, max: 300, avgPerPerson: 200 },
    rating: 4.6,
    reviewCount: 5000,
    address: "东城区南池子大街11号",
    district: "东城区",
    tags: ["景观位", "北京特色", "排队"],
    features: ["景观位", "停车场"],
    suitableFor: ["family", "casual"],
    phone: "010-6512xxxx",
    bookingUrl: "https://meituan.com",
    reason: "故宫旁，景观位可看角楼，适合家庭聚餐",
  },
  {
    id: "rest-005",
    name: "TRB Hutong",
    cuisine: "法餐",
    priceRange: { min: 500, max: 1500, avgPerPerson: 1000 },
    rating: 4.9,
    reviewCount: 800,
    address: "东城区沙滩北街嵩祝寺23号",
    district: "东城区",
    tags: ["高端", "浪漫", "寺庙改造"],
    features: ["包间", "花园", "停车场"],
    suitableFor: ["romantic", "business"],
    phone: "010-6400xxxx",
    bookingUrl: "https://dianping.com",
    reason: "古寺改造的法餐厅，环境绝美，适合重要场合",
  },
  {
    id: "rest-006",
    name: "外婆家(西湖店)",
    cuisine: "浙菜",
    priceRange: { min: 60, max: 120, avgPerPerson: 80 },
    rating: 4.4,
    reviewCount: 12000,
    address: "杭州市西湖区湖滨路3号",
    district: "西湖区",
    tags: ["连锁", "性价比", "排队"],
    features: ["WiFi", "停车场"],
    suitableFor: ["casual", "family"],
    phone: "0571-8706xxxx",
    bookingUrl: "https://meituan.com",
    reason: "高性价比浙菜，适合家庭日常聚餐",
  },
  {
    id: "rest-007",
    name: "鼎泰丰",
    cuisine: "小笼包",
    priceRange: { min: 150, max: 300, avgPerPerson: 200 },
    rating: 4.7,
    reviewCount: 6000,
    address: "朝阳区三里屯路19号",
    district: "朝阳区",
    tags: ["连锁", "台湾", "精致"],
    features: ["WiFi", "停车场"],
    suitableFor: ["casual", "business", "family"],
    phone: "010-6417xxxx",
    bookingUrl: "https://meituan.com",
    reason: "精致小笼包，品质稳定，适合各类聚餐",
  },
  {
    id: "rest-008",
    name: "全聚德(前门店)",
    cuisine: "烤鸭",
    priceRange: { min: 150, max: 350, avgPerPerson: 250 },
    rating: 4.3,
    reviewCount: 15000,
    address: "东城区前门大街30号",
    district: "东城区",
    tags: ["老字号", "北京特色", "游客"],
    features: ["包间", "停车场"],
    suitableFor: ["business", "family"],
    phone: "010-6701xxxx",
    bookingUrl: "https://meituan.com",
    reason: "百年老字号，正宗挂炉烤鸭",
  },
];

// GET /api/skills/restaurants - Get restaurant recommendations
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const city = searchParams.get("city") || "北京";
  const district = searchParams.get("district");
  const partySize = parseInt(searchParams.get("partySize") || "4", 10);
  const budget = parseInt(searchParams.get("budget") || "500", 10);
  const cuisine = searchParams.get("cuisine");
  const occasion = searchParams.get("occasion");
  const ambiance = searchParams.get("ambiance") as "casual" | "business" | "romantic" | "family" | undefined;

  let filtered = [...presetRestaurants];

  // Filter by district
  if (district) {
    filtered = filtered.filter((r) => r.district === district);
  }

  // Filter by budget (avg per person * party size)
  const totalBudget = budget;
  filtered = filtered.filter((r) => r.priceRange.avgPerPerson * partySize <= totalBudget * 1.5);

  // Filter by cuisine
  if (cuisine) {
    filtered = filtered.filter((r) => r.cuisine.includes(cuisine));
  }

  // Filter by occasion/ambiance
  if (ambiance) {
    filtered = filtered.filter((r) => r.suitableFor.includes(ambiance));
  } else if (occasion) {
    const ambianceMap: Record<string, string> = {
      birthday: "family",
      business: "business",
      romantic: "romantic",
      family: "family",
      casual: "casual",
    };
    const mappedAmbiance = ambianceMap[occasion] || "casual";
    filtered = filtered.filter((r) => r.suitableFor.includes(mappedAmbiance));
  }

  // Sort by rating
  filtered.sort((a, b) => b.rating - a.rating);

  // Limit to top 5
  const results = filtered.slice(0, 5);

  return NextResponse.json({
    ok: true,
    count: results.length,
    city,
    partySize,
    budget,
    restaurants: results,
  });
}

// POST /api/skills/restaurants - Advanced restaurant recommendation with preferences
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RestaurantRecommendRequest;

    if (!body.partySize || !body.budget) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: partySize, budget" },
        { status: 400 }
      );
    }

    let filtered = [...presetRestaurants];

    // Apply filters
    if (body.district) {
      filtered = filtered.filter((r) => r.district === body.district);
    }

    // Budget filter
    filtered = filtered.filter((r) => r.priceRange.avgPerPerson * body.partySize <= body.budget * 1.5);

    // Cuisine filter
    if (body.cuisine) {
      filtered = filtered.filter((r) => r.cuisine.includes(body.cuisine!));
    }

    // Ambiance filter
    if (body.ambiance) {
      filtered = filtered.filter((r) => r.suitableFor.includes(body.ambiance!));
    }

    // Dietary restrictions filter (simplified)
    if (body.dietaryRestrictions?.length) {
      // In production, this would filter by actual dietary options
      // For demo, just return all restaurants
    }

    // Sort by rating and suitability
    filtered.sort((a, b) => {
      // Prioritize by occasion match
      if (body.occasion) {
        const aMatch = a.suitableFor.includes(body.occasion) ? 1 : 0;
        const bMatch = b.suitableFor.includes(body.occasion) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      return b.rating - a.rating;
    });

    const results = filtered.slice(0, 5);

    return NextResponse.json({
      ok: true,
      count: results.length,
      recommendations: results,
      summary: {
        avgRating: results.reduce((sum, r) => sum + r.rating, 0) / results.length,
        priceRange: {
          min: Math.min(...results.map((r) => r.priceRange.min)),
          max: Math.max(...results.map((r) => r.priceRange.max)),
        },
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
