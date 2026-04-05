/**
 * @epicai/legion/gateway — Barrel Export
 * Subpath export for the Inference Gateway.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export { InferenceGateway } from './InferenceGateway.js';
export { BackendRegistry } from './BackendRegistry.js';
export { Router } from './Router.js';
export { ControlPlane } from './ControlPlane.js';
export { OllamaShim } from './OllamaShim.js';
export type {
  BackendConfig,
  BackendHealth,
  BackendStatus,
  BackendType,
  CircuitBreakerState,
  CircuitState,
  ControlPlaneState,
  GatewayConfig,
  OllamaShimConfig,
  RoutingStrategy,
} from './types.js';
export { DEFAULT_GATEWAY_CONFIG, DISCOVERY_PORTS } from './types.js';
