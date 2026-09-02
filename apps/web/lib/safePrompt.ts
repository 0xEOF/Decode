/**
 * Client for the server-side "Safe Prompt" generator
 * (app/api/generate-safe-prompt/route.ts). Same shape as aiScan.ts — the
 * API key never reaches the browser, this just calls our own backend.
 */
export class SafePromptError extends Error {}

export interface GenerateSafePromptInput {
  task: string;
  requirements?: string;
  findingsSummary: string[];
  cleanText: string;
}

export async function generateSafePromptRequest(input: GenerateSafePromptInput, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/generate-safe-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new SafePromptError(
      typeof body?.error === 'string' ? body.error : `Safe prompt request failed (${res.status}).`,
    );
  }

  const body = await res.json();
  if (typeof body?.prompt !== 'string') {
    throw new SafePromptError('Safe prompt response was malformed.');
  }
  return body.prompt;
}
