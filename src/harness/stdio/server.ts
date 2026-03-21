/**
 * @epicai/core — Test Harness STDIO Backend
 * In-process MCP server over PassThrough streams.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { PassThrough } from 'node:stream';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';
import { HarnessProfile, type HarnessBackend, type HarnessToolResult, type ToolInfo, PER_TOOL_TIMEOUT } from '../types.js';
// CANONICAL_TOOLS used for reference; tools registered individually below
import { createHandlerState, resetHandlerState, handleTool } from '../shared/handlers.js';

export class StdioHarnessBackend implements HarnessBackend {
  readonly profile = HarnessProfile.Stdio;

  private mcpServer: McpServer | null = null;
  private client: Client | null = null;
  private state = createHandlerState(HarnessProfile.Stdio);

  async start(): Promise<void> {
    this.state = createHandlerState(HarnessProfile.Stdio);

    // Create in-process stream pairs
    const clientToServer = new PassThrough();
    const serverToClient = new PassThrough();

    // Server side
    this.mcpServer = new McpServer({ name: 'harness-stdio', version: '1.0.0' });
    this.registerTools();

    const serverTransport = new StdioServerTransport(clientToServer, serverToClient);
    await this.mcpServer.connect(serverTransport);

    // Client side — custom Transport over PassThrough streams (no child process)
    this.client = new Client({ name: 'harness-stdio-client', version: '1.0.0' });

    let onMessage: ((message: unknown) => void) | undefined;
    let onError: ((error: Error) => void) | undefined;
    let onClose: (() => void) | undefined;

    const clientTransport: Transport = {
      start: async () => {
        let buffer = '';
        serverToClient.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.trim() && onMessage) {
              try {
                onMessage(JSON.parse(line));
              } catch {
                // ignore parse errors
              }
            }
          }
        });
        serverToClient.on('end', () => onClose?.());
        clientToServer.on('error', (err: Error) => onError?.(err));
        serverToClient.on('error', (err: Error) => onError?.(err));
      },
      close: async () => {
        clientToServer.end();
        serverToClient.end();
      },
      send: async (message) => {
        clientToServer.write(JSON.stringify(message) + '\n');
      },
      set onmessage(handler: ((message: unknown) => void) | undefined) { onMessage = handler; },
      get onmessage() { return onMessage; },
      set onerror(handler: ((error: Error) => void) | undefined) { onError = handler; },
      get onerror() { return onError; },
      set onclose(handler: (() => void) | undefined) { onClose = handler; },
      get onclose() { return onClose; },
    };

    await this.client.connect(clientTransport);
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.mcpServer) {
      await this.mcpServer.close();
      this.mcpServer = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    resetHandlerState(this.state);
  }

  async listTools(): Promise<ToolInfo[]> {
    if (!this.client) throw new Error('Backend not started');
    const result = await this.client.listTools();
    return result.tools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      parameters: t.inputSchema as Record<string, unknown>,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<HarnessToolResult> {
    if (!this.client) throw new Error('Backend not started');
    const start = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PER_TOOL_TIMEOUT);

    try {
      const result = await this.client.callTool({ name, arguments: args });
      clearTimeout(timeout);
      const content = result.content;
      const isError = result.isError === true;

      // Extract text content from MCP response
      let parsed: unknown = content;
      if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object' && content[0] !== null && 'text' in content[0]) {
        try {
          parsed = JSON.parse((content[0] as { text: string }).text);
        } catch {
          parsed = (content[0] as { text: string }).text;
        }
      }

      return { content: parsed, isError, durationMs: Date.now() - start };
    } catch (err) {
      clearTimeout(timeout);
      return {
        content: { code: 'CALL_ERROR', message: err instanceof Error ? err.message : String(err) },
        isError: true,
        durationMs: Date.now() - start,
      };
    }
  }

  private registerTools(): void {
    if (!this.mcpServer) return;
    const state = this.state;

    this.mcpServer.tool('echo', { message: z.string() }, async (args) => {
      const result = await handleTool('echo', args, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('sleep', { ms: z.number() }, async (args) => {
      const result = await handleTool('sleep', args, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('fail', { reason: z.string().optional() }, async (args) => {
      const result = await handleTool('fail', args, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('malformed', { variant: z.number().optional() }, async (args) => {
      const result = await handleTool('malformed', args, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('approval_target', { action: z.string() }, async (args) => {
      const result = await handleTool('approval_target', args, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('multi_step', { step: z.number() }, async (args) => {
      const result = await handleTool('multi_step', args, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('stateful_counter', {}, async () => {
      const result = await handleTool('stateful_counter', {}, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });

    this.mcpServer.tool('ping', {}, async () => {
      const result = await handleTool('ping', {}, state);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.content) }], isError: result.isError };
    });
  }
}
