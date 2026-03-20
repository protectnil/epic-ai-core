/**
 * @epicai/core — MCP Client Adapter
 * Wraps @modelcontextprotocol/sdk Client for a single MCP server connection.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, ToolResult, ConnectionStatus } from '../../types/index.js';
import type { MCPAdapter } from './base.js';
import type { ServerConnection } from '../../types/index.js';

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively remove prototype-pollution keys from an object tree.
 * Handles nested objects and arrays. Uses a seen set for cycle safety.
 */
function sanitizeKeys(obj: Record<string, unknown>, seen?: WeakSet<object>): Record<string, unknown> {
  const visited = seen ?? new WeakSet();
  if (visited.has(obj)) return {};
  visited.add(obj);

  const safe = Object.create(null) as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (BLOCKED_KEYS.has(k)) continue;
    if (Array.isArray(v)) {
      safe[k] = v.map(item =>
        item && typeof item === 'object' && !(item instanceof Date)
          ? sanitizeKeys(item as Record<string, unknown>, visited)
          : item,
      );
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      safe[k] = sanitizeKeys(v as Record<string, unknown>, visited);
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

export class MCPClientAdapter implements MCPAdapter {
  readonly name: string;
  private client: Client | null = null;
  private transport: StdioClientTransport | StreamableHTTPClientTransport | null = null;
  private readonly config: ServerConnection;
  private _status: ConnectionStatus = 'disconnected';
  private cachedTools: Tool[] = [];

  constructor(config: ServerConnection) {
    this.name = config.name;
    this.config = config;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected') return;
    this._status = 'connecting';

    try {
      if (this.config.transport === 'stdio') {
        if (!this.config.command) {
          throw new Error(`Server "${this.name}": stdio transport requires a command`);
        }
        this.transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args,
        });
      } else if (this.config.transport === 'streamable-http') {
        if (!this.config.url) {
          throw new Error(`Server "${this.name}": streamable-http transport requires a url`);
        }
        const requestInit: RequestInit = {};
        if (this.config.auth) {
          const headers: Record<string, string> = {};
          switch (this.config.auth.type) {
            case 'bearer':
              headers['Authorization'] = `Bearer ${this.config.auth.token ?? ''}`;
              break;
            case 'api-key':
              headers[this.config.auth.headerName ?? 'X-API-Key'] = this.config.auth.token ?? '';
              break;
            case 'basic':
              headers['Authorization'] = `Basic ${Buffer.from(`${this.config.auth.username ?? ''}:${this.config.auth.password ?? ''}`).toString('base64')}`;
              break;
          }
          requestInit.headers = headers;
        }
        this.transport = new StreamableHTTPClientTransport(
          new URL(this.config.url),
          { requestInit },
        );
      } else {
        throw new Error(`Server "${this.name}": unsupported transport "${this.config.transport as string}"`);
      }

      this.client = new Client(
        { name: `epic-ai-${this.name}`, version: '0.1.0' },
        { capabilities: {} }
      );

      await this.client.connect(this.transport);

      // Discover tools on connection
      const toolsResponse = await this.client.listTools();
      this.cachedTools = (toolsResponse.tools ?? []).map(t => ({
        name: t.name,
        description: t.description ?? '',
        parameters: (t.inputSchema as Record<string, unknown>) ?? {},
        server: this.name,
      }));

      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'disconnected') return;

    try {
      if (this.client) {
        await this.client.close();
      }
    } finally {
      this.client = null;
      this.transport = null;
      this.cachedTools = [];
      this._status = 'disconnected';
    }
  }

  async listTools(): Promise<Tool[]> {
    if (this._status !== 'connected' || !this.client) {
      throw new Error(`Server "${this.name}" is not connected`);
    }
    return this.cachedTools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (this._status !== 'connected' || !this.client) {
      throw new Error(`Server "${this.name}" is not connected`);
    }

    const startTime = Date.now();
    try {
      const safeArgs = sanitizeKeys(args);
      const result = await this.client.callTool({ name, arguments: safeArgs });
      return {
        content: result.content,
        isError: Boolean(result.isError),
        server: this.name,
        tool: name,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        content: error instanceof Error ? error.message : String(error),
        isError: true,
        server: this.name,
        tool: name,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async ping(): Promise<number> {
    if (this._status !== 'connected' || !this.client) {
      throw new Error(`Server "${this.name}" is not connected`);
    }
    const start = Date.now();
    await this.client.ping();
    return Date.now() - start;
  }
}
