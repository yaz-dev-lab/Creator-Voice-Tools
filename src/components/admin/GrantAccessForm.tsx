'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function GrantAccessForm({
  userId,
  voices,
}: {
  userId: string;
  voices: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const voiceId = String(form.get('voiceId') ?? '');
      if (!voiceId) {
        setError('Choose a voice.');
        return;
      }
      const res = await fetch('/api/admin/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, voiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not grant access.');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" style={{ maxWidth: 320 }} onSubmit={onSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="voiceId">Grant a voice</label>
        <select id="voiceId" name="voiceId" defaultValue="">
          <option value="" disabled>
            Choose a voice…
          </option>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-form-actions">
        <button className="btn btn-purple admin-btn-sm" type="submit" disabled={loading}>
          {loading ? 'Granting…' : 'Grant access'}
        </button>
      </div>
    </form>
  );
}
