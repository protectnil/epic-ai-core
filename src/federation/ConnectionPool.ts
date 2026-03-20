/**
 * @epic-ai/core — Connection Pool
 * Manages N concurrent MCP server connections with retry and health monitoring.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  ServerConnection,
  RetryPolicy,
  ConnectionHealth,
} from '../types/index.js';
import type { MCPAdapter } from './adapters/base.js';
import { MCPClientAdapter } from './adapters/MCPClientAdapter.js';

const DEFAULT_RETRY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000,
};

const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 30000;

export class ConnectionPool {
  private readonly adapters = new Map<string, MCPAdapter>();
  private readonly retryPolicy: RetryPolicy;
  private readonly healthCheckIntervalMs: number;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private readonly healthCallbacks: ((health: ConnectionHealth) => void)[] = [];

  constructor(
    retryPolicy?: RetryPolicy,
    healthCheckIntervalMs?: number,
  ) {
    this.retryPolicy = retryPolicy ?? DEFAULT_RETRY;
    this.healthCheckIntervalMs = healthCheckIntervalMs ?? DEFAULT_HEALTH_CHECK_INTERVAL_MS;
  }

  /**
   * Connect to an MCP server with retry logic.
   * Accepts an optional custom adapter or factory function.
   * If not provided, defaults to MCPClientAdapter.
   */
  async connect(
    config: ServerConnection,
    adapterOrFactory?: MCPAdapter | ((config: ServerConnection) => MCPAdapter),
  ): Promise<MCPAdapter> {
    if (this.adapters.has(config.name)) {
      throw new Error(`Server "${config.name}" is already connected`);
    }

    // Factory function for creating fresh adapter instances on each retry.
    // Avoids retry-state leakage from partially initialized adapters.
    const createAdapter = (): MCPAdapter => {
      if (adapterOrFactory) {
        return typeof adapterOrFactory === 'function' ? adapterOrFactory(config) : adapterOrFactory;
      }
      return new MCPClientAdapter(config);
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      // Fresh adapter per attempt — no leaked transport/client state from prior failures
      const adapter = createAdapter();
      try {
        await adapter.connect();
        this.adapters.set(config.name, adapter);
        this.emitHealth(config.name, adapter);
        return adapter;
      } catch (error) {
        // Clean up failed adapter to release any partial resources
        try { await adapter.disconnect(); } catch { /* best effort cleanup */ }
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryPolicy.maxRetries) {
          const backoff = Math.min(
            this.retryPolicy.backoffMs * Math.pow(2, attempt),
            this.retryPolicy.maxBackoffMs ?? 30000,
          );
          await this.sleep(backoff);
        }
      }
    }

    throw new Error(
      `Failed to connect to server "${config.name}" after ${this.retryPolicy.maxRetries + 1} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Disconnect from a specific server.
   */
  async disconnect(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (!adapter) return;

    await adapter.disconnect();
    this.adapters.delete(name);
  }

  /**
   * Disconnect from all servers and stop health monitoring.
   */
  async disconnectAll(): Promise<void> {
    this.stopHealthCheck();

    const disconnects = Array.from(this.adapters.values()).map(a => a.disconnect());
    await Promise.allSettled(disconnects);
    this.adapters.clear();
  }

  /**
   * Get an adapter by server name.
   */
  get(name: string): MCPAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get health status of all connections.
   */
  async health(): Promise<ConnectionHealth[]> {
    const results: ConnectionHealth[] = [];

    for (const [name, adapter] of this.adapters) {
      let lastPingMs: number | undefined;
      let lastError: string | undefined;
      let toolCount = 0;

      try {
        lastPingMs = await adapter.ping();
        const tools = await adapter.listTools();
        toolCount = tools.length;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      results.push({
        server: name,
        status: adapter.status,
        lastPingMs,
        lastError,
        toolCount,
      });
    }

    return results;
  }

  /**
   * Start periodic health checks.
   */
  startHealthCheck(): void {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(async () => {
      for (const [name, adapter] of this.adapters) {
        try {
          await adapter.ping();
        } catch {
          this.emitHealth(name, adapter);
        }
      }
    }, this.healthCheckIntervalMs);

    // Don't block process exit
    if (this.healthCheckTimer.unref) {
      this.healthCheckTimer.unref();
    }
  }

  /**
   * Stop periodic health checks.
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Register a callback for health status changes.
   * Returns an unsubscribe function.
   */
  onHealthChange(callback: (health: ConnectionHealth) => void): () => void {
    this.healthCallbacks.push(callback);
    return () => this.offHealthChange(callback);
  }

  /**
   * Deregister a health change callback by reference.
   */
  offHealthChange(callback: (health: ConnectionHealth) => void): void {
    const idx = this.healthCallbacks.indexOf(callback);
    if (idx !== -1) this.healthCallbacks.splice(idx, 1);
  }

  /**
   * Number of connected servers.
   */
  get size(): number {
    return this.adapters.size;
  }

  /**
   * List all connected server names.
   */
  serverNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  private emitHealth(name: string, adapter: MCPAdapter): void {
    const health: ConnectionHealth = {
      server: name,
      status: adapter.status,
      toolCount: 0,
    };

    for (const cb of this.healthCallbacks) {
      try {
        cb(health);
      } catch {
        // Don't let callback errors break health monitoring
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
