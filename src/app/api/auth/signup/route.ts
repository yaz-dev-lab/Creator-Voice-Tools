import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import { signupSchema } from '@/lib/validation';
import { issueToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  const token = await issueToken(user.id, 'EMAIL_VERIFY');
  await sendVerificationEmail(user.email, token);

  const { token: sessionToken, expiresAt } = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') ?? undefined,
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  });
  await setSessionCookie(sessionToken, expiresAt);

  return NextResponse.json({ user: { id: user.id, email: user.email, emailVerified: false } }, { status: 201 });
}
