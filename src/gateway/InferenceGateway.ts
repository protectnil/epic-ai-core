/**
 * @epicai/legion — Inference Gateway
 * Framework-agnostic HTTP request handler for routing inference
 * requests to the best available backend (llama.cpp, mlx-lm, vLLM).
 * Does NOT import Express or any framework. Uses node:http types only.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createLogger } from '../logger.js';
import type { BackendRegistry } from './BackendRegistry.js';
import type { ControlPlane } from './ControlPlane.js';
import type { Router } from './Router.js';
import { OllamaShim } from './OllamaShim.js';
import type { GatewayConfig } from './types.js';
import { DEFAULT_GATEWAY_CONFIG } from './types.js';

// ---------------------------------------------------------------------------
// Token-bucket rate limiter (per client IP, in-process)
// ---------------------------------------------------------------------------

interface TokenBucket {
  tokens: number;
  lastRefillAt: number;
}

class RateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly limitPerMinute: number;

  constructor(limitPerMinute: number) {
    this.limitPerMinute = limitPerMinute;
  }

  /** Returns true if the request is allowed, false if rate-limited. */
  allow(clientIp: string): boolean {
    const now = Date.now();
    const refillRate = this.limitPerMinute / 60_000; // tokens per ms
    let bucket = this.buckets.get(clientIp);

    if (!bucket) {
      bucket = { tokens: this.limitPerMinute, lastRefillAt: now };
      this.buckets.set(clientIp, bucket);
    } else {
      // Refill tokens proportional to elapsed time
      const elapsed = now - bucket.lastRefillAt;
      bucket.tokens = Math.min(this.limitPerMinute, bucket.tokens + elapsed * refillRate);
      bucket.lastRefillAt = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }
}

const log = createLogger('gateway');

export class InferenceGateway {
  private readonly ollamaShim: OllamaShim;
  private readonly rateLimiter: RateLimiter;
  private readonly config: GatewayConfig;
  private inFlightCount = 0;
  private draining = false;
  private drainResolve: (() => void) | null = null;

  constructor(
    private readonly registry: BackendRegistry,
    private readonly controlPlane: ControlPlane,
    private readonly router: Router,
    config?: Partial<GatewayConfig>,
  ) {
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
    this.ollamaShim = new OllamaShim(this.config.ollamaShim);
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    await this.controlPlane.connect();
    await this.registry.discover();
    const replicaId = randomUUID();
    this.registry.startHealthChecks(replicaId);
    log.info('gateway started', {
      replicaId,
      controlPlane: this.controlPlane.controlPlaneStatus,
    });
  }

  async stop(): Promise<void> {
    this.draining = true;
    this.registry.stopHealthChecks();

    // Wait for in-flight requests to complete (max 30s)
    if (this.inFlightCount > 0) {
      await Promise.race([
        new Promise<void>(resolve => { this.drainResolve = resolve; }),
        new Promise<void>(resolve => setTimeout(resolve, 30_000)),
      ]);
    }

    await this.controlPlane.disconnect();
    log.info('gateway stopped', { drainedInFlight: this.inFlightCount === 0 });
  }

