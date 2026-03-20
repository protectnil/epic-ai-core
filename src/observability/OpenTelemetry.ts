/**
 * @epic-ai/core — OpenTelemetry Integration
 * Converts StreamEvents and LogEntries into OTEL-compatible spans.
 * Consumer provides their own OTEL SDK — we just format the data.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { randomBytes } from 'node:crypto';
import type { StreamEvent } from '../types/index.js';
import type { LogEntry, EventCallback, LogCallback } from './EventEmitter.js';

export interface OTelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  attributes: Record<string, string | number | boolean>;
  events: { name: string; timestamp: Date; attributes?: Record<string, string | number | boolean> }[];
  status: 'OK' | 'ERROR' | 'UNSET';
}

export type SpanExporter = (span: OTelSpan) => void;

/**
 * Creates an EventCallback that converts StreamEvents into OTEL spans.
 * The consumer provides a SpanExporter that sends spans to their OTEL backend
 * (Grafana, Datadog, Jaeger, etc.).
 */
export function createOTelEventCallback(exporter: SpanExporter, traceId?: string): EventCallback {
  const activeTraceId = traceId ?? generateTraceId();
  let rootSpanId: string | null = null;
  const spanStartTimes = new Map<string, Date>();

  return (event: StreamEvent) => {
    const spanId = generateId();

    if (event.type === 'plan') {
      rootSpanId = spanId;
      spanStartTimes.set('root', event.timestamp);
    }

    const span: OTelSpan = {
      traceId: activeTraceId,
      spanId,
      parentSpanId: rootSpanId ?? undefined,
      operationName: `epic-ai.${event.type}`,
      startTime: event.timestamp,
      attributes: {
        'epic_ai.event_type': event.type,
        ...flattenData(event.data),
      },
      events: [],
      status: event.type === 'error' ? 'ERROR' : 'OK',
    };

    if (event.type === 'done') {
      const rootStart = spanStartTimes.get('root');
      if (rootStart) {
        span.startTime = rootStart;
        span.endTime = event.timestamp;
        span.operationName = 'epic-ai.orchestrator';
      }
    }

    exporter(span);
  };
}

/**
 * Creates a LogCallback that converts LogEntries into OTEL-formatted log records.
 */
export function createOTelLogCallback(exporter: (record: OTelLogRecord) => void): LogCallback {
  return (entry: LogEntry) => {
    exporter({
      timestamp: entry.timestamp,
      severityText: entry.level.toUpperCase(),
      severityNumber: SEVERITY_MAP[entry.level],
      body: entry.message,
      attributes: {
        'epic_ai.layer': entry.layer ?? 'unknown',
        ...flattenData(entry.data ?? {}),
      },
    });
  };
}

export interface OTelLogRecord {
  timestamp: Date;
  severityText: string;
  severityNumber: number;
  body: string;
  attributes: Record<string, string | number | boolean>;
}

const SEVERITY_MAP: Record<string, number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
};

/**
 * Generate a cryptographically random trace ID (16 bytes = 32 hex chars).
 */
function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a cryptographically random span ID (8 bytes = 16 hex chars).
 */
function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

function generateId(): string {
  return generateSpanId();
}

function flattenData(data: Record<string, unknown>): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[`epic_ai.${key}`] = value;
    } else if (value !== null && value !== undefined) {
      result[`epic_ai.${key}`] = JSON.stringify(value);
    }
  }
  return result;
}
