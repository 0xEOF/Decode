import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafePromptError, generateSafePromptRequest } from './safePrompt';

const input = { task: 'Grade this', findingsSummary: [], cleanText: 'body text' };

describe('generateSafePromptRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the prompt on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ prompt: 'FRAMING\n\n---CONTENT---\nbody text\n---END CONTENT---' }),
      }),
    );

    const result = await generateSafePromptRequest(input);
    expect(result).toBe('FRAMING\n\n---CONTENT---\nbody text\n---END CONTENT---');
  });

  it('throws SafePromptError with the server-provided message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'boom' }),
      }),
    );

    await expect(generateSafePromptRequest(input)).rejects.toThrow(SafePromptError);
    await expect(generateSafePromptRequest(input)).rejects.toThrow('boom');
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

    await expect(generateSafePromptRequest(input)).rejects.toThrow('Safe prompt request failed (500)');
  });

  it('throws when the response body has no prompt string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: true }),
      }),
    );

    await expect(generateSafePromptRequest(input)).rejects.toThrow('malformed');
  });
});
