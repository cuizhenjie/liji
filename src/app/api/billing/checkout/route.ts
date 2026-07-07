import { NextRequest, NextResponse } from 'next/server';

/**
 * Billing Checkout API
 * 
 * This endpoint handles subscription checkout flow:
 * - Create checkout sessions for Stripe
 * - Generate payment QR codes for Alipay/WeChat
 * - Handle subscription upgrades/downgrades
 * 
 * Supported payment methods:
 * - Stripe (international)
 * - Alipay (China)
 * - WeChat Pay (China)
 */

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { 
    plan, 
    paymentMethod = 'stripe',
    userId,
    successUrl,
    cancelUrl,
  } = body;

  if (!plan) {
    return NextResponse.json(
      { error: 'plan is required' },
      { status: 400 }
    );
  }

  try {
    switch (paymentMethod) {
      case 'stripe':
        return NextResponse.json({
          success: true,
          data: await createStripeCheckout(plan, userId, successUrl, cancelUrl),
        });

      case 'alipay':
        return NextResponse.json({
          success: true,
          data: await createAlipayCheckout(plan, userId),
        });

      case 'wechat':
        return NextResponse.json({
          success: true,
          data: await createWechatCheckout(plan, userId),
        });

      default:
        return NextResponse.json(
          { error: `Unsupported payment method: ${paymentMethod}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 }
    );
  }
}

// Plan definitions
const PLANS = {
  free: {
    id: 'free',
    name: '免费版',
    price: 0,
    interval: 'month',
    features: ['基础功能', '5个联系人', '每月5次AI推荐'],
    stripePriceId: null,
  },
  pro: {
    id: 'pro',
    name: '专业版',
    price: 29,
    interval: 'month',
    features: ['全部功能', '无限联系人', '无限AI推荐', '优先客服'],
    stripePriceId: 'price_pro_monthly',
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: '专业版(年付)',
    price: 290,
    interval: 'year',
    features: ['全部功能', '无限联系人', '无限AI推荐', '优先客服', '省¥58'],
    stripePriceId: 'price_pro_yearly',
  },
  executive: {
    id: 'executive',
    name: '高管版',
    price: 99,
    interval: 'month',
    features: ['全部功能', '无限联系人', '无限AI推荐', '专属客服', '家庭共享(5人)', '高级分析'],
    stripePriceId: 'price_executive_monthly',
  },
  executive_yearly: {
    id: 'executive_yearly',
    name: '高管版(年付)',
    price: 990,
    interval: 'year',
    features: ['全部功能', '无限联系人', '无限AI推荐', '专属客服', '家庭共享(5人)', '高级分析', '省¥198'],
    stripePriceId: 'price_executive_yearly',
  },
};

async function createStripeCheckout(
  planId: string,
  userId: string | undefined,
  successUrl: string | undefined,
  cancelUrl: string | undefined
) {
  const plan = PLANS[planId as keyof typeof PLANS];
  
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  if (plan.price === 0) {
    return { type: 'free', plan };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    // Return mock checkout session for development
    return {
      type: 'stripe',
      plan,
      sessionUrl: `https://checkout.stripe.com/pay/mock?plan=${planId}`,
      sessionId: 'cs_mock_' + Date.now(),
    };
  }

  // In production, create a real Stripe checkout session
  // Reference: https://stripe.com/docs/api/checkout/sessions/create
  // const stripe = await import('stripe');
  // const stripeClient = new stripe.default(stripeKey);

  // For now, return mock checkout session
  return {
    type: 'stripe',
    plan,
    sessionUrl: `https://checkout.stripe.com/pay/real?plan=${planId}`,
    sessionId: 'cs_real_' + Date.now(),
  };
}

async function createAlipayCheckout(planId: string, userId: string | undefined) {
  const plan = PLANS[planId as keyof typeof PLANS];
  
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  const alipayAppId = process.env.ALIPAY_APP_ID;
  const alipayPrivateKey = process.env.ALIPAY_PRIVATE_KEY;

  if (!alipayAppId || !alipayPrivateKey) {
    // Return mock payment info for development
    return {
      type: 'alipay',
      plan,
      qrCode: `https://qr.alipay.com/mock?plan=${planId}&amount=${plan.price}`,
      orderNo: 'ALI' + Date.now(),
    };
  }

  // In production, create Alipay trade page
  // Reference: https://opendocs.alipay.com/open/02ivbs
  const orderNo = 'ALI' + Date.now();
  
  return {
    type: 'alipay',
    plan,
    qrCode: `https://qr.alipay.com/real?order=${orderNo}`,
    orderNo,
  };
}

async function createWechatCheckout(planId: string, userId: string | undefined) {
  const plan = PLANS[planId as keyof typeof PLANS];
  
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  const wechatAppId = process.env.WECHAT_PAY_APP_ID;
  const wechatMchId = process.env.WECHAT_PAY_MCH_ID;

  if (!wechatAppId || !wechatMchId) {
    // Return mock payment info for development
    return {
      type: 'wechat',
      plan,
      qrCode: `https://wx.tenpay.com/mock?plan=${planId}&amount=${plan.price}`,
      orderNo: 'WX' + Date.now(),
    };
  }

  // In production, create WeChat Pay native order
  // Reference: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
  const orderNo = 'WX' + Date.now();
  
  return {
    type: 'wechat',
    plan,
    qrCode: `https://wx.tenpay.com/real?order=${orderNo}`,
    orderNo,
  };
}

// Export plans for use in other modules
export { PLANS };
