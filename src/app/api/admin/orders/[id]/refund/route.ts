import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { revokeEntitlementsForOrder } from '@/lib/orders';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'PAID') {
    return NextResponse.json({ error: 'Only paid orders can be refunded.' }, { status: 400 });
  }
  if (!order.stripePaymentIntentId) {
    return NextResponse.json({ error: 'This order has no payment intent on record.' }, { status: 400 });
  }

  try {
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe refund failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const updated = await prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } });
  await revokeEntitlementsForOrder(id, 'Order refunded');

  return NextResponse.json({ order: updated });
}
