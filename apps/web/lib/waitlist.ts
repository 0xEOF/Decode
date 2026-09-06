/**
 * Client for the waitlist signup endpoint (app/api/waitlist/route.ts).
 * Same shape as safePrompt.ts / aiScan.ts — just calls our own backend.
 */
export class WaitlistError extends Error {}

export async function joinWaitlist(email: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new WaitlistError(typeof body?.error === 'string' ? body.error : `Waitlist request failed (${res.status}).`);
  }
}
