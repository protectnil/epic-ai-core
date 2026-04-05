/**
 * @epicai/legion — Gateway Types
 * Type definitions for the Inference Gateway.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// =============================================================================
// Backend Configuration
// =============================================================================

export type BackendType = 'llama.cpp' | 'mlx-lm' | 'vllm' | 'ollama' | 'unknown';

export interface BackendConfig {
  url: string;
  name?: string;
  type?: BackendType;
}

// =============================================================================
// Health & State
// =============================================================================

export type BackendStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface BackendHealth {
  url: string;
  name: string;
  type: BackendType;
  status: BackendStatus;
  latencyMs: number | null;
  lastCheckedAt: number | null;
  consecutiveDegradedCount: number;
  consecutiveFailureCount: number;
  modelIds: string[];
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  openedAt?: number;
  nextRetryAt?: number;
}

export interface ControlPlaneState {
  backends: Record<string, BackendHealth>;
  queueDepths: Record<string, number>;
  circuitBreakers: Record<string, CircuitBreakerState>;
  lastUpdatedAt: number;
}

// =============================================================================
// Routing
// =============================================================================

export type RoutingStrategy = 'lowest-queue-depth' | 'round-robin';

// =============================================================================
// Ollama Shim
// =============================================================================

export interface OllamaShimConfig {
  enabled: boolean;
  deprecationWindowEnd: string;
  logMigrationHints: boolean;
}

// =============================================================================
// Gateway Configuration
// =============================================================================

export interface GatewayConfig {
  port: number;
  backends: BackendConfig[];
  redisUrl?: string;
  routingStrategy: RoutingStrategy;
  ollamaShim: OllamaShimConfig;
  healthCheck: {
    intervalMs: number;
    timeoutMs: number;
    unhealthyThreshold: number;
    degradedLatencyMultiplier: number;
  };
  autoDiscover: boolean;
  shutdownDrainMs: number;
  /** Max requests per minute per client IP. Default: 100. */
  rateLimitPerMinute: number;
  /**
   * Allowed CORS origins. When empty (default) no Access-Control-Allow-Origin
   * header is set, effectively denying cross-origin requests.
   */
  corsOrigins: string[];
  /** Path to TLS certificate file (.crt / .pem). When set, HTTPS is used. */
  tlsCertPath?: string;
  /** Path to TLS private key file (.key / .pem). Required when tlsCertPath is set. */
  tlsKeyPath?: string;
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  port: 8000,
  backends: [],
  routingStrategy: 'lowest-queue-depth',
  ollamaShim: {
    enabled: true,
    deprecationWindowEnd: '2026-12-31',
    logMigrationHints: true,
  },
  healthCheck: {
    intervalMs: 10_000,
    timeoutMs: 5_000,
    unhealthyThreshold: 3,
    degradedLatencyMultiplier: 2,
  },
  autoDiscover: true,
  shutdownDrainMs: 30_000,
  rateLimitPerMinute: 100,
  corsOrigins: [],
};

// =============================================================================
// Auto-discovery port map
// =============================================================================

export const DISCOVERY_PORTS: Record<number, BackendType> = {
  8080: 'llama.cpp',
  5000: 'mlx-lm',
  8000: 'vllm',
  11434: 'ollama',
};
