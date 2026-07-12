import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const updateSchema = z
  .object({
    name: z.string().min(1),
    priceDollars: z.coerce.number().min(0),
    description: z.string().min(1),
    features: z.array(z.string()).default([]),
    voicePicks: z.coerce.number().int().min(0),
    active: z.boolean(),
    discountPriceDollars: z.coerce.number().min(0).nullable().optional(),
    discountStartsAt: z.coerce.date().nullable().optional(),
    discountEndsAt: z.coerce.date().nullable().optional(),
    addonPriceDollars: z.coerce.number().min(0).nullable().optional(),
  })
  .refine(
    (data) => {
      const filled = [data.discountPriceDollars, data.discountStartsAt, data.discountEndsAt];
      const filledCount = filled.filter((v) => v != null).length;
      return filledCount === 0 || filledCount === 3;
    },
    { message: 'To schedule a discount, set the discount price, start, and end together.' },
  )
  .refine(
    (data) => !data.discountEndsAt || !data.discountStartsAt || data.discountEndsAt > data.discountStartsAt,
    { message: 'Discount end must be after the start.' },
  )
  .refine((data) => data.discountPriceDollars == null || data.discountPriceDollars < data.priceDollars, {
    message: 'Discount price must be less than the regular price.',
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const pack = await prisma.pack.findUnique({ where: { id } });
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.pack.update({
    where: { id },
    data: {
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.priceDollars * 100),
      description: parsed.data.description,
      features: parsed.data.features,
      voicePicks: parsed.data.voicePicks,
      active: parsed.data.active,
      discountPriceCents:
        parsed.data.discountPriceDollars != null ? Math.round(parsed.data.discountPriceDollars * 100) : null,
      discountStartsAt: parsed.data.discountStartsAt ?? null,
      discountEndsAt: parsed.data.discountEndsAt ?? null,
      addonPriceCents: parsed.data.addonPriceDollars != null ? Math.round(parsed.data.addonPriceDollars * 100) : null,
    },
  });

  return NextResponse.json({ pack: updated });
}
