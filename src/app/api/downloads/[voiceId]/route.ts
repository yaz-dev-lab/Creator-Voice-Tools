import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Reads from disk, so this must run on the Node runtime, not the edge.
export const runtime = 'nodejs';

// Files live outside /public specifically so they can never be reached by
// a direct URL guess — this route is the only path to them, and it always
// re-checks ownership first.
const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'voices');

export async function GET(_req: Request, { params }: { params: Promise<{ voiceId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Please log in to download this file.' }, { status: 401 });
  }

  const { voiceId } = await params;

  const entitlement = await prisma.entitlement.findUnique({
    where: { userId_voiceId: { userId: user.id, voiceId } },
    include: { voice: true },
  });

  if (
    !entitlement ||
    entitlement.revokedAt ||
    (entitlement.expiresAt && entitlement.expiresAt < new Date())
  ) {
    return NextResponse.json({ error: 'You do not own this voice preset.' }, { status: 403 });
  }

  const voice = entitlement.voice;
  const filePath = path.join(STORAGE_ROOT, voice.fileKey);

  // fileKey is server-generated (seeded), never client input, but resolve
  // and re-verify it stays inside STORAGE_ROOT as defense in depth.
  if (!filePath.startsWith(STORAGE_ROOT + path.sep)) {
    return NextResponse.json({ error: 'Invalid file reference.' }, { status: 400 });
  }

  try {
    await stat(filePath);
  } catch {
    console.error(`Missing preset file on disk for voice ${voice.slug}: ${filePath}`);
    return NextResponse.json({ error: 'This file is temporarily unavailable.' }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const downloadName = `${voice.slug}-v${voice.version}${path.extname(voice.fileKey)}`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
