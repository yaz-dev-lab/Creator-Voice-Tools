import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { getEffectivePrice, getScheduledDiscountCents } from '@/lib/pricing';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const bodySchema = z.object({
  packId: z.string().min(1),
  voiceSlugs: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Please log in to purchase.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 });
  }

  const pack = await prisma.pack.findUnique({ where: { id: parsed.data.packId } });
  if (!pack || !pack.active) {
    return NextResponse.json({ error: 'That pack is not available.' }, { status: 404 });
  }
  if (pack.voicePicks <= 0) {
    return NextResponse.json(
      { error: 'This pack requires a custom request — please reach out on Discord.' },
      { status: 400 },
    );
  }

  const activeVoices = await prisma.voice.findMany({ where: { active: true } });

  // "Full pack" always means every active voice, computed server-side —
  // never trust the client's list for a pack whose pick count equals the
  // full catalog size.
  let selectedSlugs: string[];
  if (pack.voicePicks >= activeVoices.length) {
    selectedSlugs = activeVoices.map((v) => v.slug);
  } else {
    const requested = [...new Set(parsed.data.voiceSlugs)];
    if (requested.length !== pack.voicePicks) {
      return NextResponse.json(
        { error: `Select exactly ${pack.voicePicks} voice${pack.voicePicks > 1 ? 's' : ''} for this pack.` },
        { status: 400 },
      );
    }
    const validSlugs = new Set(activeVoices.map((v) => v.slug));
    if (!requested.every((slug) => validSlugs.has(slug))) {
      return NextResponse.json({ error: 'One or more selected voices are unavailable.' }, { status: 400 });
    }
    selectedSlugs = requested;
  }

  const selectedVoices = activeVoices.filter((v) => selectedSlugs.includes(v.slug));

  const isReturningCustomer = (await prisma.order.count({ where: { userId: user.id, status: 'PAID' } })) > 0;
  const scheduledDiscountCents = getScheduledDiscountCents(pack, new Date());
  const effectivePrice = getEffectivePrice({
    baseCents: pack.priceCents,
    scheduledDiscountCents,
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
            name: pack.name,
            description: selectedVoices.map((v) => v.name).join(', '),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      packId: pack.id,
      voiceIds: JSON.stringify(selectedVoices.map((v) => v.id)),
    },
    success_url: `${APP_URL}/dashboard?checkout=success`,
    cancel_url: `${APP_URL}/#pricing`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }

  // Order is created now, in PENDING state, so the webhook only ever has to
  // flip status + grant entitlements rather than reconstruct the order from
  // Stripe metadata alone (metadata is a convenience/fallback, not the
  // primary path).
  await prisma.order.create({
    data: {
      userId: user.id,
      packId: pack.id,
      stripeCheckoutSessionId: session.id,
      amountCents: effectivePrice.cents,
      currency: pack.currency,
      status: 'PENDING',
      items: {
        create: selectedVoices.map((v) => ({ voiceId: v.id })),
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
