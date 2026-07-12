'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Voice = {
  id: string;
  name: string;
  personaName: string;
  style: string;
  color: string;
  tag: string;
  initials: string;
  youtubeUrl: string | null;
  imageUrl: string;
};

export default function EditVoiceForm({ voice }: { voice: Voice }) {
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
      const res = await fetch(`/api/admin/voices/${voice.id}`, { method: 'PATCH', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save changes.');
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Saved.</div>}

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={voice.name} required />
        </div>
        <div className="field">
          <label htmlFor="initials">Initials</label>
          <input id="initials" name="initials" defaultValue={voice.initials} maxLength={3} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="personaName">Creator/persona name it&apos;s styled after</label>
        <input id="personaName" name="personaName" defaultValue={voice.personaName} required />
      </div>

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="style">Style</label>
          <input id="style" name="style" defaultValue={voice.style} required />
        </div>
        <div className="field">
          <label htmlFor="color">Accent color</label>
          <input id="color" name="color" type="color" defaultValue={voice.color} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="tag">Tag</label>
        <select id="tag" name="tag" defaultValue={voice.tag}>
          <option value="hot">Hot</option>
          <option value="fan">Fan pick</option>
          <option value="new">New</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="youtubeUrl">YouTube setup guide URL</label>
        <input id="youtubeUrl" name="youtubeUrl" type="url" defaultValue={voice.youtubeUrl ?? ''} />
      </div>

      <div className="field">
        <label htmlFor="image">Replace image (optional)</label>
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>

      <div className="field">
        <label htmlFor="preview">Replace preview audio (optional)</label>
        <input id="preview" name="preview" type="file" accept="audio/*" />
      </div>

      <div className="admin-form-actions">
        <button className="btn btn-purple" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
