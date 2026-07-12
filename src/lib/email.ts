import { Resend } from 'resend';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const FROM = process.env.EMAIL_FROM ?? 'Creator Voice Tools <onboarding@resend.dev>';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    // Dev/placeholder fallback so the auth flow is fully testable before a
    // real Resend API key is wired in.
    console.log(`[email:stub] to=${to} subject="${subject}"\n${html}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await send(
    email,
    'Verify your email — Creator Voice Tools',
    `<p>Confirm your email to activate your account.</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await send(
    email,
    'Reset your password — Creator Voice Tools',
    `<p>Someone requested a password reset for this account. If that was you, click below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`,
  );
}
