/**
 * @epicai/legion — Sandbox Manager
 * Creates and manages sandboxed adapter instances.
 * protectnil → worker-thread, vendor/community → process.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../../logger.js';
import type { Tool, ToolResult } from '../../types/index.js';
import type { AdapterCatalogEntry } from '../AdapterCatalog.js';
import { WorkerSandbox } from './WorkerSandbox.js';
import { ProcessSandbox } from './ProcessSandbox.js';
import type { AdapterSandboxConfig, SandboxMode } from './types.js';
import { DEFAULT_SANDBOX_CONFIG } from './types.js';

const log = createLogger('federation.sandbox');

export interface SandboxedAdapter {
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  stop(): Promise<void>;
}

export class SandboxManager {
  private readonly sandboxes = new Map<string, SandboxedAdapter>();

  /**
   * Create a sandboxed adapter instance.
   * If one already exists for this adapter, return the existing one.
   */
  async create(
    catalogEntry: AdapterCatalogEntry,
    adapterPath: string,
    credentials: Record<string, string>,
    configOverride?: Partial<AdapterSandboxConfig>,
  ): Promise<SandboxedAdapter> {
    const key = catalogEntry.name;

    // Idempotent: return existing sandbox
    const existing = this.sandboxes.get(key);
    if (existing) return existing;

    const mode = this.modeForAuthor(catalogEntry.author);
    const config: AdapterSandboxConfig = {
      ...DEFAULT_SANDBOX_CONFIG,
      mode,
      ...configOverride,
    };

    log.info('creating sandbox', { adapter: key, mode, author: catalogEntry.author });

    let sandbox: SandboxedAdapter;

    if (config.mode === 'worker-thread') {
      const ws = new WorkerSandbox(adapterPath, config, credentials);
      await ws.start();
      sandbox = ws;
    } else if (config.mode === 'process') {
      const ps = new ProcessSandbox(adapterPath, config, credentials);
      await ps.start();
      sandbox = ps;
    } else {
      // mode === 'none' — direct import, no isolation (dev only)
      const mod = await import(adapterPath);
      const AdapterClass = mod.default ?? Object.values(mod)[0] as new (config: Record<string, string>) => { tools: Tool[]; callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>; connect?(): Promise<void>; disconnect?(): Promise<void> };
      const adapter = new AdapterClass(credentials);
      if (adapter.connect) await adapter.connect();
      sandbox = {
        listTools: async () => adapter.tools,
        callTool: (name, args) => adapter.callTool(name, args),
        stop: async () => { if (adapter.disconnect) await adapter.disconnect(); },
      };
    }

    this.sandboxes.set(key, sandbox);
    return sandbox;
  }

  /**
   * Stop and remove a sandbox.
   */
  async destroy(adapterName: string): Promise<void> {
    const sandbox = this.sandboxes.get(adapterName);
    if (!sandbox) return;

    await sandbox.stop();
    this.sandboxes.delete(adapterName);
    log.info('sandbox destroyed', { adapter: adapterName });
  }

  /**
   * Stop all sandboxes.
   */
  async destroyAll(): Promise<void> {
    for (const [name, sandbox] of this.sandboxes) {
      try {
        await sandbox.stop();
      } catch (err) {
        log.warn('sandbox stop error', { adapter: name, error: String(err) });
      }
    }
    this.sandboxes.clear();
  }

  get activeCount(): number {
    return this.sandboxes.size;
  }

  private modeForAuthor(author: AdapterCatalogEntry['author']): SandboxMode {
    switch (author) {
      case 'protectnil': return 'worker-thread';
      case 'vendor': return 'process';
      case 'community': return 'process';
      default: return 'process';
    }
  }
}
