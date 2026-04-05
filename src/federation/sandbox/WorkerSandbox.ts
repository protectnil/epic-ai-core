/**
 * @epicai/legion — Worker Thread Sandbox
 * Runs protectnil-tier adapters in a worker_threads isolate.
 * Credentials injected once via workerData. No shared memory.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { Worker } from 'node:worker_threads';
import { createLogger } from '../../logger.js';
import type { Tool, ToolResult } from '../../types/index.js';
import type { AdapterSandboxConfig } from './types.js';

const log = createLogger('federation.sandbox.worker');

interface WorkerMessage {
  id: string;
  type: 'tools' | 'callTool' | 'result' | 'error';
  name?: string;
  args?: Record<string, unknown>;
  result?: ToolResult;
  tools?: Tool[];
  error?: string;
}

export class WorkerSandbox {
  private worker: Worker | null = null;
  private readonly pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private msgId = 0;

  constructor(
    private readonly adapterPath: string,
    private readonly config: AdapterSandboxConfig,
    private readonly credentials: Record<string, string>,
  ) {}

  async start(): Promise<void> {
    const workerCode = `
      import { workerData, parentPort } from 'node:worker_threads';
      const { adapterPath, credentials } = workerData;
      const mod = await import(adapterPath);
      const AdapterClass = mod.default ?? Object.values(mod)[0];
      const adapter = new AdapterClass(credentials);
      if (adapter.connect) await adapter.connect();

      parentPort.on('message', async (msg) => {
        try {
          if (msg.type === 'tools') {
            parentPort.postMessage({ id: msg.id, type: 'result', tools: adapter.tools });
          } else if (msg.type === 'callTool') {
            const result = await adapter.callTool(msg.name, msg.args);
            parentPort.postMessage({ id: msg.id, type: 'result', result });
          }
        } catch (err) {
          parentPort.postMessage({ id: msg.id, type: 'error', error: err.message });
        }
      });
    `;

    this.worker = new Worker(workerCode, {
      eval: true,
      workerData: {
        adapterPath: this.adapterPath,
        credentials: this.credentials,
      },
      env: this.buildEnv(),
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.maxMemoryMb,
      },
    });

    this.worker.on('message', (msg: WorkerMessage) => {
      const handler = this.pending.get(msg.id);
      if (!handler) return;
      this.pending.delete(msg.id);

      if (msg.type === 'error') {
        handler.reject(new Error(msg.error ?? 'Worker error'));
      } else {
        handler.resolve(msg);
      }
    });

    this.worker.on('error', (err) => {
      log.error('worker error', { adapter: this.adapterPath, error: err.message });
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        log.warn('worker exited', { adapter: this.adapterPath, code });
      }
      // Reject all pending
      for (const [, handler] of this.pending) {
        handler.reject(new Error(`Worker exited with code ${code}`));
      }
      this.pending.clear();
    });

    log.info('worker sandbox started', { adapter: this.adapterPath });
  }

  async listTools(): Promise<Tool[]> {
    const response = await this.send({ type: 'tools' }) as WorkerMessage;
    return response.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.send({ type: 'callTool', name, args }) as WorkerMessage;
    return response.result ?? { content: [{ type: 'text', text: '' }], isError: true, server: '', tool: name, durationMs: 0 };
  }

  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  private send(msg: Partial<WorkerMessage>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not started'));
        return;
      }

      const id = String(++this.msgId);
      const fullMsg = { ...msg, id };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Worker timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });

      this.worker.postMessage(fullMsg);
    });
  }

  private buildEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const key of this.config.allowedEnvVars) {
      const value = process.env[key];
      if (value !== undefined) {
        env[key] = value;
      }
    }
    return env;
  }
}
