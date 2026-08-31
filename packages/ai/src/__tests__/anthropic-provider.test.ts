import { afterEach, describe, expect, it, vi } from 'vitest';

const anthropicCtor = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor(options: unknown) {
      anthropicCtor(options);
    }
  },
}));

const { createAnthropicClient } = await import('../anthropic-provider.js');

describe('createAnthropicClient', () => {
  const original = process.env.ANTHROPIC_WORKSPACE_ID;

  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_WORKSPACE_ID;
    else process.env.ANTHROPIC_WORKSPACE_ID = original;
    anthropicCtor.mockClear();
  });

  it('omits defaultHeaders when ANTHROPIC_WORKSPACE_ID is unset (workspace-scoped key)', () => {
    delete process.env.ANTHROPIC_WORKSPACE_ID;
    createAnthropicClient();
    expect(anthropicCtor).toHaveBeenCalledWith({});
  });

  it('sends anthropic-workspace-id when ANTHROPIC_WORKSPACE_ID is set (identity-linked key)', () => {
    process.env.ANTHROPIC_WORKSPACE_ID = 'wrkspc_abc123';
    createAnthropicClient();
    expect(anthropicCtor).toHaveBeenCalledWith({
      defaultHeaders: { 'anthropic-workspace-id': 'wrkspc_abc123' },
    });
  });
});
