import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, getClientKey } from './rateLimit';

describe('checkRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit, then blocks', () => {
    const key = 'test-ip-1';
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    const a = 'test-ip-2a';
    const b = 'test-ip-2b';
    for (let i = 0; i < 20; i++) checkRateLimit(a);
    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(true);
  });

  it('decrements remaining on each allowed request', () => {
    const key = 'test-ip-3';
    expect(checkRateLimit(key).remaining).toBe(19);
    expect(checkRateLimit(key).remaining).toBe(18);
    expect(checkRateLimit(key).remaining).toBe(17);
  });

  it('resets the window after it elapses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const key = 'test-ip-4';

    for (let i = 0; i < 20; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T01:00:00.001Z')); // just past the 1h window
    const afterReset = checkRateLimit(key);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(19);
  });
});

describe('getClientKey', () => {
  it('uses the first address in x-forwarded-for', () => {
    const request = new Request('http://localhost', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
    expect(getClientKey(request)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const request = new Request('http://localhost', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(getClientKey(request)).toBe('9.9.9.9');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const request = new Request('http://localhost');
    expect(getClientKey(request)).toBe('unknown');
  });
});
