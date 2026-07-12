import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const entitlement = await prisma.entitlement.findUnique({ where: { id } });
  if (!entitlement) return NextResponse.json({ error: 'Entitlement not found' }, { status: 404 });

  const updated = await prisma.entitlement.update({
    where: { id },
    data: { revokedAt: null, revokedReason: null },
  });

  return NextResponse.json({ entitlement: updated });
}
