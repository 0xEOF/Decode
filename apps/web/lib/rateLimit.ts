/**
 * Best-effort, in-memory per-IP rate limiter shared by the two AI-calling
 * routes (deep scan + safe prompt generation). This exists purely to bound
 * worst-case cost from a single client looping requests — Reveala stays
 * free and ungated, this is abuse mitigation, not a paywall.
 *
 * State lives in module scope, so it's shared across requests served by
 * the same warm serverless instance, but NOT across concurrent/multi-region
 * instances or after a cold start. That's an accepted tradeoff for
 * launch-week simplicity, not a hard guarantee — if usage grows enough
 * that this matters, swap this module's internals for a Redis-backed
 * limiter (e.g. @upstash/ratelimit) without touching the routes that call it.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20;

// Crude eviction so one-off IPs that never come back don't grow this forever.
const MAX_TRACKED_KEYS = 5000;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window resets — 0 when `allowed` is true. */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.count, retryAfterSeconds: 0 };
}

/** Best-effort client identity from the headers a proxy (Vercel's edge network included) sets — never fully trustworthy, good enough for abuse mitigation. */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
