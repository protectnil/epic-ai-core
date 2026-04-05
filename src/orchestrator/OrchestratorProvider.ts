/**
 * @epicai/legion — Orchestrator Provider
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
const DEFAULT_GATEWAY_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 30000;

let ollamaDeprecationWarned = false;

/**
 * Create an LLM function from orchestrator config.
 * If the config provides a custom llm function, use it directly.
 * Otherwise, build one from the provider and model settings.
 */
export function createOrchestratorLLM(config: OrchestratorConfig): LLMFunction {
  if (config.llm) return config.llm;

  switch (config.provider) {
    case 'auto':
      return createAutoLLM(config);
    case 'ollama': {
      if (!ollamaDeprecationWarned) {
        ollamaDeprecationWarned = true;
        const deprecationLog = createLogger('orchestrator.deprecation');
        deprecationLog.warn('provider "ollama" is deprecated — migrate to "auto" or "vllm". Run: legion help');
      }
      return createOllamaLLM(config);
    }
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

/**
 * Auto-detect provider: probe the gateway/vLLM at baseUrl.
 * If responsive, use OpenAI-compatible (vLLM) path.
 * If not, fall back to Ollama with deprecation warning.
 */
function createAutoLLM(config: OrchestratorConfig): LLMFunction {
  const log = createLogger('orchestrator.auto', config.logLevel);
  let resolved: LLMFunction | null = null;

  // Probe order: explicit baseUrl → gateway → llama.cpp → Ollama
  const probeTargets = config.baseUrl
    ? [config.baseUrl]
    : [DEFAULT_GATEWAY_URL, 'http://localhost:8080', DEFAULT_OLLAMA_URL];

  return async (params) => {
    if (resolved) return resolved(params);

    for (const url of probeTargets) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3_000);
        try {
          const response = await fetch(`${url}/v1/models`, { signal: controller.signal });
          if (response.ok) {
            log.info('auto-detected inference backend', { url });
            resolved = createVLLMLLM({ ...config, baseUrl: url });
            return resolved(params);
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        // This endpoint not available, try next
      }
    }

    throw new Error(
      'No inference backend available.\n\n' +
      'Probed: ' + probeTargets.join(', ') + ' — none responded.\n\n' +
      'Start an inference backend:\n' +
      '  brew install llama.cpp\n' +
      '  llama-server --model <path-to-model.gguf> --port 8080\n\n' +
      'Then run your code again. The SDK will auto-detect it.\n'
    );
  };
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

        // llama.cpp returns 500 when it fails to parse multi-tool output.
        // The error body contains the raw tool call data after "Failed to parse input at pos N: "
        // Example: 'Failed to parse input at pos 158: ; {"name": "check_identity", "parameters": {"userId": "admin@company.com"}}'
        if (response.status === 500 && toolCount > 0 && rawText.includes('Failed to parse input')) {
          // rawText is a JSON envelope: {"error":{"message":"Failed to parse input at pos N: ; {\"name\":...}"}}
          // Unwrap the JSON to get the inner message string with unescaped quotes
          let messageText = rawText;
          try {
            const envelope = JSON.parse(rawText) as { error?: { message?: string } };
            if (envelope.error?.message) {
              messageText = envelope.error.message;
            }
          } catch {
            // Not valid JSON envelope — use rawText as-is
          }
          const recovered = extractToolCallsFromContent(messageText, params.tools ?? []);
          if (recovered.length > 0) {
            const durationMs = Date.now() - start;
            log.info('recovered tool calls from llama.cpp 500 parse error', {
              recovered: recovered.length,
              names: recovered.map(tc => tc.name),
              durationMs,
            });
            return {
              content: null,
              toolCalls: recovered,
              finishReason: 'tool_calls' as const,
            };
          }
        }

        const truncated = rawText.slice(0, 500);
        log.error('request failed', { status: response.status, body: truncated });
        throw new Error(`vLLM returned ${response.status}: ${truncated}`);
      }

      const data = await response.json() as OpenAICompatResponse;
      const durationMs = Date.now() - start;
      const choice = data.choices?.[0];

      log.debug('raw response', { data: data as unknown as Record<string, unknown> });

      let toolCalls = (choice?.message?.tool_calls ?? []).map((tc: OpenAIToolCall) => {
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

      // Fallback: if llama.cpp failed to parse multi-tool output, the tool calls
      // may be embedded in the content as text. Try to extract them.
      if (toolCalls.length === 0 && toolCount > 0 && choice?.message?.content) {
        const extracted = extractToolCallsFromContent(choice.message.content, params.tools ?? []);
        if (extracted.length > 0) {
          log.info('recovered tool calls from content (llama.cpp multi-tool parse fallback)', {
            recovered: extracted.length,
            names: extracted.map(tc => tc.name),
          });
          toolCalls = extracted;
        }
      }

      const finishReason = toolCalls.length > 0 ? 'tool_calls' as const :
        (choice?.finish_reason === 'tool_calls' ? 'tool_calls' as const : 'stop' as const);

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

/**
 * Fallback parser for multi-tool calls that llama.cpp fails to parse.
 * When llama.cpp encounters multiple tool calls (e.g. separated by ; or
 * in Llama 3.1's native format), it may fail at the parser level and
 * put the raw tool-call text into the content field instead.
 *
 * This function attempts to extract tool calls from that text content
 * by looking for function call patterns that match known tool names.
 */
function extractToolCallsFromContent(
  content: string,
  tools: LLMToolDefinition[],
): { id: string; name: string; arguments: Record<string, unknown> }[] {
  const toolNames = new Set(tools.map(t => t.name));
  const results: { id: string; name: string; arguments: Record<string, unknown> }[] = [];

  // Pattern 1: JSON objects with "name" and "arguments"/"parameters" fields
  // Matches: {"name":"search_threats","arguments":{"query":"critical"}}
  const jsonPattern = /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*(?:"arguments"|"parameters")\s*:\s*(\{[^}]*\})[^}]*\}/g;
  let match: RegExpExecArray | null;

  while ((match = jsonPattern.exec(content)) !== null) {
    const name = match[1];
    if (!toolNames.has(name)) continue;

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(match[2]) as Record<string, unknown>;
    } catch {
      // Try to be lenient with malformed JSON
      args = {};
    }

    results.push({ id: `fallback_${results.length}`, name, arguments: args });
  }

  if (results.length > 0) return results;

  // Pattern 2: function-call-like syntax in content
  // Matches: search_threats({"query": "critical"}) or search_threats(query="critical")
  for (const toolName of toolNames) {
    const funcPattern = new RegExp(
      toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(\\s*(\\{[^)]*\\})\\s*\\)',
      'g',
    );

    while ((match = funcPattern.exec(content)) !== null) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(match[1]) as Record<string, unknown>;
      } catch {
        args = {};
      }
      results.push({ id: `fallback_${results.length}`, name: toolName, arguments: args });
    }
  }

  return results;
}
