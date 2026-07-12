import { redirect } from 'next/navigation';
import NextImage from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SimpleNav from '@/components/SimpleNav';
import ResendVerificationButton from '@/components/ResendVerificationButton';
import UpsellPanel from '@/components/UpsellPanel';
import { getEffectivePrice } from '@/lib/pricing';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const { checkout } = await searchParams;

  const entitlements = await prisma.entitlement.findMany({
    where: {
      userId: user.id,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      voice: { include: { updates: { orderBy: { releasedAt: 'desc' } } } },
    },
    orderBy: { unlockedAt: 'desc' },
  });

  const lastPaidOrder = await prisma.order.findFirst({
    where: { userId: user.id, status: 'PAID' },
    orderBy: { createdAt: 'desc' },
    include: { pack: true },
  });

  let upsellVoices: { id: string; slug: string; name: string; imageUrl: string; owned: boolean }[] = [];
  let addonPriceCents = 0;
  let discountedAddonPriceCents = 0;
  if (lastPaidOrder?.pack.addonPriceCents != null) {
    const ownedVoiceIds = new Set(entitlements.map((e) => e.voiceId));
    const allActiveVoices = await prisma.voice.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    upsellVoices = allActiveVoices.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      imageUrl: v.imageUrl,
      owned: ownedVoiceIds.has(v.id),
    }));
    addonPriceCents = lastPaidOrder.pack.addonPriceCents;
    discountedAddonPriceCents = getEffectivePrice({
      baseCents: addonPriceCents,
      scheduledDiscountCents: null,
      isReturningCustomer: true,
    }).cents;
  }

  return (
    <>
      <SimpleNav user={{ email: user.email }} />
      <div className="dash-wrap">
        <div className="dash-header">
          <div>
            <h1>Your voices</h1>
            <p>Download links, setup guides, and version history for everything you own.</p>
          </div>
        </div>

        {checkout === 'success' && (
          <div className="form-success" style={{ marginBottom: '1.5rem' }}>
            Payment received — your voices are unlocked below.
          </div>
        )}

        {upsellVoices.length > 0 && lastPaidOrder && (
          <UpsellPanel
            packId={lastPaidOrder.packId}
            packName={lastPaidOrder.pack.name}
            voices={upsellVoices}
            addonPriceCents={addonPriceCents}
            discountedPriceCents={discountedAddonPriceCents}
          />
        )}

        {!user.emailVerified && (
          <div className="dash-banner">
            <span>Verify your email to keep access to your account secure.</span>
            <ResendVerificationButton />
          </div>
        )}

        {entitlements.length === 0 ? (
          <div className="dash-empty">
            You don&apos;t own any voice presets yet.{' '}
            <a href="/#pricing">Browse packs</a> to get started.
          </div>
        ) : (
          <div className="owned-grid">
            {entitlements.map((ent) => {
              const v = ent.voice;
              return (
                <div className="owned-card" key={ent.id}>
                  <div className="voice-img-slot">
                    <NextImage src={v.imageUrl} alt={v.name} width={52} height={52} style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="owned-body">
                    <div className="owned-top">
                      <div>
                        <div className="owned-name">{v.name}</div>
                        <div className="owned-style">{v.style}</div>
                      </div>
                      <span className="owned-version">v{v.version}</span>
                    </div>
                    <div className="owned-actions">
                      <a className="btn btn-purple" href={`/api/downloads/${v.id}`}>
                        <i className="ti ti-download" /> Download
                      </a>
                      {v.youtubeUrl && (
                        <a className="btn btn-ghost" href={v.youtubeUrl} target="_blank" rel="noreferrer">
                          <i className="ti ti-brand-youtube" /> Setup guide
                        </a>
                      )}
                    </div>
                    {v.updates.length > 0 && (
                      <details className="owned-history">
                        <summary>Update history ({v.updates.length})</summary>
                        <div className="owned-history-list">
                          {v.updates.map((u) => (
                            <div className="owned-history-item" key={u.id}>
                              <strong>v{u.version}</strong> — {u.notes}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
