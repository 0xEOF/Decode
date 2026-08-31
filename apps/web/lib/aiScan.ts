/**
 * Client for the server-side AI deep scan (app/api/scan-covert/route.ts).
 * The API key never reaches the browser — this just calls our own backend,
 * which holds the key and talks to Claude via @decode/ai.
 */
import type { AIFinding } from '@decode/content-scanner';

export class AIScanError extends Error {}

export async function scanWithAI(text: string, signal?: AbortSignal): Promise<AIFinding[]> {
  const res = await fetch('/api/scan-covert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AIScanError(typeof body?.error === 'string' ? body.error : `Deep scan request failed (${res.status}).`);
  }

  const body = await res.json();
  if (!Array.isArray(body?.findings)) {
    throw new AIScanError('Deep scan returned an unexpected response.');
  }
  return body.findings;
}
