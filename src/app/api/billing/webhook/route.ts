import { NextRequest, NextResponse } from 'next/server';

/**
 * Billing Webhook API
 * 
 * This endpoint handles payment webhooks from:
 * - Stripe (subscription events)
 * - Alipay (payment notifications)
 * - WeChat Pay (payment notifications)
 * 
 * It updates user subscription status and handles:
 * - Successful payments
 * - Failed payments
 * - Subscription cancellations
 * - Refunds
 */

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature') || 
                    request.headers.get('alipay-signature') ||
                    request.headers.get('wechatpay-signature');
  
  const body = await request.text();

  try {
    // Detect payment provider
    if (request.headers.get('stripe-signature')) {
      return handleStripeWebhook(body, signature!);
    } else if (request.headers.get('alipay-signature')) {
      return handleAlipayWebhook(body, signature!);
    } else if (request.headers.get('wechatpay-signature')) {
      return handleWechatWebhook(body, signature!);
    } else {
      // Try to detect from body
      const parsed = JSON.parse(body);
      
      if (parsed.type?.startsWith('customer.subscription')) {
        return handleStripeWebhook(body, signature || '');
      } else if (parsed.trade_status) {
        return handleAlipayWebhook(body, signature || '');
      } else if (parsed.event_type) {
        return handleWechatWebhook(body, signature || '');
      }
      
      return NextResponse.json(
        { error: 'Unknown webhook source' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Stripe webhook handler
async function handleStripeWebhook(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('Stripe webhook secret not configured');
    return NextResponse.json({ received: true });
  }

  // In production, verify the webhook signature
  // const stripe = await import('stripe');
  // const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY!);
  // const event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);

  const event = JSON.parse(body);

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'charge.refunded':
      await handleRefund(event.data.object);
      break;

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Alipay webhook handler
async function handleAlipayWebhook(body: string, signature: string) {
  // In production, verify the Alipay signature
  // Reference: https://opendocs.alipay.com/common/02kkv7

  const params = new URLSearchParams(body);
  const tradeStatus = params.get('trade_status');
  const outTradeNo = params.get('out_trade_no');
  const tradeNo = params.get('trade_no');

  switch (tradeStatus) {
    case 'TRADE_SUCCESS':
    case 'TRADE_FINISHED':
      await handleAlipaySuccess(outTradeNo!, tradeNo!);
      break;

    case 'TRADE_CLOSED':
      await handleAlipayClosed(outTradeNo!);
      break;

    default:
      console.log(`Unhandled Alipay trade status: ${tradeStatus}`);
  }

  // Alipay expects 'success' response
  return new NextResponse('success', { status: 200 });
}

// WeChat Pay webhook handler
async function handleWechatWebhook(body: string, signature: string) {
  // In production, verify the WeChat Pay signature
  // Reference: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_5.shtml

  const event = JSON.parse(body);

  switch (event.event_type) {
    case 'TRANSACTION.SUCCESS':
      await handleWechatSuccess(event.resource);
      break;

    case 'TRANSACTION.CLOSED':
      await handleWechatClosed(event.resource);
      break;

    case 'REFUND.SUCCESS':
      await handleWechatRefund(event.resource);
      break;

    default:
      console.log(`Unhandled WeChat event type: ${event.event_type}`);
  }

  return NextResponse.json({ code: 'SUCCESS', message: 'OK' });
}

// Event handlers
async function handleSubscriptionCreated(subscription: any) {
  const { id, customer, status, items } = subscription;
  
  console.log(`Subscription created: ${id} for customer ${customer}`);
  
  // In production, update user subscription in database
  // await db.subscription.create({
  //   data: {
  //     stripeSubscriptionId: id,
  //     stripeCustomerId: customer,
  //     status,
  //     planId: items.data[0].price.id,
  //   }
  // });
}

async function handleSubscriptionUpdated(subscription: any) {
  const { id, status, cancel_at_period_end } = subscription;
  
  console.log(`Subscription updated: ${id}, status: ${status}, cancel_at_period_end: ${cancel_at_period_end}`);
  
  // In production, update subscription status in database
}

async function handleSubscriptionDeleted(subscription: any) {
  const { id } = subscription;
  
  console.log(`Subscription deleted: ${id}`);
  
  // In production, mark subscription as cancelled and downgrade user
}

async function handlePaymentSucceeded(invoice: any) {
  const { id, subscription, amount_paid, customer } = invoice;
  
  console.log(`Payment succeeded: ${id}, amount: ${amount_paid}, subscription: ${subscription}`);
  
  // In production, record payment and extend subscription
}

async function handlePaymentFailed(invoice: any) {
  const { id, subscription, attempt_count } = invoice;
  
  console.log(`Payment failed: ${id}, attempt: ${attempt_count}`);
  
  // In production, send payment failure notification
  // If too many attempts, cancel subscription
}

async function handleRefund(charge: any) {
  const { id, amount_refunded } = charge;
  
  console.log(`Refund processed: ${id}, amount: ${amount_refunded}`);
  
  // In production, record refund and adjust subscription
}

async function handleAlipaySuccess(outTradeNo: string, tradeNo: string) {
  console.log(`Alipay payment success: outTradeNo=${outTradeNo}, tradeNo=${tradeNo}`);
  
  // In production, update order status and activate subscription
}

async function handleAlipayClosed(outTradeNo: string) {
  console.log(`Alipay trade closed: outTradeNo=${outTradeNo}`);
  
  // In production, mark order as closed
}

async function handleWechatSuccess(resource: any) {
  console.log(`WeChat payment success: ${resource.out_trade_no}`);
  
  // In production, update order status and activate subscription
}

async function handleWechatClosed(resource: any) {
  console.log(`WeChat trade closed: ${resource.out_trade_no}`);
  
  // In production, mark order as closed
}

async function handleWechatRefund(resource: any) {
  console.log(`WeChat refund success: ${resource.out_refund_no}`);
  
  // In production, record refund and adjust subscription
}
