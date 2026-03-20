/**
 * @epicai/core — SSE Writer
 * Server-Sent Events format helpers.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { StreamEvent } from '../types/index.js';

export class SSEWriter {
  /**
   * Format a StreamEvent as an SSE data line.
   * Output: `data: {"type":"plan","data":{...},"timestamp":"..."}\n\n`
   */
  static format(event: StreamEvent): string {
    const payload = {
      type: event.type,
      data: event.data,
      timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
    };
    return `data: ${JSON.stringify(payload)}\n\n`;
  }

  /**
   * Format SSE headers for an HTTP response.
   */
  static headers(): Record<string, string> {
    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    };
  }

  /**
   * Format a comment line (keep-alive ping).
   */
  static comment(text: string): string {
    return `: ${text}\n\n`;
  }
}
