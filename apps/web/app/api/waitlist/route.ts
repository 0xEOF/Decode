import { checkRateLimit, getClientKey } from '../../../lib/rateLimit';

// Needs the Node.js runtime (not Edge) — reads process.env at request time.
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Namespaced key so waitlist signups draw from their own budget, separate
  // from the AI-calling routes' shared per-IP allowance.
  const rateLimit = checkRateLimit(`waitlist:${getClientKey(request)}`);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // Always logged so a signup is never silently lost even before a
  // downstream integration is configured — this project has no DB yet.
  console.log(`[waitlist] signup: ${email}`);

  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'decode-landing', timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('[waitlist] webhook delivery failed', err);
    }
  }

  return Response.json({ ok: true });
}
