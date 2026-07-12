'use client';

import { useState } from 'react';

export default function ResendVerificationButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function onClick() {
    setState('sending');
    await fetch('/api/auth/resend-verification', { method: 'POST' });
    setState('sent');
  }

  return (
    <button className="btn btn-ghost" onClick={onClick} disabled={state !== 'idle'}>
      {state === 'sent' ? 'Email sent' : state === 'sending' ? 'Sending…' : 'Resend verification email'}
    </button>
  );
}
