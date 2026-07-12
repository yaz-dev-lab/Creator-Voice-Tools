'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Generic "POST to this admin endpoint, refresh the page" button used for
// the many one-click admin actions (toggle active, revoke, restore,
// refund, resend verification, promote/demote). Keeping this one component
// instead of a bespoke button per action is what makes new actions cheap.
export default function ActionButton({
  action,
  label,
  pendingLabel,
  confirmText,
  className = 'btn btn-ghost',
  body,
  redirectTo,
}: {
  action: string;
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  className?: string;
  body?: Record<string, unknown>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Action failed.');
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button className={className} onClick={onClick} disabled={loading}>
        {loading ? (pendingLabel ?? 'Working…') : label}
      </button>
      {error && <div className="form-error" style={{ marginTop: 6 }}>{error}</div>}
    </span>
  );
}
