/**
 * @epic-ai/core — Orchestrator Provider
 * Abstraction for local model providers (Ollama, vLLM, custom).
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  OrchestratorConfig,
  LLMFunction,
  LLMMessage,
  LLMToolDefinition,
  LLMResponse,
} from '../types/index.js';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Create an LLM function from orchestrator config.
 * If the config provides a custom llm function, use it directly.
 * Otherwise, build one from the provider and model settings.
 */
export function createOrchestratorLLM(config: OrchestratorConfig): LLMFunction {
  if (config.llm) return config.llm;

  switch (config.provider) {
    case 'ollama':
      return createOllamaLLM(config);
    case 'vllm':
      return createVLLMLLM(config);
    case 'custom':
      throw new Error('Custom orchestrator provider requires an llm function in config');
    case 'apple-foundation':
      throw new Error('Apple Foundation Model provider is for iOS device runtime only — use ollama or vllm for server runtime');
    default:
      throw new Error(`Unknown orchestrator provider: ${config.provider as string}`);
  }
}

function createOllamaLLM(config: OrchestratorConfig): LLMFunction {
  const baseUrl = config.baseUrl ?? DEFAULT_OLLAMA_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: params.messages,
      stream: false,
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

      const toolCalls = (data.message?.tool_calls ?? []).map((tc: OllamaToolCall, i: number) => ({
        id: `call_${i}`,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

      return {
        content: data.message?.content ?? null,
        toolCalls,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

function createVLLMLLM(config: OrchestratorConfig): LLMFunction {
  const baseUrl = config.baseUrl ?? 'http://localhost:8000';
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: params.messages,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        const truncated = rawText.slice(0, 200);
        throw new Error(`vLLM returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as OpenAICompatResponse;
      const choice = data.choices?.[0];

      const toolCalls = (choice?.message?.tool_calls ?? []).map((tc: OpenAIToolCall) => {
        let parsedArgs: Record<string, unknown> = {};
        if (typeof tc.function.arguments === 'string') {
          try {
            parsedArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          } catch {
            // Malformed JSON from model — use empty args and log
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

// Ollama response types
interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

interface OllamaResponse {
  message?: {
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
}

// OpenAI-compatible response types (vLLM)
interface OpenAIToolCall {
  id: string;
  function: { name: string; arguments: string | Record<string, unknown> };
}

interface OpenAICompatResponse {
  choices?: {
    message?: {
      content?: string;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason?: string;
  }[];
}
