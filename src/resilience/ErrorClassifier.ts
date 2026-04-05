/**
 * @epicai/legion — Error Classifier
 * Classifies errors as transient (retry) or permanent (fail fast).
 * Different retry strategies for different error types.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export type ErrorCategory = 'transient' | 'permanent' | 'rate-limited' | 'timeout';

export interface ClassifiedError {
  category: ErrorCategory;
  retryable: boolean;
  maxRetries: number;
  backoffMs: number;
  originalError: Error;
  message: string;
}

export class ErrorClassifier {
  /**
   * Classify an error and determine retry strategy.
   */
  static classify(error: unknown): ClassifiedError {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();

    // Rate limited
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      return {
        category: 'rate-limited',
        retryable: true,
        maxRetries: 5,
        backoffMs: 5000, // Start with 5s for rate limits
        originalError: err,
        message: `Rate limited: ${err.message}`,
      };
    }

    // Timeout
    if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted') || err.name === 'AbortError') {
      return {
        category: 'timeout',
        retryable: true,
        maxRetries: 3,
        backoffMs: 2000,
        originalError: err,
        message: `Timeout: ${err.message}`,
      };
    }

    // Transient server errors
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504') ||
        message.includes('econnreset') || message.includes('econnrefused') || message.includes('epipe') ||
        message.includes('network') || message.includes('fetch failed')) {
      return {
        category: 'transient',
        retryable: true,
        maxRetries: 3,
        backoffMs: 1000,
        originalError: err,
        message: `Transient error: ${err.message}`,
      };
    }

    // Permanent errors — do not retry
    // Auth failures, bad requests, not found, permission denied
    if (message.includes('401') || message.includes('403') || message.includes('404') ||
        message.includes('400') || message.includes('unauthorized') || message.includes('forbidden') ||
        message.includes('not found') || message.includes('invalid') || message.includes('permission')) {
      return {
        category: 'permanent',
        retryable: false,
        maxRetries: 0,
        backoffMs: 0,
        originalError: err,
        message: `Permanent error: ${err.message}`,
      };
    }

    // Default: treat unknown errors as transient with conservative retry
    return {
      category: 'transient',
      retryable: true,
      maxRetries: 2,
      backoffMs: 1000,
      originalError: err,
      message: `Unknown error (retrying): ${err.message}`,
    };
  }

  /**
   * Execute a function with retry logic based on error classification.
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options?: { maxRetries?: number; onRetry?: (error: ClassifiedError, attempt: number) => void },
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const classified = this.classify(error);

        const maxRetries = options?.maxRetries ?? classified.maxRetries;
        if (!classified.retryable || attempt >= maxRetries) {
          throw classified.originalError;
        }

        if (options?.onRetry) {
          options.onRetry(classified, attempt);
        }

        // Exponential backoff with jitter
        const backoff = classified.backoffMs * Math.pow(2, attempt);
        const jitter = Math.random() * backoff * 0.2; // 20% jitter
        await new Promise(resolve => setTimeout(resolve, backoff + jitter));
      }
    }
  }
}
