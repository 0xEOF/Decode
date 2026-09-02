import { AnthropicProvider, createAnthropicClient, generateSafePrompt } from '@decode/ai';
import type { AIProvider } from '@decode/ai';

// Needs the Node.js runtime (not Edge) — the Anthropic SDK isn't Edge-compatible.
export const runtime = 'nodejs';

let provider: AIProvider | null = null;
function getProvider(): AIProvider {
  if (!provider) provider = new AnthropicProvider(createAnthropicClient());
  return provider;
}

export async function POST(request: Request) {
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
    const message = err instanceof Error ? err.message : 'Safe prompt generation failed.';
    const status = message.includes('too long') || message.includes('is required') ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
