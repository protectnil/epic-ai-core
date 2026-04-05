/**
 * @epicai/legion — Ollama API Shim
 * Backward compatibility layer translating Ollama API format
 * to/from OpenAI-compatible /v1/chat/completions.
 * DEPRECATED: Will be removed 2027-06-01.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '../logger.js';
import type { OllamaShimConfig } from './types.js';

const log = createLogger('gateway.ollama-shim');

// Rate-limit deprecation log: once per caller IP per hour
const deprecationLogTimes = new Map<string, number>();
const DEPRECATION_LOG_INTERVAL_MS = 3_600_000;

interface OllamaChatRequest {
  model: string;
  messages: { role: string; content: string }[];
  tools?: unknown[];
  stream?: boolean;
  options?: Record<string, unknown>;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
    };
    finish_reason: string;
  }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OllamaShim {
  constructor(private readonly config: OllamaShimConfig) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Handle POST /api/chat — translate to OpenAI format, proxy, translate back.
   * @param proxyFn Function that sends a request to /v1/chat/completions and returns the response.
   */
  async handleChat(
    req: IncomingMessage,
    res: ServerResponse,
    proxyFn: (body: string) => Promise<{ status: number; headers: Record<string, string>; body: string }>,
  ): Promise<void> {
    this.setDeprecationHeaders(res);
    this.logDeprecation(req);

    const rawBody = await readBody(req);
    let ollamaReq: OllamaChatRequest;
    try {
      ollamaReq = JSON.parse(rawBody) as OllamaChatRequest;
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Translate Ollama → OpenAI request format
    const openaiBody = JSON.stringify({
      model: ollamaReq.model,
      messages: ollamaReq.messages,
      tools: ollamaReq.tools,
      stream: false, // Shim does not support streaming translation yet
    });

    const result = await proxyFn(openaiBody);

    if (result.status !== 200) {
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(result.body);
      return;
    }

    // Translate OpenAI → Ollama response format
    let openaiResp: OpenAIChatResponse;
    try {
      openaiResp = JSON.parse(result.body) as OpenAIChatResponse;
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid response from backend' }));
      return;
    }

    const choice = openaiResp.choices?.[0];
    const toolCalls = (choice?.message?.tool_calls ?? []).map(tc => ({
      function: {
        name: tc.function.name,
        arguments: safeParseJSON(tc.function.arguments),
      },
    }));

    const ollamaResp = {
      model: ollamaReq.model,
      created_at: new Date().toISOString(),
      message: {
        role: choice?.message?.role ?? 'assistant',
        content: choice?.message?.content ?? '',
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      },
      done: true,
      done_reason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      prompt_eval_count: openaiResp.usage?.prompt_tokens ?? 0,
      eval_count: openaiResp.usage?.completion_tokens ?? 0,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ollamaResp));
  }

  /**
   * Handle POST /api/generate — basic translation for non-chat completions.
   */
  async handleGenerate(
    req: IncomingMessage,
    res: ServerResponse,
    proxyFn: (body: string) => Promise<{ status: number; headers: Record<string, string>; body: string }>,
  ): Promise<void> {
    this.setDeprecationHeaders(res);
    this.logDeprecation(req);

    const rawBody = await readBody(req);
    let parsed: { model: string; prompt: string; stream?: boolean };
    try {
      parsed = JSON.parse(rawBody) as { model: string; prompt: string; stream?: boolean };
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const openaiBody = JSON.stringify({
      model: parsed.model,
      messages: [{ role: 'user', content: parsed.prompt }],
      stream: false,
    });

    const result = await proxyFn(openaiBody);

    if (result.status !== 200) {
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(result.body);
      return;
    }

    let openaiResp: OpenAIChatResponse;
    try {
      openaiResp = JSON.parse(result.body) as OpenAIChatResponse;
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid response from backend' }));
      return;
    }

    const ollamaResp = {
      model: parsed.model,
      created_at: new Date().toISOString(),
      response: openaiResp.choices?.[0]?.message?.content ?? '',
      done: true,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ollamaResp));
  }

  private setDeprecationHeaders(res: ServerResponse): void {
    res.setHeader('X-EpicAI-Deprecation', `ollama-api; sunset=${this.config.deprecationWindowEnd}`);
  }

  private logDeprecation(req: IncomingMessage): void {
    if (!this.config.logMigrationHints) return;

    const ip = req.socket.remoteAddress ?? 'unknown';
    const lastLogged = deprecationLogTimes.get(ip) ?? 0;
    const now = Date.now();

    if (now - lastLogged > DEPRECATION_LOG_INTERVAL_MS) {
      deprecationLogTimes.set(ip, now);
      log.warn('Ollama API shim invoked — migrate to /v1/chat/completions', {
        callerIp: ip,
        path: req.url,
        sunset: this.config.deprecationWindowEnd,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function safeParseJSON(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return {};
  }
}
