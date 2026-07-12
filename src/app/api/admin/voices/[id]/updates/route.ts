import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveVoiceDeliverable, UploadError } from '@/lib/uploads';

export const runtime = 'nodejs';

// Publishes a new version: always logs a VoiceUpdate entry, and — if a new
// file was uploaded — replaces the deliverable and bumps Voice.version.
// A version bump with no file is allowed too (e.g. "updated setup notes
// only"), so notes and file are independent.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const { id } = await params;
  const voice = await prisma.voice.findUnique({ where: { id } });
  if (!voice) return NextResponse.json({ error: 'Voice not found' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const version = String(form.get('version') ?? '').trim();
  const notes = String(form.get('notes') ?? '').trim();
  const file = form.get('file');

  if (!version || !notes) {
    return NextResponse.json({ error: 'Version and release notes are required.' }, { status: 400 });
  }

  const data: Record<string, unknown> = { version };

  if (file instanceof File && file.size > 0) {
    try {
      data.fileKey = await saveVoiceDeliverable(voice.slug, version, file);
    } catch (err) {
      if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }

  const [updatedVoice] = await prisma.$transaction([
    prisma.voice.update({ where: { id }, data }),
    prisma.voiceUpdate.create({ data: { voiceId: id, version, notes } }),
  ]);

  return NextResponse.json({ voice: updatedVoice });
}
