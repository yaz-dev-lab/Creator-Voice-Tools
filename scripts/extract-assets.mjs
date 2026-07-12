// One-time migration script: pulls the base64-embedded voice images and
// preview audio out of the legacy static HTML file into real static assets,
// and dumps the voice/pack catalog data to JSON for DB seeding.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'legacy', 'creator-voice-tools-v7.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`end marker not found: ${endMarker}`);
  return source.slice(start + startMarker.length, end);
}

const voicesLiteral = extractBetween(html, 'const voices=[', '\n];');
// The literal is plain JS object/string/array data (no function calls, no
// external refs) authored by us in the static file, so evaluating it in an
// isolated Function scope is safe and far simpler than hand-rolling a parser
// for ~50MB of nested data-URI strings.
// eslint-disable-next-line no-new-func
const voices = new Function(`"use strict"; return [${voicesLiteral}];`)();

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// The data URIs all declare `image/png`, but the actual bytes are JPEG
// (FF D8 FF magic number) — detect the real format instead of trusting the
// declared mime type, so the file extension on disk is accurate.
function sniffImageExt(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  return 'bin';
}

function decodeDataUri(dataUri, outPathNoExt, kind) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUri);
  if (!match) throw new Error('bad data URI');
  const buf = Buffer.from(match[2], 'base64');
  const ext = kind === 'image' ? sniffImageExt(buf) : 'wav';
  const outPath = `${outPathNoExt}.${ext}`;
  fs.writeFileSync(outPath, buf);
  return { bytes: buf.length, ext };
}

const voicesOut = [];
for (const v of voices) {
  const slug = slugify(v.name);
  const { ext: imgExt } = decodeDataUri(v.img, path.join(root, 'public', 'voices', slug), 'image');
  const imgPath = `/voices/${slug}.${imgExt}`;

  let previewPath = null;
  if (v.audio) {
    previewPath = `/previews/${slug}.wav`;
    decodeDataUri(v.audio, path.join(root, 'public', 'previews', slug), 'audio');
  }

  voicesOut.push({
    slug,
    name: v.name,
    style: v.style,
    color: v.color,
    tag: v.tag,
    initials: v.initials,
    imageUrl: imgPath,
    previewUrl: previewPath,
  });
}

fs.writeFileSync(
  path.join(root, 'prisma', 'seed-data', 'voices.json'),
  JSON.stringify(voicesOut, null, 2),
);

// Shared nav/footer logo image (identical data URI in both spots in the
// legacy file).
const logoMarkerStart = html.indexOf('<a class="logo" href="#">');
const logoDataStart = html.indexOf('data:image', logoMarkerStart);
const logoDataEnd = html.indexOf('"', logoDataStart);
const logoDataUri = html.slice(logoDataStart, logoDataEnd);
decodeDataUri(logoDataUri, path.join(root, 'public', 'logo'), 'image');

const packs = [
  { id: 'starter', name: 'Starter Pack', priceCents: 2500, desc: 'Try it out without the commitment. Pick any 2 creator voices.', picks: 2, tag: null, feats: ['2 voice presets of your choice', 'Works with Discord & OBS', 'Basic setup guide'] },
  { id: 'creator', name: 'Creator Pack', priceCents: 4000, desc: 'Most popular option. 5 presets, setup help, and priority support.', picks: 5, tag: 'Best value', feats: ['5 voice presets of your choice', 'Setup assistance included', 'Priority Discord support', 'Free updates'] },
  { id: 'full', name: 'Full Pack', priceCents: 8000, desc: 'Every preset in the library. Nothing held back.', picks: voicesOut.length, tag: null, feats: [`All ${voicesOut.length} voice presets`, 'Setup assistance included', 'Priority Discord support', 'Free updates'] },
];

fs.writeFileSync(
  path.join(root, 'prisma', 'seed-data', 'packs.json'),
  JSON.stringify(packs, null, 2),
);

console.log(`Extracted ${voicesOut.length} voices and ${packs.length} packs.`);
