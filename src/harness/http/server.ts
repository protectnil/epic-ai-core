/**
 * @epicai/legion — Test Harness HTTP Backend
 * Spawns a real child process MCP server over streamable-http.
 * Connects via StreamableHTTPClientTransport for real MCP HTTP framing.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { HarnessProfile, type HarnessBackend, type HarnessToolResult, type ToolInfo, PER_TOOL_TIMEOUT, HTTP_CONNECT_TIMEOUT } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveProcessScript(dir: string): string {
  // Always resolve to the project root's dist/ directory.
  // Child processes must run compiled JS regardless of whether the parent is src/ or dist/.
  // pretest script ensures dist/ is up to date before tests run.
  const projectRoot = resolve(dir, '..', '..', '..');
  return resolve(projectRoot, 'dist', 'harness', 'http', 'process.js');
}

export class HttpHarnessBackend implements HarnessBackend {
  readonly profile = HarnessProfile.Http;

  private client: Client | null = null;
  private childProcess: ChildProcess | null = null;
  private port = 0;

  async start(): Promise<void> {
    const serverScript = resolveProcessScript(__dirname);

    // Spawn the HTTP server as a child process
    this.childProcess = spawn('node', [serverScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for the child to report its port
    this.port = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('HTTP harness server did not report port within timeout')), HTTP_CONNECT_TIMEOUT);

      this.childProcess!.stdout!.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        const match = line.match(/^HARNESS_PORT=(\d+)$/);
        if (match) {
          clearTimeout(timeout);
          resolve(parseInt(match[1], 10));
        }
      });

      this.childProcess!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.childProcess!.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`HTTP harness server exited with code ${code}`));
      });
    });

    // Connect via real StreamableHTTPClientTransport
    const url = new URL(`http://127.0.0.1:${this.port}/mcp`);
    const transport = new StreamableHTTPClientTransport(url);

    this.client = new Client({ name: 'harness-http-client', version: '1.0.0' });
    await this.client.connect(transport);
  }

  async stop(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Best-effort
      }
      this.client = null;
    }
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM');
      this.childProcess = null;
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
    if (!this.client) throw new Error('Backend not started');
    await this.client.callTool({ name: '_harness_reset', arguments: {} });
  }

  async listTools(): Promise<ToolInfo[]> {
    if (!this.client) throw new Error('Backend not started');
    const result = await this.client.listTools();
    return result.tools
      .filter(t => !t.name.startsWith('_harness_'))
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
      const result = await this.client.callTool({ name, arguments: args }, undefined, { signal: controller.signal });
      clearTimeout(timeout);
      const content = result.content;
      const isError = result.isError === true;

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
