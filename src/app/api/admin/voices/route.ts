import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import { saveVoiceImage, saveVoicePreview, saveVoiceDeliverable, UploadError } from '@/lib/uploads';

export const runtime = 'nodejs';

async function uniqueSlug(base: string) {
  let candidate = base || 'voice';
  let n = 1;
  // Small catalog, so a loop is simpler and clearer than a clever query.
  while (await prisma.voice.findUnique({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function GET() {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const voices = await prisma.voice.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ voices });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if ('error' in guard) return guard.error;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const name = String(form.get('name') ?? '').trim();
  const personaName = String(form.get('personaName') ?? '').trim();
  const style = String(form.get('style') ?? '').trim();
  const color = String(form.get('color') ?? '#7c5cbf').trim();
  const tag = String(form.get('tag') ?? 'new').trim();
  const initials = String(form.get('initials') ?? '').trim().slice(0, 3).toUpperCase();
  const youtubeUrl = String(form.get('youtubeUrl') ?? '').trim() || null;
  const version = String(form.get('version') ?? '1.0.0').trim() || '1.0.0';
  const image = form.get('image');
  const preview = form.get('preview');
  const deliverable = form.get('deliverable');

  if (!name || !style || !initials || !personaName) {
    return NextResponse.json({ error: 'Name, persona name, style, and initials are required.' }, { status: 400 });
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: 'A voice image is required.' }, { status: 400 });
  }
  if (!(deliverable instanceof File) || deliverable.size === 0) {
    return NextResponse.json({ error: 'A deliverable file is required.' }, { status: 400 });
  }

  const slug = await uniqueSlug(slugify(name));

  try {
    const imageUrl = await saveVoiceImage(slug, image);
    const previewUrl = preview instanceof File && preview.size > 0 ? await saveVoicePreview(slug, preview) : null;
    const fileKey = await saveVoiceDeliverable(slug, version, deliverable);

    const voice = await prisma.voice.create({
      data: {
        slug,
        name,
        personaName,
        style,
        color,
        tag,
        initials,
        imageUrl,
        previewUrl,
        youtubeUrl,
        version,
        fileKey,
        updates: { create: { version, notes: 'Initial release.' } },
      },
    });

    return NextResponse.json({ voice }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
