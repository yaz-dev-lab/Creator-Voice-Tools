'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function PublishUpdateForm({ voiceId, currentVersion }: { voiceId: string; currentVersion: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch(`/api/admin/voices/${voiceId}/updates`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not publish update.');
        return;
      }
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Update published.</div>}

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="version">New version</label>
          <input id="version" name="version" placeholder={currentVersion} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Release notes</label>
        <textarea id="notes" name="notes" required placeholder="What changed in this version?" />
      </div>

      <div className="field">
        <label htmlFor="file">New deliverable file (optional — leave empty for a notes-only update)</label>
        <input id="file" name="file" type="file" />
      </div>

      <div className="admin-form-actions">
        <button className="btn btn-purple" type="submit" disabled={loading}>
          {loading ? 'Publishing…' : 'Publish update'}
        </button>
      </div>
    </form>
  );
}
