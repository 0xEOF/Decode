'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { joinWaitlist, WaitlistError } from '../../lib/waitlist';

interface Props {
  triggerClassName?: string;
  triggerLabel?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function WaitlistForm({ triggerClassName, triggerLabel = 'Join waitlist' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  function close() {
    setIsOpen(false);
    setStatus('idle');
    setError(null);
    setEmail('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    setError(null);
    try {
      await joinWaitlist(email.trim());
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof WaitlistError ? err.message : 'Something went wrong — try again.');
    }
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setIsOpen(true)}>
        {triggerLabel}
      </button>
      {isOpen && (
        <div className="waitlist-overlay" role="presentation" onClick={close}>
          <div
            className="waitlist-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="waitlist-dismiss" onClick={close} aria-label="Close">
              ×
            </button>
            {status === 'success' ? (
              <>
                <h2 id="waitlist-heading">You&apos;re on the list</h2>
                <p className="waitlist-hint">We&apos;ll email you when the full scheduler is ready.</p>
              </>
            ) : (
              <>
                <h2 id="waitlist-heading">Join the waitlist</h2>
                <p className="waitlist-hint">
                  Accounts and the full AI Student Success Assistant aren&apos;t live yet — leave your email and
                  we&apos;ll let you know the moment they are.
                </p>
                <form className="waitlist-form" onSubmit={handleSubmit}>
                  <label htmlFor="waitlist-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    className="waitlist-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={!email.trim() || status === 'submitting'}>
                    {status === 'submitting' ? 'Joining…' : 'Join waitlist'}
                  </button>
                </form>
                {error && <p className="waitlist-error">{error}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
