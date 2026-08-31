import type { z } from 'zod';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface GenerateParams {
  system?: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
  effort?: Effort;
}

export interface GenerateResult {
  text: string;
}

export interface ExtractParams<T> {
  system?: string;
  prompt: string;
  /** Zod schema the response is validated against — see AnthropicProvider for how this maps to structured output. */
  schema: z.ZodType<T>;
  maxTokens?: number;
  model?: string;
  effort?: Effort;
}

export interface ExtractResult<T> {
  /** null when the model failed to produce output matching the schema. */
  data: T | null;
}

export interface ExtractFromImageParams<T> extends ExtractParams<T> {
  imageBase64: string;
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

export interface ClassifyParams {
  system?: string;
  prompt: string;
  /** The exact set of labels the model must choose from. */
  labels: [string, ...string[]];
  model?: string;
}

export interface ClassifyResult {
  label: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. */
  inputSchema: Record<string, unknown>;
}

export interface ToolCallParams {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  tools: ToolDefinition[];
  maxTokens?: number;
  model?: string;
}

export interface ToolUseRequest {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolCallResult {
  /** Any assistant text alongside (or instead of) a tool call. */
  text: string;
  /** Empty when the model answered without needing a tool. */
  toolUses: ToolUseRequest[];
  stopReason: string | null;
}

/**
 * Provider-agnostic AI abstraction (roadmap §20/ROADMAP.md). Application
 * code depends on this interface, never directly on an SDK — swapping or
 * adding a model provider means writing a new implementation of this file,
 * not touching call sites.
 *
 * `toolCall` returns one turn (the model's response to the messages given)
 * rather than running an agentic loop itself — the caller owns the loop
 * (execute the requested tools, append results, call again), since that
 * control flow is specific to what's calling it (e.g. the scheduling
 * assistant) and doesn't belong baked into the provider.
 */
export interface AIProvider {
  generate(params: GenerateParams): Promise<GenerateResult>;
  extract<T>(params: ExtractParams<T>): Promise<ExtractResult<T>>;
  extractFromImage<T>(params: ExtractFromImageParams<T>): Promise<ExtractResult<T>>;
  classify(params: ClassifyParams): Promise<ClassifyResult>;
  toolCall(params: ToolCallParams): Promise<ToolCallResult>;
}
