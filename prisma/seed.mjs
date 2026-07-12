import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const prisma = new PrismaClient();

const voices = JSON.parse(fs.readFileSync(path.join(root, 'prisma', 'seed-data', 'voices.json'), 'utf8'));
const packs = JSON.parse(fs.readFileSync(path.join(root, 'prisma', 'seed-data', 'packs.json'), 'utf8'));

const storageDir = path.join(root, 'storage', 'voices');
fs.mkdirSync(storageDir, { recursive: true });

async function main() {
  for (const v of voices) {
    const fileKey = `${v.slug}.zip`;

    // Placeholder deliverable — swap in the real packaged voice preset
    // file at storage/voices/<slug>.zip before going live. Never served
    // from /public; only reachable through the authenticated download route.
    const filePath = path.join(storageDir, fileKey);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        `Placeholder package for "${v.name}" voice preset.\nReplace this file with the real deliverable before launch.\n`,
      );
    }

    const voice = await prisma.voice.upsert({
      where: { slug: v.slug },
      update: {
        name: v.name,
        personaName: v.personaName ?? v.name,
        style: v.style,
        color: v.color,
        tag: v.tag,
        initials: v.initials,
        imageUrl: v.imageUrl,
        previewUrl: v.previewUrl,
        fileKey,
      },
      create: {
        slug: v.slug,
        name: v.name,
        personaName: v.personaName ?? v.name,
        style: v.style,
        color: v.color,
        tag: v.tag,
        initials: v.initials,
        imageUrl: v.imageUrl,
        previewUrl: v.previewUrl,
        fileKey,
        version: '1.0.0',
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${v.name} voice preset setup guide`)}`,
      },
    });

    const hasUpdate = await prisma.voiceUpdate.findFirst({ where: { voiceId: voice.id } });
    if (!hasUpdate) {
      await prisma.voiceUpdate.create({
        data: { voiceId: voice.id, version: '1.0.0', notes: 'Initial release.' },
      });
    }
  }

  for (const p of packs) {
    await prisma.pack.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        priceCents: p.priceCents,
        description: p.desc,
        features: p.feats,
        voicePicks: p.picks,
      },
      create: {
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        description: p.desc,
        features: p.feats,
        voicePicks: p.picks,
      },
    });
  }

  console.log(`Seeded ${voices.length} voices and ${packs.length} packs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
