import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { getEffectivePrice } from '@/lib/pricing';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const bodySchema = z.object({
  packId: z.string().min(1),
  voiceSlug: z.string().min(1),
});

// Post-purchase "add one more voice to the pack you already bought" upsell.
// Mirrors /api/checkout: server re-validates everything, never trusts the
// client, and writes a PENDING Order the existing Stripe webhook already
// knows how to turn into an entitlement — same pipeline, smaller order.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Please log in to purchase.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const pack = await prisma.pack.findUnique({ where: { id: parsed.data.packId } });
  if (!pack || !pack.active || pack.addonPriceCents == null) {
    return NextResponse.json({ error: 'This pack does not offer a voice add-on.' }, { status: 400 });
  }

  const voice = await prisma.voice.findUnique({ where: { slug: parsed.data.voiceSlug } });
  if (!voice || !voice.active) {
    return NextResponse.json({ error: 'That voice is not available.' }, { status: 404 });
  }

  const existingEntitlement = await prisma.entitlement.findUnique({
    where: { userId_voiceId: { userId: user.id, voiceId: voice.id } },
  });
  if (existingEntitlement && !existingEntitlement.revokedAt) {
    return NextResponse.json({ error: 'You already own this voice.' }, { status: 400 });
  }

  // Reaching this upsell requires a prior PAID order, but re-check server-side
  // rather than trust the caller — this also determines the discounted price.
  const isReturningCustomer = (await prisma.order.count({ where: { userId: user.id, status: 'PAID' } })) > 0;
  if (!isReturningCustomer) {
    return NextResponse.json({ error: 'This add-on is only available after your first purchase.' }, { status: 403 });
  }

  const effectivePrice = getEffectivePrice({
    baseCents: pack.addonPriceCents,
    scheduledDiscountCents: null,
    isReturningCustomer,
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [
      {
        price_data: {
          currency: pack.currency,
          unit_amount: effectivePrice.cents,
          product_data: {
            name: `${voice.name} — added to ${pack.name}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      packId: pack.id,
      voiceIds: JSON.stringify([voice.id]),
    },
    success_url: `${APP_URL}/dashboard?checkout=success`,
    cancel_url: `${APP_URL}/dashboard`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }

  await prisma.order.create({
    data: {
      userId: user.id,
      packId: pack.id,
      stripeCheckoutSessionId: session.id,
      amountCents: effectivePrice.cents,
      currency: pack.currency,
      status: 'PENDING',
      items: { create: [{ voiceId: voice.id }] },
    },
  });

  return NextResponse.json({ url: session.url });
}
