'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NewVoiceForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch('/api/admin/voices', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create voice.');
        return;
      }
      router.push(`/admin/voices/${data.voice.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required placeholder="e.g. Peterbot" />
        </div>
        <div className="field">
          <label htmlFor="initials">Initials</label>
          <input id="initials" name="initials" required maxLength={3} placeholder="PB" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="personaName">Creator/persona name it&apos;s styled after</label>
        <input id="personaName" name="personaName" required placeholder="e.g. IShowSpeed" />
      </div>

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="style">Style</label>
          <input id="style" name="style" required placeholder="e.g. Competitive FN" />
        </div>
        <div className="field">
          <label htmlFor="color">Accent color</label>
          <input id="color" name="color" type="color" defaultValue="#7c5cbf" />
        </div>
      </div>

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="tag">Tag</label>
          <select id="tag" name="tag" defaultValue="new">
            <option value="hot">Hot</option>
            <option value="fan">Fan pick</option>
            <option value="new">New</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="version">Initial version</label>
          <input id="version" name="version" defaultValue="1.0.0" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="youtubeUrl">YouTube setup guide URL</label>
        <input id="youtubeUrl" name="youtubeUrl" type="url" placeholder="https://youtube.com/watch?v=..." />
      </div>

      <div className="field">
        <label htmlFor="image">Voice image</label>
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" required />
      </div>

      <div className="field">
        <label htmlFor="preview">Preview audio (optional)</label>
        <input id="preview" name="preview" type="file" accept="audio/*" />
      </div>

      <div className="field">
        <label htmlFor="deliverable">Deliverable file (the actual voice preset package)</label>
        <input id="deliverable" name="deliverable" type="file" required />
      </div>

      <div className="admin-form-actions">
        <button className="btn btn-purple" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create voice'}
        </button>
      </div>
    </form>
  );
}
