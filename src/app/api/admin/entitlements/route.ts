import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({ userId: z.string().min(1), voiceId: z.string().min(1) });

// Manual grant — no Order attached (orderId stays null). If the user
// previously had this voice revoked, granting again clears the revocation
// rather than erroring on the unique(userId, voiceId) constraint.
export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const [user, voice] = await Promise.all([
    prisma.user.findUnique({ where: { id: parsed.data.userId } }),
    prisma.voice.findUnique({ where: { id: parsed.data.voiceId } }),
  ]);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!voice) return NextResponse.json({ error: 'Voice not found' }, { status: 404 });

  const entitlement = await prisma.entitlement.upsert({
    where: { userId_voiceId: { userId: user.id, voiceId: voice.id } },
    update: { revokedAt: null, revokedReason: null, expiresAt: null },
    create: { userId: user.id, voiceId: voice.id },
  });

  return NextResponse.json({ entitlement }, { status: 201 });
}
