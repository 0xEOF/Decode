import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type {
  AIProvider,
  ClassifyParams,
  ClassifyResult,
  ExtractFromImageParams,
  ExtractParams,
  ExtractResult,
  GenerateParams,
  GenerateResult,
  ToolCallParams,
  ToolCallResult,
} from './provider';

const DEFAULT_MODEL = 'claude-opus-5';

/**
 * Personal and service-account API keys that aren't scoped to a single
 * workspace require an `anthropic-workspace-id` header on every request —
 * see https://platform.claude.com/docs/en/manage-claude/authentication#select-a-workspace.
 * A workspace-scoped key doesn't need this; ANTHROPIC_WORKSPACE_ID is
 * optional and only added when set. (Carried over from Decode's original
 * server/scan.ts — same fix, now shared by every caller of this provider.)
 */
export function createAnthropicClient(): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic(workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {});
}

export class AnthropicProvider implements AIProvider {
  constructor(private readonly client: Anthropic = createAnthropicClient()) {}

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const response = await this.client.messages.create({
      model: params.model ?? DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      output_config: params.effort ? { effort: params.effort } : undefined,
      messages: [{ role: 'user', content: params.prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return { text };
  }

  async extract<T>(params: ExtractParams<T>): Promise<ExtractResult<T>> {
    const response = await this.client.messages.parse({
      model: params.model ?? DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      output_config: {
        format: zodOutputFormat(params.schema),
        ...(params.effort ? { effort: params.effort } : {}),
      },
      messages: [{ role: 'user', content: params.prompt }],
    });

    return { data: response.parsed_output ?? null };
  }

  async extractFromImage<T>(params: ExtractFromImageParams<T>): Promise<ExtractResult<T>> {
    const response = await this.client.messages.parse({
      model: params.model ?? DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      output_config: {
        format: zodOutputFormat(params.schema),
        ...(params.effort ? { effort: params.effort } : {}),
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: params.mediaType, data: params.imageBase64 },
            },
            { type: 'text', text: params.prompt },
          ],
        },
      ],
    });

    return { data: response.parsed_output ?? null };
  }

  async classify(params: ClassifyParams): Promise<ClassifyResult> {
    const schema = z.object({ label: z.enum(params.labels) });
    const { data } = await this.extract({
      system: params.system,
      prompt: params.prompt,
      schema,
      model: params.model,
      maxTokens: 256,
      effort: 'low',
    });

    if (!data) {
      throw new Error('classify() did not receive a valid label from the model.');
    }
    return { label: data.label };
  }

  async toolCall(params: ToolCallParams): Promise<ToolCallResult> {
    const response = await this.client.messages.create({
      model: params.model ?? DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: params.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const toolUses = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({ id: block.id, name: block.name, input: block.input }));

    return { text, toolUses, stopReason: response.stop_reason };
  }
}
