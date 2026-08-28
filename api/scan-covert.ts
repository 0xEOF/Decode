/**
 * Vercel serverless function for the AI deep scan.
 *
 * Vercel does not run server/index.ts (a long-lived Express process) — its
 * runtime maps `/api/<file>` to individual serverless functions, one per
 * file, each invoked per-request. This file is that mapping for
 * `/api/scan-covert`; server/scan.ts holds the actual Claude-calling logic
 * shared with the local Express server (server/index.ts) used by
 * `npm run dev:full` / `npm run start`.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { scanForCovertInstructions } from '../server/scan.ts';

// Minimal shape of what Vercel's Node.js runtime actually hands a function —
// IncomingMessage/ServerResponse plus its parsed-body and response helpers.
// Typed locally instead of depending on @vercel/node purely for these types.
interface VercelRequest extends IncomingMessage {
  method?: string;
  body?: unknown;
}
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
}

export const config = {
  maxDuration: 30,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const text = (req.body as { text?: unknown } | undefined)?.text;
  if (typeof text !== 'string') {
    res.status(400).json({ error: 'Expected { text: string } in the request body.' });
    return;
  }

  try {
    const result = await scanForCovertInstructions(getClient(), text);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deep scan failed.';
    const status = message.includes('too long') ? 413 : 502;
    res.status(status).json({ error: message });
  }
}
