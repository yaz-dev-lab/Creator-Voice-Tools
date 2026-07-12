'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function VerifyEmailAction({ token }: { token: string | null }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (!token) return;
    setState('loading');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Verification failed');
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Verify your email</h1>
        {!token && <div className="form-error">This link is missing its verification token.</div>}
        {state === 'error' && <div className="form-error">{error}</div>}
        {state === 'done' ? (
          <>
            <div className="form-success">Your email is verified.</div>
            <Link className="btn btn-purple auth-submit" href="/dashboard">
              Go to dashboard
            </Link>
          </>
        ) : (
          <>
            <p className="auth-sub">Click below to confirm this email address belongs to you.</p>
            <button
              className="btn btn-purple auth-submit"
              onClick={onConfirm}
              disabled={!token || state === 'loading'}
            >
              {state === 'loading' ? 'Verifying…' : 'Verify email'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
