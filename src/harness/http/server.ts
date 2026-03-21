/**
 * @epicai/core — Test Harness HTTP Backend
 * Local MCP server over streamable-http on an ephemeral port.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { HarnessProfile, type HarnessBackend, type HarnessToolResult, type ToolInfo, PER_TOOL_TIMEOUT } from '../types.js';
import { CANONICAL_TOOLS } from '../shared/toolDefs.js';
import { createHandlerState, resetHandlerState, handleTool, type HandlerState } from '../shared/handlers.js';

export class HttpHarnessBackend implements HarnessBackend {
  readonly profile = HarnessProfile.Http;

  private server: Server | null = null;
  private port = 0;
  private state: HandlerState = createHandlerState(HarnessProfile.Http);

  async start(): Promise<void> {
    this.state = createHandlerState(HarnessProfile.Http);

    await new Promise<void>((resolve, reject) => {
      const state = this.state;

      this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Auth check
        const auth = req.headers.authorization;
        if (auth !== 'Bearer harness-http-token') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const body = await readBody(req);

        if (req.method === 'GET' && req.url === '/healthz') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        if (req.method === 'POST' && req.url === '/tools/list') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ tools: CANONICAL_TOOLS }));
          return;
        }

        if (req.method === 'POST' && req.url === '/tools/call') {
          const parsed = JSON.parse(body);
          const { name, args } = parsed as { name: string; args: Record<string, unknown> };
          const result = await handleTool(name, args ?? {}, state);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }

        if (req.method === 'POST' && req.url === '/reset') {
          resetHandlerState(state);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reset: true }));
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
      const res = await this.fetch('GET', '/healthz') as { status: string };
      return res.status === 'ok';
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    await this.fetch('POST', '/reset');
  }

  async listTools(): Promise<ToolInfo[]> {
    const res = await this.fetch('POST', '/tools/list');
    return (res as { tools: ToolInfo[] }).tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<HarnessToolResult> {
    const start = Date.now();
    try {
      const res = await this.fetch('POST', '/tools/call', { name, args });
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

  private async fetch(method: string, path: string, body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_TOOL_TIMEOUT);

    try {
      const res = await globalThis.fetch(`http://127.0.0.1:${this.port}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer harness-http-token',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
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
