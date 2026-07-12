'use client';

import { useState } from 'react';
import Image from 'next/image';

export type UpsellVoice = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  owned: boolean;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function UpsellPanel({
  packId,
  packName,
  voices,
  addonPriceCents,
  discountedPriceCents,
}: {
  packId: string;
  packName: string;
  voices: UpsellVoice[];
  addonPriceCents: number;
  discountedPriceCents: number;
}) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addVoice(slug: string) {
    setError(null);
    setLoadingSlug(slug);
    try {
      const res = await fetch('/api/checkout/addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, voiceSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start checkout.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not start checkout. Please try again.');
    } finally {
      setLoadingSlug(null);
    }
  }

  const hasDiscount = discountedPriceCents < addonPriceCents;

  return (
    <div className="upsell-panel">
      <div className="upsell-header">
        <h3>Add more voices to your {packName}</h3>
        <p>
          {hasDiscount ? (
            <>
              <span className="price-original">{money(addonPriceCents)}</span> {money(discountedPriceCents)} per
              voice — returning customer discount
            </>
          ) : (
            `${money(discountedPriceCents)} per voice`
          )}
        </p>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="upsell-grid">
        {voices.map((v) => (
          <div className={`upsell-card${v.owned ? ' owned' : ''}`} key={v.id}>
            <Image src={v.imageUrl} alt={v.name} width={40} height={40} style={{ objectFit: 'cover', borderRadius: '50%' }} />
            <div className="upsell-name">{v.name}</div>
            {v.owned ? (
              <div className="upsell-owned-label">You already own this voice</div>
            ) : (
              <button className="btn btn-purple" onClick={() => addVoice(v.slug)} disabled={loadingSlug === v.slug}>
                {loadingSlug === v.slug ? 'Starting…' : `Add for ${money(discountedPriceCents)}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
