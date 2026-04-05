/**
 * @epicai/legion — Process Sandbox
 * Runs vendor/community adapters in a child process with OS-level isolation.
 * No inherited env vars beyond allowlist. No inherited file descriptors.
 * Credentials injected once via startup IPC message.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { spawn } from 'node:child_process';
import { createLogger } from '../../logger.js';
import type { Tool, ToolResult } from '../../types/index.js';
import type { AdapterSandboxConfig } from './types.js';

const log = createLogger('federation.sandbox.process');

interface IPCMessage {
  id: string;
  type: 'init' | 'tools' | 'callTool' | 'result' | 'error';
  adapterPath?: string;
  credentials?: Record<string, string>;
  name?: string;
  args?: Record<string, unknown>;
  result?: ToolResult;
  tools?: Tool[];
  error?: string;
}

export class ProcessSandbox {
  private child: ReturnType<typeof spawn> | null = null;
  private readonly pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private msgId = 0;
  private buffer = '';

  constructor(
    private readonly adapterPath: string,
    private readonly config: AdapterSandboxConfig,
    private readonly credentials: Record<string, string>,
  ) {}

  async start(): Promise<void> {
    const nodeArgs = [
      `--max-old-space-size=${this.config.maxMemoryMb}`,
      '--input-type=module',
      '-e',
      this.buildChildScript(),
    ];

    const env = this.buildEnv();

    this.child = spawn(process.execPath, nodeArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    // JSON-RPC over stdout (one JSON object per line)
    this.child.stdout!.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop()!; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as IPCMessage;
          const handler = this.pending.get(msg.id);
          if (!handler) continue;
          this.pending.delete(msg.id);

          if (msg.type === 'error') {
            handler.reject(new Error(msg.error ?? 'Process sandbox error'));
          } else {
            handler.resolve(msg);
          }
        } catch {
          log.warn('unparseable message from sandbox', { line: line.slice(0, 200) });
        }
      }
    });

    this.child.stderr!.on('data', (chunk: Buffer) => {
      log.debug('sandbox stderr', { adapter: this.adapterPath, output: chunk.toString().slice(0, 500) });
    });

    this.child.on('exit', (code) => {
      if (code !== 0) {
        log.warn('sandbox process exited', { adapter: this.adapterPath, code });
      }
      for (const [, handler] of this.pending) {
        handler.reject(new Error(`Sandbox exited with code ${code}`));
      }
      this.pending.clear();
      this.child = null;
    });

    // Send init message with credentials
    await this.send({
      type: 'init',
      adapterPath: this.adapterPath,
      credentials: this.credentials,
    });

    log.info('process sandbox started', { adapter: this.adapterPath, pid: this.child.pid });
  }

  async listTools(): Promise<Tool[]> {
    const response = await this.send({ type: 'tools' }) as IPCMessage;
    return response.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.send({ type: 'callTool', name, args }) as IPCMessage;
    return response.result ?? { content: [{ type: 'text', text: '' }], isError: true, server: '', tool: name, durationMs: 0 };
  }

  async stop(): Promise<void> {
    if (this.child) {
      this.child.kill('SIGTERM');
      // Force kill after 5s if still running
      const forceKill = setTimeout(() => {
        if (this.child) {
          this.child.kill('SIGKILL');
        }
      }, 5_000);
      if (typeof forceKill === 'object' && 'unref' in forceKill) {
        forceKill.unref();
      }
    }
  }

  private send(msg: Partial<IPCMessage>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.child || !this.child.stdin) {
        reject(new Error('Sandbox not started'));
        return;
      }

      const id = String(++this.msgId);
      const fullMsg = { ...msg, id };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Sandbox timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });

      this.child.stdin.write(JSON.stringify(fullMsg) + '\n');
    });
  }

  private buildEnv(): Record<string, string> {
    const env: Record<string, string> = {
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      PATH: process.env.PATH ?? '',
    };
    for (const key of this.config.allowedEnvVars) {
      const value = process.env[key];
      if (value !== undefined) {
        env[key] = value;
      }
    }
    return env;
  }

  private buildChildScript(): string {
    return `
      import { stdin, stdout } from 'node:process';
      import { createInterface } from 'node:readline';

      let adapter = null;
      const rl = createInterface({ input: stdin });

      rl.on('line', async (line) => {
        let msg;
        try { msg = JSON.parse(line); } catch { return; }

        try {
          if (msg.type === 'init') {
            const mod = await import(msg.adapterPath);
            const AdapterClass = mod.default ?? Object.values(mod)[0];
            adapter = new AdapterClass(msg.credentials);
            if (adapter.connect) await adapter.connect();
            stdout.write(JSON.stringify({ id: msg.id, type: 'result' }) + '\\n');
          } else if (msg.type === 'tools') {
            const tools = adapter.tools ?? [];
            stdout.write(JSON.stringify({ id: msg.id, type: 'result', tools }) + '\\n');
          } else if (msg.type === 'callTool') {
            const result = await adapter.callTool(msg.name, msg.args);
            stdout.write(JSON.stringify({ id: msg.id, type: 'result', result }) + '\\n');
          }
        } catch (err) {
          stdout.write(JSON.stringify({ id: msg.id, type: 'error', error: err.message }) + '\\n');
        }
      });
    `;
  }
}
