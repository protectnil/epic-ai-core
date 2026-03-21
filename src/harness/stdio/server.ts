/**
 * @epicai/core — Test Harness STDIO Backend
 * Spawns a real child process MCP server over stdio.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { HarnessProfile, type HarnessBackend, type HarnessToolResult, type ToolInfo, PER_TOOL_TIMEOUT } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveProcessScript(dir: string): string {
  // Always resolve to the project root's dist/ directory.
  // Child processes must run compiled JS regardless of whether the parent is src/ or dist/.
  // pretest script ensures dist/ is up to date before tests run.
  const projectRoot = resolve(dir, '..', '..', '..');
  return resolve(projectRoot, 'dist', 'harness', 'stdio', 'process.js');
}

export class StdioHarnessBackend implements HarnessBackend {
  readonly profile = HarnessProfile.Stdio;

  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async start(): Promise<void> {
    const serverScript = resolveProcessScript(__dirname);

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverScript],
    });

    this.client = new Client({ name: 'harness-stdio-client', version: '1.0.0' });
    await this.client.connect(this.transport);
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.transport = null;
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
    if (!this.client) throw new Error('Backend not started');
    // Reset via the special _harness_reset tool (stdio has no out-of-band channel)
    await this.client.callTool({ name: '_harness_reset', arguments: {} });
  }

  async listTools(): Promise<ToolInfo[]> {
    if (!this.client) throw new Error('Backend not started');
    const result = await this.client.listTools();
    return result.tools
      .filter(t => !t.name.startsWith('_harness_'))  // hide internal tools
      .map(t => ({
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
}
