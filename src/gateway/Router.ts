/**
 * @epicai/legion — Gateway Router
 * Selects the best backend for each inference request.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { BackendRegistry } from './BackendRegistry.js';
import type { ControlPlane } from './ControlPlane.js';
import type { GatewayConfig } from './types.js';

export class Router {
  private roundRobinIndex = 0;

  constructor(
    private readonly registry: BackendRegistry,
    private readonly controlPlane: ControlPlane,
    private readonly config: GatewayConfig,
  ) {}

  /**
   * Select the best healthy backend URL for a request.
   * Returns null if no backends are healthy (caller should return 503).
   */
  async route(): Promise<string | null> {
    const healthy = await this.registry.healthyBackends();

    if (healthy.length === 0) return null;
    if (healthy.length === 1) return healthy[0].url;

    if (this.config.routingStrategy === 'round-robin') {
      return this.routeRoundRobin(healthy.map(b => b.url));
    }

    return this.routeLowestQueueDepth(healthy.map(b => b.url));
  }

  private async routeLowestQueueDepth(urls: string[]): Promise<string> {
    let bestUrl = urls[0];
    let bestDepth = Infinity;

    for (const url of urls) {
      const depth = await this.controlPlane.getQueueDepth(url);
      if (depth < bestDepth) {
        bestDepth = depth;
        bestUrl = url;
      }
    }

    // On tie, use round-robin among tied backends
    if (bestDepth === 0) {
      const zeros = [];
      for (const url of urls) {
        const depth = await this.controlPlane.getQueueDepth(url);
        if (depth === 0) zeros.push(url);
      }
      if (zeros.length > 1) {
        return this.routeRoundRobin(zeros);
      }
    }

    return bestUrl;
  }

  private routeRoundRobin(urls: string[]): string {
    const index = this.roundRobinIndex % urls.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % Number.MAX_SAFE_INTEGER;
    return urls[index];
  }
}
