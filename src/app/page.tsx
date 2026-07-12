import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import LandingInteractive from '@/components/LandingInteractive';

export default async function HomePage() {
  const [voices, packs, vouchVideos, user] = await Promise.all([
    prisma.voice.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }),
    prisma.pack.findMany({ where: { active: true }, orderBy: { priceCents: 'asc' } }),
    prisma.vouchVideo.findMany({ orderBy: { createdAt: 'asc' } }),
    getCurrentUser(),
  ]);

  let ownedVoiceSlugs: string[] = [];
  let isReturningCustomer = false;
  if (user) {
    const [entitlements, paidOrderCount] = await Promise.all([
      prisma.entitlement.findMany({
        where: { userId: user.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        include: { voice: true },
      }),
      prisma.order.count({ where: { userId: user.id, status: 'PAID' } }),
    ]);
    ownedVoiceSlugs = entitlements.map((e) => e.voice.slug);
    isReturningCustomer = paidOrderCount > 0;
  }

  return (
    <LandingInteractive
      voices={voices.map((v) => ({
        id: v.id,
        slug: v.slug,
        name: v.name,
        personaName: v.personaName,
        style: v.style,
        color: v.color,
        tag: v.tag,
        initials: v.initials,
        imageUrl: v.imageUrl,
        previewUrl: v.previewUrl,
      }))}
      packs={packs.map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        description: p.description,
        features: p.features as string[],
        voicePicks: p.voicePicks,
        discountPriceCents: p.discountPriceCents,
        discountStartsAt: p.discountStartsAt?.toISOString() ?? null,
        discountEndsAt: p.discountEndsAt?.toISOString() ?? null,
      }))}
      vouchVideos={vouchVideos.map((v) => ({ id: v.id, youtubeUrl: v.youtubeUrl, title: v.title }))}
      user={user ? { email: user.email } : null}
      ownedVoiceSlugs={ownedVoiceSlugs}
      isReturningCustomer={isReturningCustomer}
      initialNow={Date.now()}
    />
  );
}
