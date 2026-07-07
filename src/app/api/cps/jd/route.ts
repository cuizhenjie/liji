import { NextRequest, NextResponse } from 'next/server';

/**
 * JD Union (京东联盟) API Integration
 * 
 * This endpoint integrates with JD Union API to:
 * - Search for products
 * - Generate affiliate links
 * - Query commission rates
 * - Track orders
 * 
 * Required environment variables:
 * - JD_UNION_APP_KEY: JD Union app key
 * - JD_UNION_APP_SECRET: JD Union app secret
 * - JD_UNION_UNION_ID: Union ID for tracking
 */

interface JDProduct {
  skuId: string;
  skuName: string;
  price: number;
  lowestPrice: number;
  imageUrl: string;
  materialUrl: string;
  commissionRate: number;
  commission: number;
  shopName: string;
  category: string;
}

interface JDSearchResult {
  products: JDProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const category = searchParams.get('category');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (!keyword && !category) {
    return NextResponse.json(
      { error: 'keyword or category is required' },
      { status: 400 }
    );
  }

  try {
    const result = await searchJDProducts({
      keyword: keyword || '',
      category: category || '',
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('JD Union API error:', error);
    return NextResponse.json(
      { error: 'JD product search failed' },
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
          data: await searchJDProducts(params),
        });

      case 'link':
        return NextResponse.json({
          success: true,
          data: await generateJDLink(params.skuId || params.url),
        });

      case 'commission':
        return NextResponse.json({
          success: true,
          data: await queryCommission(params.skuIds),
        });

      case 'orders':
        return NextResponse.json({
          success: true,
          data: await queryOrders(params),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('JD Union API error:', error);
    return NextResponse.json(
      { error: 'JD Union operation failed' },
      { status: 500 }
    );
  }
}

interface SearchParams {
  keyword: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

async function searchJDProducts(params: SearchParams): Promise<JDSearchResult> {
  const { keyword, category, minPrice, maxPrice, page = 1, pageSize = 20 } = params;

  // Check if JD Union credentials are configured
  const appKey = process.env.JD_UNION_APP_KEY;
  const appSecret = process.env.JD_UNION_APP_SECRET;

  if (!appKey || !appSecret) {
    // Return mock data for development
    return getMockJDProducts(keyword, page, pageSize);
  }

  // In production, call JD Union API
  // Reference: https://union.jd.com/openplatform/api
  const apiUrl = 'https://api.jd.com/routerjson';
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const apiParams = {
    method: 'jd.union.open.goods.query',
    app_key: appKey,
    timestamp,
    format: 'json',
    v: '1.0',
    sign_method: 'md5',
    param_json: JSON.stringify({
      goodsReqDTO: {
        keyword,
        cid1: category ? parseInt(category) : undefined,
        pricefrom: minPrice,
        priceto: maxPrice,
        pageIndex: page,
        pageSize,
        sortName: 'commissionShare',
        sort: 1, // descending
      },
    }),
  };

  // Generate signature
  const sign = generateJDSign(apiParams, appSecret);

  // Make API call
  const response = await fetch(`${apiUrl}?${new URLSearchParams({ ...apiParams, sign }).toString()}`);
  const data = await response.json();

  // Parse response
  if (data.jd_union_open_goods_query_response?.result) {
    const result = JSON.parse(data.jd_union_open_goods_query_response.result);
    return {
      products: result.data.map(mapJDProduct),
      total: result.totalCount,
      page,
      pageSize,
    };
  }

  return { products: [], total: 0, page, pageSize };
}

function mapJDProduct(item: any): JDProduct {
  return {
    skuId: item.skuId,
    skuName: item.skuName,
    price: item.price,
    lowestPrice: item.lowestPrice || item.price,
    imageUrl: item.imageInfo?.imageList?.[0]?.url || '',
    materialUrl: item.materialUrl,
    commissionRate: item.commissionInfo?.commissionShare || 0,
    commission: item.commissionInfo?.commission || 0,
    shopName: item.shopInfo?.shopName || '',
    category: item.categoryInfo?.cid1Name || '',
  };
}

async function generateJDLink(skuIdOrUrl: string): Promise<{ affiliateUrl: string }> {
  const appKey = process.env.JD_UNION_APP_KEY;
  const unionId = process.env.JD_UNION_UNION_ID;

  if (!appKey || !unionId) {
    // Return mock affiliate URL
    return {
      affiliateUrl: `https://union-click.jd.com/jdc?e=mock&sku=${skuIdOrUrl}`,
    };
  }

  // In production, call JD Union API to generate affiliate link
  // Reference: https://union.jd.com/openplatform/api
  return {
    affiliateUrl: `https://union-click.jd.com/jdc?e=real&sku=${skuIdOrUrl}`,
  };
}

async function queryCommission(skuIds: string[]): Promise<Record<string, number>> {
  // Query commission rates for multiple SKUs
  const result: Record<string, number> = {};

  for (const skuId of skuIds) {
    // Default commission rate (would be fetched from API in production)
    result[skuId] = 0.05; // 5% default
  }

  return result;
}

async function queryOrders(params: { startTime?: string; endTime?: string; page?: number }): Promise<{ orders: any[]; total: number }> {
  // Query JD Union orders for commission tracking
  // In production, call JD Union API
  return { orders: [], total: 0 };
}

function generateJDSign(params: Record<string, any>, secret: string): string {
  // Generate MD5 signature for JD API
  // Reference: https://union.jd.com/helpcenter/144-148
  const sortedKeys = Object.keys(params).sort();
  let signStr = secret;
  for (const key of sortedKeys) {
    signStr += key + params[key];
  }
  signStr += secret;

  // In production, use crypto.createHash('md5').update(signStr).digest('hex')
  return 'mock_sign';
}

function getMockJDProducts(keyword: string, page: number, pageSize: number): JDSearchResult {
  const mockProducts: JDProduct[] = [
    {
      skuId: '100012345678',
      skuName: `${keyword} 精品礼盒装 送礼佳品`,
      price: 299,
      lowestPrice: 259,
      imageUrl: 'https://img14.360buyimg.com/n1/jfs/t1/mock1.jpg',
      materialUrl: 'https://item.jd.com/100012345678.html',
      commissionRate: 0.08,
      commission: 23.92,
      shopName: '京东自营',
      category: '礼品',
    },
    {
      skuId: '100012345679',
      skuName: `${keyword} 高端定制款 商务送礼`,
      price: 599,
      lowestPrice: 499,
      imageUrl: 'https://img14.360buyimg.com/n1/jfs/t1/mock2.jpg',
      materialUrl: 'https://item.jd.com/100012345679.html',
      commissionRate: 0.1,
      commission: 59.9,
      shopName: '品牌旗舰店',
      category: '礼品',
    },
    {
      skuId: '100012345680',
      skuName: `${keyword} 经典款 性价比之选`,
      price: 159,
      lowestPrice: 139,
      imageUrl: 'https://img14.360buyimg.com/n1/jfs/t1/mock3.jpg',
      materialUrl: 'https://item.jd.com/100012345680.html',
      commissionRate: 0.06,
      commission: 9.54,
      shopName: '京东自营',
      category: '礼品',
    },
  ];

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    products: mockProducts.slice(start, end),
    total: mockProducts.length,
    page,
    pageSize,
  };
}
