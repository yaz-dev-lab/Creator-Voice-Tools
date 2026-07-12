import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toYoutubeEmbedUrl } from '@/lib/youtube';

export const runtime = 'nodejs';

const MAX_VOUCH_VIDEOS = 3;

const createSchema = z.object({
  youtubeUrl: z.string().url(),
  title: z.string().trim().optional(),
});

export async function GET() {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;
  const videos = await prisma.vouchVideo.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ videos });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const count = await prisma.vouchVideo.count();
  if (count >= MAX_VOUCH_VIDEOS) {
    return NextResponse.json({ error: `You can only have ${MAX_VOUCH_VIDEOS} vouch videos — delete one first.` }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  if (!toYoutubeEmbedUrl(parsed.data.youtubeUrl)) {
    return NextResponse.json({ error: 'That does not look like a YouTube video URL.' }, { status: 400 });
  }

  const video = await prisma.vouchVideo.create({
    data: { youtubeUrl: parsed.data.youtubeUrl, title: parsed.data.title || null },
  });

  return NextResponse.json({ video }, { status: 201 });
}
