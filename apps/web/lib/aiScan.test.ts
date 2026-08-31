import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIScanError, scanWithAI } from './aiScan';

describe('scanWithAI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns findings on a successful response', async () => {
    const findings = [{ quote: 'foo', label: 'x', reason: 'y', category: 'covert-instruction' as const }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ findings }),
      }),
    );

    const result = await scanWithAI('some text');
    expect(result).toEqual(findings);
  });

  it('throws AIScanError with the server-provided message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'boom' }),
      }),
    );

    await expect(scanWithAI('x')).rejects.toThrow(AIScanError);
    await expect(scanWithAI('x')).rejects.toThrow('boom');
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

    await expect(scanWithAI('x')).rejects.toThrow('Deep scan request failed (500)');
  });

  it('throws when the response body has no findings array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: true }),
      }),
    );

    await expect(scanWithAI('x')).rejects.toThrow('unexpected response');
  });
});
