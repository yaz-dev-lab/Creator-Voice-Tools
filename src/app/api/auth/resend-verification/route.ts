import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { issueToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const token = await issueToken(user.id, 'EMAIL_VERIFY');
  await sendVerificationEmail(user.email, token);

  return NextResponse.json({ ok: true });
}
