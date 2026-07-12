import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session-cookie';
import type { User } from '@prisma/client';

export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const BCRYPT_COST = 12;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET env var must be set to a random string of 16+ chars');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Signs a JWT that only encodes (sid, sub) + expiry. The JWT is what
// middleware checks at the edge for a fast redirect; it is NOT the source
// of truth for authorization. That's the Session row in Postgres, checked
// by getCurrentUser() below, which is what every real auth decision uses.
export async function signSessionJWT(sessionId: string, userId: string, expiresAt: Date) {
  return new SignJWT({ sid: sessionId, sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret());
}

export async function verifySessionJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sid !== 'string' || typeof payload.sub !== 'string') return null;
    return { sessionId: payload.sid, userId: payload.sub };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, meta?: { userAgent?: string; ipAddress?: string }) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });
  const token = await signSessionJWT(session.id, userId, expiresAt);
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Source of truth for "who is making this request". Verifies the JWT
// signature/expiry, then confirms the underlying session hasn't been
// revoked (logout, "sign out everywhere") or expired server-side.
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const verified = await verifySessionJWT(token);
  if (!verified) return null;

  const session = await prisma.session.findUnique({
    where: { id: verified.sessionId },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.userId !== verified.userId) return null;

  return session.user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Not authenticated');
  return user;
}

// For admin *pages* (server components): bounce anonymous visitors to
// login and non-admins back to their own dashboard, rather than exposing
// a bare 403.
export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return user;
}

// For admin *API routes*: no redirects, just a JSON response the caller
// can return directly — `const guard = await requireAdminApi(); if ('error'
// in guard) return guard.error;`.
export async function requireAdminApi(): Promise<{ user: User } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }
  if (user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const verified = await verifySessionJWT(token);
    if (verified) {
      await prisma.session.update({
        where: { id: verified.sessionId },
        data: { revokedAt: new Date() },
      }).catch(() => {});
    }
  }
  await clearSessionCookie();
}

export class AuthError extends Error {}
