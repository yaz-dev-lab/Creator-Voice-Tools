import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { grantEntitlementsForOrder } from '@/lib/orders';

export const runtime = 'nodejs';

// Live-checks Stripe's record for this Checkout Session and repairs our
// Order if it's out of sync (e.g. the webhook never arrived). This is a
// manual escape hatch, not the primary fulfillment path — the webhook is.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: 'Could not reach Stripe for this session.' }, { status: 502 });
  }

  let updated = order;

  if (session.payment_status === 'paid' && order.status === 'PENDING') {
    updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'PAID',
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      },
    });
    await grantEntitlementsForOrder(id);
  } else if (session.status === 'expired' && order.status === 'PENDING') {
    updated = await prisma.order.update({ where: { id }, data: { status: 'FAILED' } });
  }

  return NextResponse.json({
    order: updated,
    stripe: { payment_status: session.payment_status, status: session.status },
  });
}
