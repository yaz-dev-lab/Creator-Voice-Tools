'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NewVouchVideoForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const payload = {
        youtubeUrl: String(form.get('youtubeUrl') ?? '').trim(),
        title: String(form.get('title') ?? '').trim(),
      };
      const res = await fetch('/api/admin/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not add video.');
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="field">
        <label htmlFor="youtubeUrl">YouTube URL</label>
        <input id="youtubeUrl" name="youtubeUrl" type="url" required placeholder="https://youtube.com/watch?v=..." />
      </div>

      <div className="field">
        <label htmlFor="title">Title (optional)</label>
        <input id="title" name="title" placeholder="e.g. My reaction to buying this product" />
      </div>

      <div className="admin-form-actions">
        <button className="btn btn-purple" type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add video'}
        </button>
      </div>
    </form>
  );
}
