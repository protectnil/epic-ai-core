/**
 * @epicai/legion — Gateway Control Plane
 * Redis-backed shared state for multi-replica coherence.
 * Falls back to in-process Map when Redis is unavailable.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../logger.js';
import type { BackendHealth, CircuitBreakerState } from './types.js';

type ControlPlaneStatus = 'connected' | 'degraded';

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; PX?: number; NX?: boolean }): Promise<string | null>;
  hGet(key: string, field: string): Promise<string | null>;
  hSet(key: string, field: string, value: string): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hDel(key: string, field: string): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  quit(): Promise<string>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

const log = createLogger('gateway.control-plane');

const KEYS = {
  backends: 'gateway:backends',
  queue: (url: string) => `gateway:queue:${url}`,
  circuit: (url: string) => `gateway:circuit:${url}`,
  healthLock: 'gateway:lock:healthcheck',
} as const;

const QUEUE_TTL_S = 5;
const HEALTH_LOCK_DEFAULT_MS = 15_000;

export class ControlPlane {
  private redis: RedisClient | null = null;
  private fallback = new Map<string, string>();
  private _status: ControlPlaneStatus = 'degraded';

  constructor(private readonly redisUrl?: string) {}

  async connect(): Promise<void> {
    if (!this.redisUrl) {
      log.info('no Redis URL — using in-process fallback');
      this._status = 'degraded';
      return;
    }

    try {
      const redisModule = await import('redis');
      const client = redisModule.createClient({ url: this.redisUrl }) as unknown as RedisClient;

      client.on('error', (err: unknown) => {
        log.warn('Redis error — falling back to in-process', { error: String(err) });
        this._status = 'degraded';
      });

      client.on('ready', () => {
        log.info('Redis connected');
        this._status = 'connected';
      });

      await (client as unknown as { connect(): Promise<void> }).connect();
      this.redis = client;
      this._status = 'connected';
    } catch (err) {
      log.warn('Redis unavailable — using in-process fallback', { error: String(err) });
      this.redis = null;
      this._status = 'degraded';
    }
  }

  get controlPlaneStatus(): ControlPlaneStatus {
    return this._status;
  }

  // ---------------------------------------------------------------------------
  // Backend Health
  // ---------------------------------------------------------------------------

  async getBackendHealth(url: string): Promise<BackendHealth | null> {
    if (this.redis) {
      const raw = await this.redis.hGet(KEYS.backends, url);
      return raw ? JSON.parse(raw) as BackendHealth : null;
    }
    const raw = this.fallback.get(`backends:${url}`);
    return raw ? JSON.parse(raw) as BackendHealth : null;
  }

  async setBackendHealth(url: string, health: BackendHealth): Promise<void> {
    const value = JSON.stringify(health);
    if (this.redis) {
      await this.redis.hSet(KEYS.backends, url, value);
      return;
    }
    this.fallback.set(`backends:${url}`, value);
  }

  async removeBackendHealth(url: string): Promise<void> {
    if (this.redis) {
      await this.redis.hDel(KEYS.backends, url);
      return;
    }
    this.fallback.delete(`backends:${url}`);
  }

  async getAllBackendHealth(): Promise<BackendHealth[]> {
    if (this.redis) {
      const all = await this.redis.hGetAll(KEYS.backends);
      return Object.values(all).map(v => JSON.parse(v) as BackendHealth);
    }
    const results: BackendHealth[] = [];
    for (const [key, value] of this.fallback) {
      if (key.startsWith('backends:')) {
        results.push(JSON.parse(value) as BackendHealth);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Queue Depth
  // ---------------------------------------------------------------------------

  async incrementQueueDepth(url: string): Promise<number> {
    if (this.redis) {
      const key = KEYS.queue(url);
      const val = await this.redis.incr(key);
      await this.redis.expire(key, QUEUE_TTL_S);
      return val;
    }
    const key = `queue:${url}`;
    const current = parseInt(this.fallback.get(key) ?? '0', 10);
    const next = current + 1;
    this.fallback.set(key, String(next));
    return next;
  }

  async decrementQueueDepth(url: string): Promise<number> {
    if (this.redis) {
      const key = KEYS.queue(url);
      const val = await this.redis.decr(key);
      return Math.max(val, 0);
    }
    const key = `queue:${url}`;
    const current = parseInt(this.fallback.get(key) ?? '0', 10);
    const next = Math.max(current - 1, 0);
    this.fallback.set(key, String(next));
    return next;
  }

  async getQueueDepth(url: string): Promise<number> {
    if (this.redis) {
      const raw = await this.redis.get(KEYS.queue(url));
      return raw ? Math.max(parseInt(raw, 10), 0) : 0;
    }
    const raw = this.fallback.get(`queue:${url}`);
    return raw ? Math.max(parseInt(raw, 10), 0) : 0;
  }

  // ---------------------------------------------------------------------------
  // Circuit Breaker
  // ---------------------------------------------------------------------------

  async getCircuitBreaker(url: string): Promise<CircuitBreakerState> {
    const defaultState: CircuitBreakerState = { state: 'closed', failureCount: 0 };
    if (this.redis) {
      const raw = await this.redis.get(KEYS.circuit(url));
      return raw ? JSON.parse(raw) as CircuitBreakerState : defaultState;
    }
    const raw = this.fallback.get(`circuit:${url}`);
    return raw ? JSON.parse(raw) as CircuitBreakerState : defaultState;
  }

  async setCircuitBreaker(url: string, state: CircuitBreakerState): Promise<void> {
    const value = JSON.stringify(state);
    if (this.redis) {
      await this.redis.set(KEYS.circuit(url), value);
      return;
    }
    this.fallback.set(`circuit:${url}`, value);
  }

  // ---------------------------------------------------------------------------
  // Health Check Leader Election
  // ---------------------------------------------------------------------------

  async acquireHealthCheckLock(replicaId: string, ttlMs = HEALTH_LOCK_DEFAULT_MS): Promise<boolean> {
    if (this.redis) {
      const result = await this.redis.set(KEYS.healthLock, replicaId, { PX: ttlMs, NX: true });
      return result !== null;
    }
    // In-process: always leader (single replica)
    return true;
  }

  async renewHealthCheckLock(replicaId: string, ttlMs = HEALTH_LOCK_DEFAULT_MS): Promise<boolean> {
    if (this.redis) {
      const current = await this.redis.get(KEYS.healthLock);
      if (current !== replicaId) return false;
      await this.redis.set(KEYS.healthLock, replicaId, { PX: ttlMs });
      return true;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Ignore disconnect errors
      }
      this.redis = null;
    }
    this.fallback.clear();
    this._status = 'degraded';
  }
}
