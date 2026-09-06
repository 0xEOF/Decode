import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaitlistError, joinWaitlist } from './waitlist';

describe('joinWaitlist', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));

    await expect(joinWaitlist('a@b.com')).resolves.toBeUndefined();
  });

  it('throws WaitlistError with the server-provided message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Enter a valid email address.' }) }),
    );

    await expect(joinWaitlist('nope')).rejects.toThrow(WaitlistError);
    await expect(joinWaitlist('nope')).rejects.toThrow('Enter a valid email address.');
  });

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('bad json');
        },
      }),
    );

    await expect(joinWaitlist('a@b.com')).rejects.toThrow('Waitlist request failed (500)');
  });
});
