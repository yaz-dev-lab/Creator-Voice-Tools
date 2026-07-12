import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';

export const runtime = 'nodejs';

const packSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1),
    priceDollars: z.coerce.number().min(0),
    description: z.string().min(1),
    features: z.array(z.string()).default([]),
    voicePicks: z.coerce.number().int().min(0),
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

export async function GET() {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;
  const packs = await prisma.pack.findMany({ orderBy: { priceCents: 'asc' } });
  return NextResponse.json({ packs });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const parsed = packSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const id = parsed.data.id ? slugify(parsed.data.id) : slugify(parsed.data.name);
  if (!id) return NextResponse.json({ error: 'Could not derive a pack id from that name.' }, { status: 400 });

  const existing = await prisma.pack.findUnique({ where: { id } });
  if (existing) return NextResponse.json({ error: `A pack with id "${id}" already exists.` }, { status: 409 });

  const pack = await prisma.pack.create({
    data: {
      id,
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.priceDollars * 100),
      description: parsed.data.description,
      features: parsed.data.features,
      voicePicks: parsed.data.voicePicks,
      discountPriceCents:
        parsed.data.discountPriceDollars != null ? Math.round(parsed.data.discountPriceDollars * 100) : null,
      discountStartsAt: parsed.data.discountStartsAt ?? null,
      discountEndsAt: parsed.data.discountEndsAt ?? null,
      addonPriceCents: parsed.data.addonPriceDollars != null ? Math.round(parsed.data.addonPriceDollars * 100) : null,
    },
  });

  return NextResponse.json({ pack }, { status: 201 });
}
