import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveVoiceImage, saveVoicePreview, UploadError } from '@/lib/uploads';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const voice = await prisma.voice.findUnique({
    where: { id },
    include: { updates: { orderBy: { releasedAt: 'desc' } } },
  });
  if (!voice) return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
  return NextResponse.json({ voice });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const voice = await prisma.voice.findUnique({ where: { id } });
  if (!voice) return NextResponse.json({ error: 'Voice not found' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const name = form.get('name');
  const personaName = form.get('personaName');
  const style = form.get('style');
  const color = form.get('color');
  const tag = form.get('tag');
  const initials = form.get('initials');
  const youtubeUrl = form.get('youtubeUrl');
  const image = form.get('image');
  const preview = form.get('preview');

  const data: Record<string, unknown> = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (typeof personaName === 'string' && personaName.trim()) data.personaName = personaName.trim();
  if (typeof style === 'string' && style.trim()) data.style = style.trim();
  if (typeof color === 'string' && color.trim()) data.color = color.trim();
  if (typeof tag === 'string' && tag.trim()) data.tag = tag.trim();
  if (typeof initials === 'string' && initials.trim()) data.initials = initials.trim().slice(0, 3).toUpperCase();
  if (typeof youtubeUrl === 'string') data.youtubeUrl = youtubeUrl.trim() || null;

  try {
    if (image instanceof File && image.size > 0) {
      data.imageUrl = await saveVoiceImage(voice.slug, image);
    }
    if (preview instanceof File && preview.size > 0) {
      data.previewUrl = await saveVoicePreview(voice.slug, preview);
    }
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const updated = await prisma.voice.update({ where: { id }, data });
  return NextResponse.json({ voice: updated });
}
