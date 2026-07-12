// Split out from lib/auth.ts so middleware.ts (Edge runtime) can read the
// cookie name without pulling in bcryptjs/Prisma/next/headers — none of
// which are Edge-compatible.
export const SESSION_COOKIE = 'cvt_session';
