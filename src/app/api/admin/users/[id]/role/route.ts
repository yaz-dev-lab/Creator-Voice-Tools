import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({ role: z.enum(['ADMIN', 'CUSTOMER']) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;
  const { user: admin } = guard;

  const { id } = await params;

  // An admin locking themselves out (the last admin demoting themselves)
  // is a support nightmare with no UI left to undo it — block it outright.
  if (id === admin.id) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updated = await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });
  return NextResponse.json({ user: { id: updated.id, role: updated.role } });
}
