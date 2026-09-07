'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setIsSubmitting(false);

    // Show the same success state either way — never reveal whether an email is registered.
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <p className="auth-success">If an account exists for that email, a reset link is on its way.</p>;
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <p className="auth-error">{error}</p>}
      <label className="form-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <button type="submit" className="button-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
