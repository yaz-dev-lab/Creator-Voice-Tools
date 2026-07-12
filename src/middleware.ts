import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from '@/lib/session-cookie';

// Edge-safe optimistic check: verifies the JWT signature/expiry only (no DB
// round trip is possible here). This is a fast redirect for UX; the real
// authorization decision is re-checked against the Session table by
// getCurrentUser() in the actual page/route (see src/lib/auth.ts).
async function hasValidJWT(token: string | undefined) {
  if (!token) return false;
  const secretEnv = process.env.AUTH_SECRET;
  if (!secretEnv) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secretEnv));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await hasValidJWT(token);

  if (!authed) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Note: this only proves "some valid session" — it can't check the ADMIN
// role at the edge (no DB access here). The real role check happens in
// src/app/admin/layout.tsx via requireAdminPage(), which is the source of
// truth. This redirect is purely so a logged-out visitor hits /login
// instead of a confusing 403 deep in the admin tree.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
