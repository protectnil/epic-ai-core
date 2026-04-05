/**
 * @epicai/legion — Rate Limiter
 * Protects MCP servers from agent flooding and prevents runaway loops.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Per-server limits (overrides global) */
  perServer?: Record<string, { maxRequests: number; windowMs: number }>;
}

interface WindowState {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly global: { maxRequests: number; windowMs: number };
  private readonly perServer: Record<string, { maxRequests: number; windowMs: number }>;
  private readonly windows = new Map<string, WindowState>();

  constructor(config: RateLimitConfig) {
    this.global = { maxRequests: config.maxRequests, windowMs: config.windowMs };
    this.perServer = config.perServer ?? {};
  }

  /**
   * Check if a request to the given server is allowed.
   * Returns true if allowed, false if rate limited.
   */
  allow(server: string): boolean {
    const limits = this.perServer[server] ?? this.global;
    const key = server;
    const now = Date.now();

    let state = this.windows.get(key);
    if (!state || now - state.windowStart >= limits.windowMs) {
      state = { count: 0, windowStart: now };
      this.windows.set(key, state);
    }

    if (state.count >= limits.maxRequests) {
      return false;
    }

    state.count++;
    return true;
  }

  /**
   * Wait until a request is allowed. Resolves when the window resets.
   * Throws if the wait would exceed maxWaitMs.
   */
  async waitForAllowance(server: string, maxWaitMs: number = 30000): Promise<void> {
    if (this.allow(server)) return;

    const limits = this.perServer[server] ?? this.global;
    const state = this.windows.get(server);
    if (!state) return;

    const waitMs = limits.windowMs - (Date.now() - state.windowStart);

    if (waitMs > maxWaitMs) {
      throw new Error(`Rate limit exceeded for server "${server}". Would need to wait ${waitMs}ms (max: ${maxWaitMs}ms)`);
    }

    await new Promise(resolve => setTimeout(resolve, waitMs));

    // Reset window after waiting
    this.windows.set(server, { count: 1, windowStart: Date.now() });
  }

  /**
   * Get remaining requests in the current window for a server.
   */
  remaining(server: string): { remaining: number; resetsInMs: number } {
    const limits = this.perServer[server] ?? this.global;
    const state = this.windows.get(server);
    const now = Date.now();

    if (!state || now - state.windowStart >= limits.windowMs) {
      return { remaining: limits.maxRequests, resetsInMs: 0 };
    }

    return {
      remaining: Math.max(0, limits.maxRequests - state.count),
      resetsInMs: limits.windowMs - (now - state.windowStart),
    };
  }

  /**
   * Reset all rate limit windows.
   */
  reset(): void {
    this.windows.clear();
  }
}
