/**
 * @epic-ai/core — JSON Response
 * Collect all stream events and return a complete RunResult.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { StreamEvent, RunResult } from '../types/index.js';

export class JSONResponse {
  /**
   * Collect all events from a stream and build a RunResult.
   */
  static async collect(
    stream: AsyncGenerator<StreamEvent>,
    persona: string,
  ): Promise<RunResult> {
    const events: StreamEvent[] = [];
    const startTime = Date.now();

    for await (const event of stream) {
      events.push(event);
    }

    const narrativeEvents = events.filter(e => e.type === 'narrative');
    const response = narrativeEvents
      .map(e => (e.data as { text: string }).text)
      .join('');

    return {
      response,
      events,
      actionsExecuted: events.filter(e => e.type === 'action').length,
      actionsPending: events.filter(e => e.type === 'approval-needed').length,
      persona,
      durationMs: Date.now() - startTime,
    };
  }
}
