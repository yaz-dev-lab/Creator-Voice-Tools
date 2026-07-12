import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const PUBLIC_VOICES_DIR = path.join(process.cwd(), 'public', 'voices');
export const PUBLIC_PREVIEWS_DIR = path.join(process.cwd(), 'public', 'previews');
export const PRIVATE_VOICES_DIR = path.join(process.cwd(), 'storage', 'voices');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AUDIO_TYPES = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg'];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_DELIVERABLE_BYTES = 250 * 1024 * 1024;

export class UploadError extends Error {}

function extFromName(name: string) {
  const ext = path.extname(name).replace('.', '').toLowerCase();
  return ext || 'bin';
}

async function writeUpload(file: File, dir: string, filename: string) {
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const target = path.join(dir, filename);
  // Defense in depth: filename is always built from a slug we control, but
  // double-check it can't escape the target directory.
  if (!target.startsWith(dir + path.sep)) {
    throw new UploadError('Invalid upload path');
  }
  await writeFile(target, buf);
  return buf.length;
}

// A random suffix busts any CDN/browser cache when an admin replaces an
// existing voice's image/preview in place.
function cacheBustedName(baseSlug: string, ext: string) {
  return `${baseSlug}-${Date.now().toString(36)}.${ext}`;
}

export async function saveVoiceImage(slug: string, file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError('Image must be under 5MB.');
  if (file.type && !IMAGE_TYPES.includes(file.type)) throw new UploadError('Image must be JPEG, PNG, or WebP.');
  const filename = cacheBustedName(slug, extFromName(file.name) || 'jpg');
  await writeUpload(file, PUBLIC_VOICES_DIR, filename);
  return `/voices/${filename}`;
}

export async function saveVoicePreview(slug: string, file: File) {
  if (file.size > MAX_AUDIO_BYTES) throw new UploadError('Preview audio must be under 25MB.');
  if (file.type && !AUDIO_TYPES.includes(file.type)) throw new UploadError('Preview must be WAV, MP3, or OGG.');
  const filename = cacheBustedName(slug, extFromName(file.name) || 'wav');
  await writeUpload(file, PUBLIC_PREVIEWS_DIR, filename);
  return `/previews/${filename}`;
}

// Deliverable files are named with the version baked in, so re-uploading a
// new build for a new version never clobbers the file an in-flight
// download request is currently streaming.
export async function saveVoiceDeliverable(slug: string, version: string, file: File) {
  if (file.size > MAX_DELIVERABLE_BYTES) throw new UploadError('File must be under 250MB.');
  const ext = extFromName(file.name) || 'zip';
  const filename = `${slug}-v${version}.${ext}`;
  await writeUpload(file, PRIVATE_VOICES_DIR, filename);
  return filename; // this is the fileKey stored on Voice
}
