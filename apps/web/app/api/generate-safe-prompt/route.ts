import { AnthropicProvider, createAnthropicClient, generateSafePrompt } from '@decode/ai';
import type { AIProvider } from '@decode/ai';
import { checkRateLimit, getClientKey } from '../../../lib/rateLimit';

// Needs the Node.js runtime (not Edge) — the Anthropic SDK isn't Edge-compatible.
export const runtime = 'nodejs';

let provider: AIProvider | null = null;
function getProvider(): AIProvider {
  if (!provider) provider = new AnthropicProvider(createAnthropicClient());
  return provider;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const task = body?.task;
  const requirements = body?.requirements;
  const findingsSummary = body?.findingsSummary;
  const cleanText = body?.cleanText;

  if (typeof task !== 'string' || typeof cleanText !== 'string' || !Array.isArray(findingsSummary)) {
    return Response.json(
      { error: 'Expected { task: string, requirements?: string, findingsSummary: string[], cleanText: string }.' },
      { status: 400 },
    );
  }
  if (requirements !== undefined && typeof requirements !== 'string') {
    return Response.json({ error: '"requirements" must be a string when present.' }, { status: 400 });
  }

  try {
    const result = await generateSafePrompt(getProvider(), { task, requirements, findingsSummary, cleanText });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('too long') || message.includes('is required')) {
      return Response.json({ error: message }, { status: 400 });
    }
    console.error('[generate-safe-prompt] generation failed:', err);
    return Response.json(
      { error: 'Safe prompt generation is temporarily unavailable. Please try again later.' },
      { status: 502 },
    );
  }
}
