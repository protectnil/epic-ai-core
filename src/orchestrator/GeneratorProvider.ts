/**
 * @epic-ai/core — Generator Provider
 * Abstraction for cloud model providers (OpenAI, Anthropic, custom).
 * Called only for final synthesis — not for tool routing.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  GeneratorConfig,
  LLMFunction,
  LLMMessage,
  LLMToolDefinition,
  LLMResponse,
} from '../types/index.js';

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Create an LLM function from generator config.
 * If the config provides a custom llm function, use it directly.
 * Otherwise, build one from the provider and model settings.
 */
export function createGeneratorLLM(config: GeneratorConfig): LLMFunction {
  if (config.llm) return config.llm;

  switch (config.provider) {
    case 'openai':
      return createOpenAILLM(config);
    case 'anthropic':
      return createAnthropicLLM(config);
    case 'ollama':
      return createOllamaGeneratorLLM(config);
    case 'custom':
      throw new Error('Custom generator provider requires an llm function in config');
    default:
      throw new Error(`Unknown generator provider: ${config.provider as string}`);
  }
}

function createOpenAILLM(config: GeneratorConfig): LLMFunction {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com';
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!config.apiKey) {
    throw new Error('OpenAI generator requires an apiKey');
  }

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: params.messages,
      max_tokens: config.maxTokens ?? 4096,
    };

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        const truncated = rawText.slice(0, 200);
        throw new Error(`OpenAI returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as OpenAIResponse;
      const choice = data.choices?.[0];

      const toolCalls = (choice?.message?.tool_calls ?? []).map((tc: OpenAIToolCall) => {
        let parsedArgs: Record<string, unknown> = {};
        if (typeof tc.function.arguments === 'string') {
          try {
            parsedArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          } catch {
            // Malformed JSON from model — use empty args
            parsedArgs = {};
          }
        } else {
          parsedArgs = tc.function.arguments;
        }
        return { id: tc.id, name: tc.function.name, arguments: parsedArgs };
      });

      return {
        content: choice?.message?.content ?? null,
        toolCalls,
        finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

function createAnthropicLLM(config: GeneratorConfig): LLMFunction {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!config.apiKey) {
    throw new Error('Anthropic generator requires an apiKey');
  }

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    // Separate system message from conversation messages
    const systemMessages = params.messages.filter(m => m.role === 'system');
    const conversationMessages = params.messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      messages: conversationMessages.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.content,
      })),
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.map(m => m.content).join('\n\n');
    }

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        const truncated = rawText.slice(0, 200);
        throw new Error(`Anthropic returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as AnthropicResponse;

      const textBlocks = (data.content ?? []).filter((b: AnthropicBlock) => b.type === 'text');
      const toolBlocks = (data.content ?? []).filter((b: AnthropicBlock) => b.type === 'tool_use');

      const content = textBlocks.map((b: AnthropicTextBlock) => b.text).join('') || null;
      const toolCalls = toolBlocks.map((b: AnthropicToolBlock) => ({
        id: b.id,
        name: b.name,
        arguments: b.input as Record<string, unknown>,
      }));

      return {
        content,
        toolCalls,
        finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

function createOllamaGeneratorLLM(config: GeneratorConfig): LLMFunction {
  const baseUrl = config.baseUrl ?? 'http://localhost:11434';
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: params.messages,
      stream: false,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        const truncated = rawText.slice(0, 200);
        throw new Error(`Ollama returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as OllamaResponse;

      return {
        content: data.message?.content ?? null,
        toolCalls: [],
        finishReason: 'stop',
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

// OpenAI types
interface OpenAIToolCall {
  id: string;
  function: { name: string; arguments: string | Record<string, unknown> };
}

interface OpenAIResponse {
  choices?: {
    message?: {
      content?: string;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason?: string;
  }[];
}

// Anthropic types
interface AnthropicTextBlock { type: 'text'; text: string }
interface AnthropicToolBlock { type: 'tool_use'; id: string; name: string; input: unknown }
type AnthropicBlock = AnthropicTextBlock | AnthropicToolBlock;

interface AnthropicResponse {
  content?: AnthropicBlock[];
  stop_reason?: string;
}

// Ollama types
interface OllamaResponse {
  message?: { content?: string };
}
