import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Voices are deactivated, never deleted — existing orders/entitlements
// reference them, and an inactive voice just drops out of the storefront
// (checkout already only offers `active: true` voices).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const voice = await prisma.voice.findUnique({ where: { id } });
  if (!voice) return NextResponse.json({ error: 'Voice not found' }, { status: 404 });

  const updated = await prisma.voice.update({ where: { id }, data: { active: !voice.active } });
  return NextResponse.json({ voice: updated });
}
