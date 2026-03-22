/**
 * @epicai/core — Orchestrator Provider
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
import { createLogger } from '../logger.js';

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
  const log = createLogger('orchestrator.ollama', config.logLevel);

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    const toolCount = params.tools?.length ?? 0;

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

    log.info('request', {
      model: config.model,
      messageCount: params.messages.length,
      toolCount,
      toolNames: params.tools?.map(t => t.name) ?? [],
    });

    log.debug('request body', { body });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        const truncated = rawText.slice(0, 200);
        log.error('request failed', { status: response.status, body: truncated });
        throw new Error(`Ollama returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as OllamaFullResponse;
      const durationMs = Date.now() - start;

      log.debug('raw response', { data });

      const toolCalls = (data.message?.tool_calls ?? []).map((tc: OllamaToolCall, i: number) => ({
        id: `call_${i}`,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

      const finishReason = toolCalls.length > 0 ? 'tool_calls' as const : 'stop' as const;

      log.info('response', {
        model: config.model,
        durationMs,
        finishReason,
        toolCallCount: toolCalls.length,
        toolCallNames: toolCalls.map(tc => tc.name),
        promptTokens: data.prompt_eval_count ?? null,
        completionTokens: data.eval_count ?? null,
        contentLength: data.message?.content?.length ?? 0,
      });

      if (toolCount > 0 && toolCalls.length === 0) {
        log.warn('model returned no tool calls despite tools being provided', {
          toolCount,
          toolNames: params.tools?.map(t => t.name) ?? [],
          finishReason,
          promptTokens: data.prompt_eval_count ?? null,
          contentPreview: data.message?.content?.slice(0, 200) ?? null,
        });
      }

      return {
        content: data.message?.content ?? null,
        toolCalls,
        finishReason,
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

function createVLLMLLM(config: OrchestratorConfig): LLMFunction {
  const baseUrl = config.baseUrl ?? 'http://localhost:8000';
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const log = createLogger('orchestrator.vllm', config.logLevel);

  return async (params: { messages: LLMMessage[]; tools?: LLMToolDefinition[] }): Promise<LLMResponse> => {
    const toolCount = params.tools?.length ?? 0;

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

    log.info('request', {
      model: config.model,
      messageCount: params.messages.length,
      toolCount,
      toolNames: params.tools?.map(t => t.name) ?? [],
    });

    log.debug('request body', { body });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        const truncated = rawText.slice(0, 200);
        log.error('request failed', { status: response.status, body: truncated });
        throw new Error(`vLLM returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as OpenAICompatResponse;
      const durationMs = Date.now() - start;
      const choice = data.choices?.[0];

      log.debug('raw response', { data: data as unknown as Record<string, unknown> });

      const toolCalls = (choice?.message?.tool_calls ?? []).map((tc: OpenAIToolCall) => {
        let parsedArgs: Record<string, unknown> = {};
        if (typeof tc.function.arguments === 'string') {
          try {
            parsedArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          } catch {
            log.warn('malformed tool call JSON from model', { toolName: tc.function.name, raw: tc.function.arguments });
            parsedArgs = {};
          }
        } else {
          parsedArgs = tc.function.arguments;
        }
        return { id: tc.id, name: tc.function.name, arguments: parsedArgs };
      });

      const finishReason = choice?.finish_reason === 'tool_calls' ? 'tool_calls' as const : 'stop' as const;

      log.info('response', {
        model: config.model,
        durationMs,
        finishReason,
        toolCallCount: toolCalls.length,
        toolCallNames: toolCalls.map(tc => tc.name),
        promptTokens: data.usage?.prompt_tokens ?? null,
        completionTokens: data.usage?.completion_tokens ?? null,
        contentLength: choice?.message?.content?.length ?? 0,
      });

      if (toolCount > 0 && toolCalls.length === 0) {
        log.warn('model returned no tool calls despite tools being provided', {
          toolCount,
          toolNames: params.tools?.map(t => t.name) ?? [],
          finishReason,
          promptTokens: data.usage?.prompt_tokens ?? null,
          contentPreview: choice?.message?.content?.slice(0, 200) ?? null,
        });
      }

      return {
        content: choice?.message?.content ?? null,
        toolCalls,
        finishReason,
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

interface OllamaFullResponse {
  message?: {
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
  load_duration?: number;
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
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
