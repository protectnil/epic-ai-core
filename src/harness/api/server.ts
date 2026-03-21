/**
 * @epicai/core — Test Harness API Backend
 * Fake vendor API server (Qualys-like shape). NOT MCP.
 * Tests auth, rate limiting, malformed responses, pagination.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { HarnessProfile, type HarnessBackend, type HarnessToolResult, type ToolInfo, PER_TOOL_TIMEOUT } from '../types.js';
import { CANONICAL_TOOLS } from '../shared/toolDefs.js';
import { createHandlerState, resetHandlerState, handleTool, type HandlerState } from '../shared/handlers.js';
import { API_AUTH_TOKEN, createVulnerabilityFixtures } from '../shared/fixtures.js';

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 1000;

export class ApiHarnessBackend implements HarnessBackend {
  readonly profile = HarnessProfile.Api;

  private server: Server | null = null;
  private port = 0;
  private state: HandlerState = createHandlerState(HarnessProfile.Api);
  private rateLimitCounter = 0;
  private rateLimitWindowStart = 0;
  private vulnFixtures = createVulnerabilityFixtures(25);

  async start(): Promise<void> {
    this.state = createHandlerState(HarnessProfile.Api);
    this.rateLimitCounter = 0;
    this.rateLimitWindowStart = Date.now();

    await new Promise<void>((resolve, reject) => {
      const state = this.state;

      this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Rate limiting
        const now = Date.now();
        if (now - this.rateLimitWindowStart > RATE_LIMIT_WINDOW_MS) {
          this.rateLimitCounter = 0;
          this.rateLimitWindowStart = now;
        }
        this.rateLimitCounter++;
        if (this.rateLimitCounter > RATE_LIMIT_MAX) {
          res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
          res.end(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 1 }));
          return;
        }

        // Auth check
        const auth = req.headers.authorization;
        if (auth !== `Bearer ${API_AUTH_TOKEN}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid or missing API token' }));
          return;
        }

        const body = await readBody(req);

        // Health endpoint
        if (req.method === 'GET' && req.url === '/api/v1/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', backend: 'api', version: '1.0.0' }));
          return;
        }

        // Tool list
        if (req.method === 'POST' && req.url === '/api/v1/tools/list') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ tools: CANONICAL_TOOLS }));
          return;
        }

        // Tool call
        if (req.method === 'POST' && req.url === '/api/v1/tools/call') {
          const parsed = JSON.parse(body);
          const { name, args } = parsed as { name: string; args: Record<string, unknown> };
          const result = await handleTool(name, args ?? {}, state);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }

        // Reset
        if (req.method === 'POST' && req.url === '/api/v1/reset') {
          resetHandlerState(state);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reset: true }));
          return;
        }

        // Paginated vulnerability listing (vendor API shape)
        if (req.method === 'GET' && req.url?.startsWith('/api/v1/vulnerabilities')) {
          const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
          const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
          const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 50);
          const page = this.vulnFixtures.slice(offset, offset + limit);
          const hasMore = offset + limit < this.vulnFixtures.length;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            data: page,
            pagination: { offset, limit, total: this.vulnFixtures.length, hasMore },
          }));
          return;
        }

        // Intentionally malformed endpoint
        if (req.method === 'GET' && req.url === '/api/v1/malformed') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"truncated": true, "data": [{"id": 1}, {"id": 2}'); // intentionally broken JSON
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.apiFetch('GET', '/api/v1/health');
      return (res as { status: string }).status === 'ok';
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    await this.apiFetch('POST', '/api/v1/reset');
  }

  async listTools(): Promise<ToolInfo[]> {
    const res = await this.apiFetch('POST', '/api/v1/tools/list');
    return (res as { tools: ToolInfo[] }).tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<HarnessToolResult> {
    const start = Date.now();
    try {
      const res = await this.apiFetch('POST', '/api/v1/tools/call', { name, args });
      const result = res as { content: unknown; isError: boolean };
      return { content: result.content, isError: result.isError, durationMs: Date.now() - start };
    } catch (err) {
      return {
        content: { code: 'CALL_ERROR', message: err instanceof Error ? err.message : String(err) },
        isError: true,
        durationMs: Date.now() - start,
      };
    }
  }

  /** Fetch paginated vulnerabilities (vendor API shape, not canonical tool) */
  async fetchVulnerabilities(offset = 0, limit = 10): Promise<{
    data: Array<{ id: string; severity: string; title: string; cvss: number }>;
    pagination: { offset: number; limit: number; total: number; hasMore: boolean };
  }> {
    const res = await this.apiFetch('GET', `/api/v1/vulnerabilities?offset=${offset}&limit=${limit}`);
    return res as Awaited<ReturnType<ApiHarnessBackend['fetchVulnerabilities']>>;
  }

  /** Fetch the intentionally malformed endpoint */
  async fetchMalformedEndpoint(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_TOOL_TIMEOUT);
    try {
      const res = await globalThis.fetch(`http://127.0.0.1:${this.port}/api/v1/malformed`, {
        headers: { 'Authorization': `Bearer ${API_AUTH_TOKEN}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return await res.text();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  private async apiFetch(method: string, path: string, body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_TOOL_TIMEOUT);

    try {
      const res = await globalThis.fetch(`http://127.0.0.1:${this.port}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_AUTH_TOKEN}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
