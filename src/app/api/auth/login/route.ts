import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

// Generic error message on both "no such user" and "wrong password" so the
// endpoint doesn't leak which emails have accounts.
const INVALID = 'Invalid email or password.';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Still run bcrypt so timing doesn't disclose account existence.
    await verifyPassword(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvali');
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') ?? undefined,
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  });
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({
    user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerified) },
  });
}
