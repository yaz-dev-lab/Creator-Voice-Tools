import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { TokenType } from '@prisma/client';

const EMAIL_VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30; // 30min

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function issueToken(userId: string, type: TokenType) {
  const raw = randomBytes(32).toString('hex');
  const ttl = type === 'EMAIL_VERIFY' ? EMAIL_VERIFY_TTL_MS : PASSWORD_RESET_TTL_MS;

  await prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttl),
    },
  });

  return raw;
}

// Single-use: consuming a token immediately marks it used, and any token
// already marked used or expired is rejected. Returns the owning userId.
export async function consumeToken(raw: string, type: TokenType) {
  const tokenHash = hashToken(raw);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
