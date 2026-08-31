import { AnthropicProvider, createAnthropicClient, scanForCovertInstructions } from '@decode/ai';
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
  const text = body?.text;

  if (typeof text !== 'string') {
    return Response.json({ error: 'Expected { text: string } in the request body.' }, { status: 400 });
  }

  try {
    const result = await scanForCovertInstructions(getProvider(), text);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deep scan failed.';
    const status = message.includes('too long') ? 413 : 502;
    return Response.json({ error: message }, { status });
  }
}
