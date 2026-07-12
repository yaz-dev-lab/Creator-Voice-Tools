import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { grantEntitlementsForOrder } from '@/lib/orders';

// Needs the raw request body for Stripe's signature check, and must run on
// the Node runtime (Buffer/crypto), not the edge.
export const runtime = 'nodejs';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const existing = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });

  if (!existing) {
    // Fallback path: the Order row from /api/checkout is missing (e.g. the
    // request died after Stripe session creation but before the DB write).
    // Reconstruct the minimum needed from Checkout Session metadata so the
    // purchase still unlocks instead of silently vanishing.
    const userId = session.metadata?.userId;
    const packId = session.metadata?.packId;
    const voiceIds: string[] = session.metadata?.voiceIds ? JSON.parse(session.metadata.voiceIds) : [];
    if (!userId || !packId || voiceIds.length === 0) {
      console.error('checkout.session.completed with no matching Order and incomplete metadata', session.id);
      return;
    }

    const order = await prisma.order.create({
      data: {
        userId,
        packId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        status: 'PAID',
        items: { create: voiceIds.map((voiceId) => ({ voiceId })) },
      },
    });
    await grantEntitlementsForOrder(order.id);
    return;
  }

  // Idempotent: Stripe retries webhook delivery, so a second delivery of
  // the same event must be a no-op.
  if (existing.status === 'PAID') return;

  await prisma.order.update({
    where: { id: existing.id },
    data: {
      status: 'PAID',
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    },
  });

  await grantEntitlementsForOrder(existing.id);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const existing = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
  if (!existing || existing.status !== 'PENDING') return;
  await prisma.order.update({ where: { id: existing.id }, data: { status: 'FAILED' } });
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
