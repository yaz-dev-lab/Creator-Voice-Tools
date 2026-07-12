import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST (not DELETE) to match the ActionButton convention used by every other
// one-click admin action in this app (toggle-active, revoke, refund, ...).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const video = await prisma.vouchVideo.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  await prisma.vouchVideo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
