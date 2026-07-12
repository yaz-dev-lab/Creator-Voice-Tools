import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/tokens';
import { verifyEmailSchema } from '@/lib/validation';

// Deliberately a POST triggered by an explicit button click on the
// /verify-email page rather than firing on GET page-load — email clients
// and security scanners routinely prefetch links, which would otherwise
// burn single-use tokens before the user ever sees the page.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const userId = await consumeToken(parsed.data.token, 'EMAIL_VERIFY');
  if (!userId) {
    return NextResponse.json({ error: 'This verification link is invalid or has expired.' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });

  return NextResponse.json({ ok: true });
}
