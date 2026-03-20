/**
 * @epicai/core — Stream Manager
 * Manages SSE and JSON transport for orchestrator output.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { StreamEvent, TransportMode } from '../types/index.js';
import { SSEWriter } from './SSEWriter.js';
import { JSONResponse } from './JSONResponse.js';

export class StreamManager {
  private readonly mode: TransportMode;

  constructor(mode: TransportMode = 'json') {
    this.mode = mode;
  }

  /**
   * Process a stream of events according to the configured transport mode.
   *
   * SSE mode: yields formatted SSE strings for writing to an HTTP response.
   * JSON mode: collects all events and yields a single JSON result.
   */
  async *process(
    stream: AsyncGenerator<StreamEvent>,
    persona: string,
  ): AsyncGenerator<string> {
    if (this.mode === 'sse') {
      for await (const event of stream) {
        yield SSEWriter.format(event);
      }
    } else {
      const result = await JSONResponse.collect(stream, persona);
      yield JSON.stringify(result);
    }
  }

  /**
   * Get HTTP headers for the configured transport mode.
   */
  headers(): Record<string, string> {
    if (this.mode === 'sse') {
      return SSEWriter.headers();
    }
    return { 'Content-Type': 'application/json' };
  }
}