  // ---------------------------------------------------------------------------
  // Request Handler
  // ---------------------------------------------------------------------------

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.draining) {
      sendJSON(res, 503, { error: 'Gateway is shutting down' });
      return;
    }

    // CORS — validate Origin and set response headers
    const requestOrigin = req.headers['origin'];
    if (requestOrigin !== undefined) {
      const allowed = this.config.corsOrigins.includes(requestOrigin);
      if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
      }
      // Preflight
      if (req.method === 'OPTIONS') {
        if (allowed) {
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.setHeader('Access-Control-Max-Age', '600');
          res.writeHead(204);
        } else {
          res.writeHead(403);
        }
        res.end();
        return;
      }
      // Block cross-origin non-preflight requests to unconfigured origins
      if (!allowed) {
        sendJSON(res, 403, { error: 'CORS: origin not allowed' });
        return;
      }
    }

    // Rate limiting — token bucket per client IP
    const clientIp = (req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
    if (!this.rateLimiter.allow(clientIp)) {
      res.setHeader('Retry-After', '60');
      sendJSON(res, 429, { error: 'Too many requests' });
      return;
    }

    const method = req.method ?? 'GET';
    const url = req.url ?? '/';

    // Route dispatch
    if (method === 'POST' && url === '/v1/chat/completions') {
      await this.handleChatCompletions(req, res);
    } else if (method === 'GET' && url === '/v1/models') {
      await this.handleListModels(res);
    } else if (method === 'GET' && url === '/health') {
      await this.handleHealth(res);
    } else if (method === 'GET' && url === '/backends') {
      await this.handleBackends(res);
    } else if (method === 'POST' && url === '/api/chat' && this.ollamaShim.enabled) {
      await this.ollamaShim.handleChat(req, res, body => this.proxyToBackend(body));
    } else if (method === 'POST' && url === '/api/generate' && this.ollamaShim.enabled) {
      await this.ollamaShim.handleGenerate(req, res, body => this.proxyToBackend(body));
    } else {
      sendJSON(res, 404, { error: 'Not found' });
    }
  }

  // ---------------------------------------------------------------------------
  // Endpoint Handlers
  // ---------------------------------------------------------------------------

  private async handleChatCompletions(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const backendUrl = await this.router.route();
    if (!backendUrl) {
      sendJSON(res, 503, { error: 'No healthy backends available' });
      return;
    }

    this.inFlightCount++;
    await this.controlPlane.incrementQueueDepth(backendUrl);

    try {
      const body = await readBody(req);
      let isStream = false;
      try {
        const parsed = JSON.parse(body) as { stream?: boolean };
        isStream = parsed.stream === true;
      } catch {
        // Non-JSON body will be rejected by the backend
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      try {
        const backendResponse = await fetch(`${backendUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
          },
          body,
          signal: controller.signal,
        });

        if (isStream && backendResponse.body) {
          // Stream pass-through: pipe chunks as they arrive
          res.writeHead(backendResponse.status, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const reader = backendResponse.body.getReader();
          const decoder = new TextDecoder();

          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(decoder.decode(value, { stream: true }));
            }
          } finally {
            reader.releaseLock();
          }
          res.end();
        } else {
          // Non-streaming: buffer and forward
          const responseBody = await backendResponse.text();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          res.writeHead(backendResponse.status, headers);
          res.end(responseBody);
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : 'Backend request failed';
        log.error('proxy error', { backend: backendUrl, error: message });
        sendJSON(res, 502, { error: message });
      }
    } finally {
      await this.controlPlane.decrementQueueDepth(backendUrl);
      this.inFlightCount--;
      if (this.draining && this.inFlightCount === 0 && this.drainResolve) {
        this.drainResolve();
      }
    }
  }

  private async handleListModels(res: ServerResponse): Promise<void> {
    const healthy = await this.registry.healthyBackends();
    const seen = new Set<string>();
    const models: { id: string; object: string; owned_by: string }[] = [];

    for (const backend of healthy) {
      for (const modelId of backend.modelIds) {
        if (!seen.has(modelId)) {
          seen.add(modelId);
          models.push({ id: modelId, object: 'model', owned_by: backend.type });
        }
      }
    }

    sendJSON(res, 200, { object: 'list', data: models });
  }

  private async handleHealth(res: ServerResponse): Promise<void> {
    const backends = await this.registry.backends();
    const healthy = backends.filter(b => b.status === 'healthy' || b.status === 'degraded');
    const status = healthy.length > 0 ? 'ok' : 'degraded';

    sendJSON(res, status === 'ok' ? 200 : 503, {
      status,
      controlPlane: this.controlPlane.controlPlaneStatus,
      backends: backends.map(b => ({
        url: b.url,
        name: b.name,
        type: b.type,
        status: b.status,
        latencyMs: b.latencyMs,
        models: b.modelIds,
      })),
      inFlight: this.inFlightCount,
    });
  }

  private async handleBackends(res: ServerResponse): Promise<void> {
    const backends = await this.registry.backends();
    sendJSON(res, 200, { backends });
  }

  // ---------------------------------------------------------------------------
  // Internal proxy (used by OllamaShim)
  // ---------------------------------------------------------------------------

  private async proxyToBackend(body: string): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const backendUrl = await this.router.route();
    if (!backendUrl) {
      return { status: 503, headers: {}, body: JSON.stringify({ error: 'No healthy backends available' }) };
    }

    this.inFlightCount++;
    await this.controlPlane.incrementQueueDepth(backendUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      try {
        const response = await fetch(`${backendUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        const responseBody = await response.text();
        return { status: response.status, headers: { 'Content-Type': 'application/json' }, body: responseBody };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backend request failed';
      return { status: 502, headers: {}, body: JSON.stringify({ error: message }) };
    } finally {
      await this.controlPlane.decrementQueueDepth(backendUrl);
      this.inFlightCount--;
      if (this.draining && this.inFlightCount === 0 && this.drainResolve) {
        this.drainResolve();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendJSON(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
