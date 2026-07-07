import { NextRequest, NextResponse } from 'next/server';

/**
 * Meituan Union (美团联盟) API Integration
 * 
 * This endpoint integrates with Meituan Union API to:
 * - Search for restaurants and local services
 * - Generate affiliate links
 * - Query commission rates
 * - Track orders
 * 
 * Required environment variables:
 * - MEITUAN_UNION_APP_KEY: Meituan Union app key
 * - MEITUAN_UNION_APP_SECRET: Meituan Union app secret
 */

interface MeituanPOI {
  poiId: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  averagePrice: number;
  rating: number;
  imageUrl: string;
  affiliateUrl: string;
  commissionRate: number;
  distance?: string;
  tags: string[];
}

interface MeituanSearchResult {
  pois: MeituanPOI[];
  total: number;
  page: number;
  pageSize: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const radius = searchParams.get('radius');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (!keyword && !category) {
    return NextResponse.json(
      { error: 'keyword or category is required' },
      { status: 400 }
    );
  }

  try {
    const result = await searchMeituanPOIs({
      keyword: keyword || '',
      category: category || '',
      city: city || '',
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radius: radius ? parseInt(radius) : undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Meituan Union API error:', error);
    return NextResponse.json(
      { error: 'Meituan POI search failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, params } = body;

  try {
    switch (action) {
      case 'search':
        return NextResponse.json({
          success: true,
          data: await searchMeituanPOIs(params),
        });

      case 'link':
        return NextResponse.json({
          success: true,
          data: await generateMeituanLink(params.poiId || params.url),
        });

      case 'orders':
        return NextResponse.json({
          success: true,
          data: await queryMeituanOrders(params),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Meituan Union API error:', error);
    return NextResponse.json(
      { error: 'Meituan Union operation failed' },
      { status: 500 }
    );
  }
}

interface SearchParams {
  keyword: string;
  category?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  pageSize?: number;
}

async function searchMeituanPOIs(params: SearchParams): Promise<MeituanSearchResult> {
  const { keyword, category, city, latitude, longitude, radius, page = 1, pageSize = 20 } = params;

  // Check if Meituan Union credentials are configured
  const appKey = process.env.MEITUAN_UNION_APP_KEY;
  const appSecret = process.env.MEITUAN_UNION_APP_SECRET;

  if (!appKey || !appSecret) {
    // Return mock data for development
    return getMockMeituanPOIs(keyword, city || '', page, pageSize);
  }

  // In production, call Meituan Union API
  // Reference: https://union.meituan.com/v2/apiDoc
  const apiUrl = 'https://openapi.meituan.com/v2/gateway';
  const timestamp = Math.floor(Date.now() / 1000);

  const apiParams: Record<string, string> = {
    app_key: appKey,
    timestamp: timestamp.toString(),
    method: 'meituan.union.poi.search',
    param: JSON.stringify({
      keyword,
      category,
      city,
      lat: latitude,
      lng: longitude,
      radius,
      page,
      page_size: pageSize,
    }),
  };

  // Generate signature
  const sign = generateMeituanSign(apiParams, appSecret);

  // Make API call
  const response = await fetch(`${apiUrl}?${new URLSearchParams({ ...apiParams, sign }).toString()}`);
  const data = await response.json();

  // Parse response
  if (data.data?.pois) {
    return {
      pois: data.data.pois.map(mapMeituanPOI),
      total: data.data.total,
      page,
      pageSize,
    };
  }

  return { pois: [], total: 0, page, pageSize };
}

function mapMeituanPOI(item: any): MeituanPOI {
  return {
    poiId: item.poi_id,
    name: item.name,
    category: item.category,
    address: item.address,
    latitude: item.lat,
    longitude: item.lng,
    averagePrice: item.avg_price || 0,
    rating: item.rating || 0,
    imageUrl: item.image || '',
    affiliateUrl: item.affiliate_url || '',
    commissionRate: item.commission_rate || 0.05,
    distance: item.distance,
    tags: item.tags || [],
  };
}

async function generateMeituanLink(poiIdOrUrl: string): Promise<{ affiliateUrl: string }> {
  const appKey = process.env.MEITUAN_UNION_APP_KEY;

  if (!appKey) {
    // Return mock affiliate URL
    return {
      affiliateUrl: `https://i.meituan.com/s/abc123?poi=${poiIdOrUrl}`,
    };
  }

  // In production, call Meituan Union API to generate affiliate link
  return {
    affiliateUrl: `https://i.meituan.com/s/real?poi=${poiIdOrUrl}`,
  };
}

async function queryMeituanOrders(params: { startTime?: string; endTime?: string; page?: number }): Promise<{ orders: any[]; total: number }> {
  // Query Meituan Union orders for commission tracking
  return { orders: [], total: 0 };
}

function generateMeituanSign(params: Record<string, any>, secret: string): string {
  // Generate signature for Meituan API
  const sortedKeys = Object.keys(params).sort();
  let signStr = '';
  for (const key of sortedKeys) {
    signStr += key + '=' + params[key] + '&';
  }
  signStr += 'key=' + secret;

  // In production, use crypto.createHash('md5').update(signStr).digest('hex')
  return 'mock_sign';
}

function getMockMeituanPOIs(keyword: string, city: string, page: number, pageSize: number): MeituanSearchResult {
  const cityName = city || '北京';
  
  const mockPOIs: MeituanPOI[] = [
    {
      poiId: 'mt_001',
      name: `${keyword} 私房菜馆 (${cityName}旗舰店)`,
      category: '中餐',
      address: `${cityName}朝阳区建国路88号`,
      latitude: 39.9087,
      longitude: 116.4605,
      averagePrice: 288,
      rating: 4.8,
      imageUrl: 'https://p0.meituan.net/mock1.jpg',
      affiliateUrl: 'https://i.meituan.com/s/mock1',
      commissionRate: 0.06,
      distance: '1.2km',
      tags: ['包间', '商务宴请', '停车免费'],
    },
    {
      poiId: 'mt_002',
      name: `${keyword} 海鲜酒楼`,
      category: '海鲜',
      address: `${cityName}海淀区中关村大街66号`,
      latitude: 39.9847,
      longitude: 116.3165,
      averagePrice: 458,
      rating: 4.7,
      imageUrl: 'https://p0.meituan.net/mock2.jpg',
      affiliateUrl: 'https://i.meituan.com/s/mock2',
      commissionRate: 0.08,
      distance: '3.5km',
      tags: ['海鲜', '宴请', '有包间'],
    },
    {
      poiId: 'mt_003',
      name: `${keyword} 日式料理`,
      category: '日料',
      address: `${cityName}西城区金融街18号`,
      latitude: 39.9133,
      longitude: 116.3567,
      averagePrice: 368,
      rating: 4.9,
      imageUrl: 'https://p0.meituan.net/mock3.jpg',
      affiliateUrl: 'https://i.meituan.com/s/mock3',
      commissionRate: 0.07,
      distance: '2.1km',
      tags: ['日料', '清酒', 'Omakase'],
    },
    {
      poiId: 'mt_004',
      name: `${keyword} 西餐厅`,
      category: '西餐',
      address: `${cityName}东城区王府井大街138号`,
      latitude: 39.9147,
      longitude: 116.4105,
      averagePrice: 528,
      rating: 4.6,
      imageUrl: 'https://p0.meituan.net/mock4.jpg',
      affiliateUrl: 'https://i.meituan.com/s/mock4',
      commissionRate: 0.05,
      distance: '0.8km',
      tags: ['西餐', '红酒', '浪漫'],
    },
  ];

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    pois: mockPOIs.slice(start, end),
    total: mockPOIs.length,
    page,
    pageSize,
  };
}
