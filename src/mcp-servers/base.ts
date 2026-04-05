/**
 * MCPAdapterBase — shared base class for all Epic AI REST adapters.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 *
 * Provides:
 * - fetchWithRetry(): exponential backoff, timeout, 429/5xx retry, Retry-After support
 * - truncate(): consistent response truncation at 10KB
 *
 * Every adapter extends this class. No abstract members required.
 */

export interface RetryConfig {
  maxRetries?: number;
  timeoutMs?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  timeoutMs: 30_000,
  initialBackoffMs: 1_000,
  maxBackoffMs: 10_000,
};

export class MCPAdapterBase {
  /**
   * fetch() with retry, timeout, and rate-limit handling.
   *
   * Retries on: 429, 502, 503, 504, network errors, timeouts.
   * Does NOT retry: 400, 401, 403, 404, 500 (client errors / permanent server errors).
   * Respects Retry-After header on 429 responses.
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    config?: RetryConfig,
  ): Promise<Response> {
    const {
      maxRetries,
      timeoutMs,
      initialBackoffMs,
      maxBackoffMs,
    } = { ...DEFAULT_RETRY, ...config };

    let lastError: Error | null = null;
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timer);

        // Retryable status codes
        if ((response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504) && attempt < maxRetries) {
          lastResponse = response;

          let waitMs: number;
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              const parsed = Number(retryAfter);
              if (!isNaN(parsed)) {
                waitMs = parsed * 1000;
              } else {
                const date = new Date(retryAfter).getTime();
                waitMs = Math.max(0, date - Date.now());
              }
            } else {
              waitMs = Math.min(initialBackoffMs * Math.pow(2, attempt), maxBackoffMs);
            }
          } else {
            waitMs = Math.min(initialBackoffMs * Math.pow(2, attempt), maxBackoffMs);
          }

          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        // All other status codes — return immediately (including 400, 401, 403, 404, 500)
        return response;
      } catch (error) {
        clearTimeout(timer);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const waitMs = Math.min(initialBackoffMs * Math.pow(2, attempt), maxBackoffMs);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
      }
    }

    // All retries exhausted
    if (lastResponse) return lastResponse;
    // Return a synthetic Response instead of throwing — callers expect a Response, not an exception.
    // This ensures callTool try/catch handles network failures gracefully.
    const errMsg = lastError?.message || 'fetchWithRetry: all retries exhausted';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Truncate data to a max string length for tool result output.
   */
  protected truncate(data: unknown, maxLen = 10_000): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return str.length > maxLen
      ? str.slice(0, maxLen) + `\n... [truncated, ${str.length} total chars]`
      : str;
  }
}
