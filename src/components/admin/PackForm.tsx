'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Pack = {
  id: string;
  name: string;
  priceCents: number;
  description: string;
  features: string[];
  voicePicks: number;
  active: boolean;
  discountPriceCents: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  addonPriceCents: number | null;
};

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string with a Z.
function toLocalInputValue(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PackForm({ pack }: { pack?: Pack }) {
  const router = useRouter();
  const isNew = !pack;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const discountPriceDollars = String(form.get('discountPriceDollars') ?? '').trim();
      const discountStartsAt = String(form.get('discountStartsAt') ?? '').trim();
      const discountEndsAt = String(form.get('discountEndsAt') ?? '').trim();
      const addonPriceDollars = String(form.get('addonPriceDollars') ?? '').trim();

      if ((discountPriceDollars || discountStartsAt || discountEndsAt) && !(discountPriceDollars && discountStartsAt && discountEndsAt)) {
        setError('To schedule a discount, fill in the discount price, start, and end — all three.');
        setLoading(false);
        return;
      }

      const payload = {
        id: isNew ? String(form.get('id') ?? '') || undefined : undefined,
        name: String(form.get('name') ?? ''),
        priceDollars: Number(form.get('priceDollars') ?? 0),
        description: String(form.get('description') ?? ''),
        features: String(form.get('features') ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        voicePicks: Number(form.get('voicePicks') ?? 0),
        active: form.get('active') === 'on',
        discountPriceDollars: discountPriceDollars ? Number(discountPriceDollars) : null,
        discountStartsAt: discountStartsAt ? new Date(discountStartsAt).toISOString() : null,
        discountEndsAt: discountEndsAt ? new Date(discountEndsAt).toISOString() : null,
        addonPriceDollars: addonPriceDollars ? Number(addonPriceDollars) : null,
      };

      const res = await fetch(isNew ? '/api/admin/packs' : `/api/admin/packs/${pack!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save pack.');
        return;
      }
      if (isNew) {
        router.push(`/admin/packs/${data.pack.id}`);
      } else {
        setSuccess(true);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Saved.</div>}

      {isNew && (
        <div className="field">
          <label htmlFor="id">Pack id (URL-safe, leave blank to derive from name)</label>
          <input id="id" name="id" placeholder="e.g. summer-bundle" />
        </div>
      )}

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={pack?.name} required />
        </div>
        <div className="field">
          <label htmlFor="priceDollars">Price (USD)</label>
          <input
            id="priceDollars"
            name="priceDollars"
            type="number"
            min={0}
            step="0.01"
            defaultValue={pack ? (pack.priceCents / 100).toFixed(2) : undefined}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={pack?.description} required />
      </div>

      <div className="field">
        <label htmlFor="features">Features (one per line)</label>
        <textarea id="features" name="features" defaultValue={pack?.features.join('\n')} rows={4} />
      </div>

      <div className="field">
        <label htmlFor="voicePicks">
          Voice picks (how many voices the customer chooses — set to your total catalog size for a
          &quot;full pack&quot;, or 0 for a custom/manual-fulfillment pack)
        </label>
        <input id="voicePicks" name="voicePicks" type="number" min={0} defaultValue={pack?.voicePicks ?? 1} required />
      </div>

      <div className="field">
        <label htmlFor="addonPriceDollars">
          Post-purchase add-on price (USD) — lets a customer who already bought this pack add one
          more voice from their dashboard. Leave blank to disable the upsell for this pack.
        </label>
        <input
          id="addonPriceDollars"
          name="addonPriceDollars"
          type="number"
          min={0}
          step="0.01"
          defaultValue={pack?.addonPriceCents != null ? (pack.addonPriceCents / 100).toFixed(2) : undefined}
        />
      </div>

      <div className="field">
        <label>Scheduled discount (optional — fill in all three to enable)</label>
      </div>
      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="discountPriceDollars">Discounted price (USD)</label>
          <input
            id="discountPriceDollars"
            name="discountPriceDollars"
            type="number"
            min={0}
            step="0.01"
            defaultValue={pack?.discountPriceCents != null ? (pack.discountPriceCents / 100).toFixed(2) : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="discountStartsAt">Starts</label>
          <input
            id="discountStartsAt"
            name="discountStartsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(pack?.discountStartsAt ?? null)}
          />
        </div>
        <div className="field">
          <label htmlFor="discountEndsAt">Ends</label>
          <input
            id="discountEndsAt"
            name="discountEndsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(pack?.discountEndsAt ?? null)}
          />
        </div>
      </div>

      {!isNew && (
        <div className="admin-checkbox-row">
          <input id="active" name="active" type="checkbox" defaultChecked={pack?.active ?? true} />
          <label htmlFor="active">Active (visible on the storefront)</label>
        </div>
      )}

      <div className="admin-form-actions">
        <button className="btn btn-purple" type="submit" disabled={loading}>
          {loading ? 'Saving…' : isNew ? 'Create pack' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
