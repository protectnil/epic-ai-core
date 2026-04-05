/**
 * @epicai/legion — Backend Registry
 * Discovers, probes, and health-checks inference backends.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../logger.js';
import type { ControlPlane } from './ControlPlane.js';
import type {
  BackendConfig,
  BackendHealth,
  BackendType,
  CircuitBreakerState,
  GatewayConfig,
} from './types.js';
import { DISCOVERY_PORTS } from './types.js';

const log = createLogger('gateway.registry');

export class BackendRegistry {
  private healthCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private replicaId: string | null = null;

  constructor(
    private readonly controlPlane: ControlPlane,
    private readonly config: GatewayConfig,
  ) {}

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  async discover(): Promise<void> {
    // Register explicit backends from config
    for (const backend of this.config.backends) {
      await this.registerBackend(backend);
    }

    if (!this.config.autoDiscover) return;

    // Probe standard ports
    for (const [portStr, type] of Object.entries(DISCOVERY_PORTS)) {
      const port = parseInt(portStr, 10);
      if (port === this.config.port) continue; // skip gateway's own port

      const url = `http://localhost:${port}`;
      const existing = await this.controlPlane.getBackendHealth(url);
      if (existing) continue; // already registered

      const health = await this.probeBackend(url, type);
      if (health) {
        await this.controlPlane.setBackendHealth(url, health);
        log.info('auto-discovered backend', { url, type, models: health.modelIds });
      }
    }
  }

  private async registerBackend(backend: BackendConfig): Promise<void> {
    const type = backend.type ?? 'unknown';
    const health = await this.probeBackend(backend.url, type);
    if (health) {
      health.name = backend.name ?? health.name;
      await this.controlPlane.setBackendHealth(backend.url, health);
      log.info('registered backend', { url: backend.url, type, models: health.modelIds });
    } else {
      // Register as unhealthy — health checks will retry
      const unhealthy: BackendHealth = {
        url: backend.url,
        name: backend.name ?? backend.url,
        type,
        status: 'unhealthy',
        latencyMs: null,
        lastCheckedAt: Date.now(),
        consecutiveDegradedCount: 0,
        consecutiveFailureCount: 1,
        modelIds: [],
      };
      await this.controlPlane.setBackendHealth(backend.url, unhealthy);
      log.warn('backend unreachable at registration — will retry', { url: backend.url });
    }
  }

  private async probeBackend(url: string, type: BackendType): Promise<BackendHealth | null> {
    const endpoint = type === 'ollama' ? `${url}/api/version` : `${url}/v1/models`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.healthCheck.timeoutMs);

      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        const latencyMs = Date.now() - start;

        if (!response.ok) return null;

        let modelIds: string[] = [];
        if (type !== 'ollama') {
          try {
            const data = await response.json() as { data?: { id: string }[] };
            modelIds = (data.data ?? []).map(m => m.id);
          } catch {
            // Model list parse failure is non-fatal
          }
        }

        return {
          url,
          name: url,
          type,
          status: 'healthy',
          latencyMs,
          lastCheckedAt: Date.now(),
          consecutiveDegradedCount: 0,
          consecutiveFailureCount: 0,
          modelIds,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Health Checks (leader-elected, jittered)
  // ---------------------------------------------------------------------------

  startHealthChecks(replicaId: string): void {
    this.replicaId = replicaId;
    this.scheduleNextHealthCheck();
  }

  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.replicaId = null;
  }

  private scheduleNextHealthCheck(): void {
    if (!this.replicaId) return;

    const delay = this.nextHealthCheckDelayMs();
    this.healthCheckTimer = setTimeout(async () => {
      await this.runHealthCheckCycle();
      this.scheduleNextHealthCheck();
    }, delay);

    // Don't prevent process exit
    if (this.healthCheckTimer && typeof this.healthCheckTimer === 'object' && 'unref' in this.healthCheckTimer) {
      this.healthCheckTimer.unref();
    }
  }

  private nextHealthCheckDelayMs(): number {
    const base = this.config.healthCheck.intervalMs;
    const jitter = (Math.random() * 2 - 1) * 3_000; // +/- 3s
    return Math.max(base + jitter, 1_000);
  }

  private async runHealthCheckCycle(): Promise<void> {
    if (!this.replicaId) return;

    // Try to acquire or renew leader lock
    const isLeader =
      await this.controlPlane.acquireHealthCheckLock(this.replicaId) ||
      await this.controlPlane.renewHealthCheckLock(this.replicaId);

    if (!isLeader) return; // Another replica is the leader

    const backends = await this.controlPlane.getAllBackendHealth();

    for (const backend of backends) {
      const circuit = await this.controlPlane.getCircuitBreaker(backend.url);

      // Skip open circuits unless it's time to retry
      if (circuit.state === 'open') {
        if (circuit.nextRetryAt && Date.now() < circuit.nextRetryAt) continue;
        // Transition to half-open for retry
        await this.controlPlane.setCircuitBreaker(backend.url, { ...circuit, state: 'half-open' });
      }

      const probed = await this.probeBackend(backend.url, backend.type);

      if (probed) {
        // Check for degraded (latency > baseline * multiplier)
        const baselineLatency = backend.latencyMs ?? probed.latencyMs ?? 0;
        const threshold = baselineLatency * this.config.healthCheck.degradedLatencyMultiplier;
        const isDegraded = probed.latencyMs !== null && baselineLatency > 0 && probed.latencyMs > threshold;

        const updated: BackendHealth = {
          ...probed,
          name: backend.name,
          status: isDegraded ? 'degraded' : 'healthy',
          consecutiveDegradedCount: isDegraded ? backend.consecutiveDegradedCount + 1 : 0,
          consecutiveFailureCount: 0,
        };

        await this.controlPlane.setBackendHealth(backend.url, updated);
        await this.controlPlane.setCircuitBreaker(backend.url, {
          state: 'closed',
          failureCount: 0,
        });
      } else {
        // Probe failed
        const failureCount = backend.consecutiveFailureCount + 1;
        const shouldOpen = failureCount >= this.config.healthCheck.unhealthyThreshold;

        const updated: BackendHealth = {
          ...backend,
          status: 'unhealthy',
          lastCheckedAt: Date.now(),
          consecutiveFailureCount: failureCount,
        };
        await this.controlPlane.setBackendHealth(backend.url, updated);

        if (shouldOpen || circuit.state === 'half-open') {
          const newCircuit: CircuitBreakerState = {
            state: 'open',
            failureCount,
            openedAt: Date.now(),
            nextRetryAt: Date.now() + 30_000, // retry in 30s
          };
          await this.controlPlane.setCircuitBreaker(backend.url, newCircuit);
          log.warn('circuit breaker opened', { url: backend.url, failureCount });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async backends(): Promise<BackendHealth[]> {
    return this.controlPlane.getAllBackendHealth();
  }

  async healthyBackends(): Promise<BackendHealth[]> {
    const all = await this.controlPlane.getAllBackendHealth();
    return all.filter(b => b.status === 'healthy' || b.status === 'degraded');
  }

  async isHealthy(url: string): Promise<boolean> {
    const health = await this.controlPlane.getBackendHealth(url);
    return health !== null && (health.status === 'healthy' || health.status === 'degraded');
  }
}
