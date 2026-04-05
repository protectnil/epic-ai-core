/**
 * @epicai/legion — Event Emitter
 * Structured event callback system for observability.
 * Consumers pipe events to their own logging/monitoring stack.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { StreamEvent } from '../types/index.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  layer?: string;
}

export type EventCallback = (event: StreamEvent) => void;
export type LogCallback = (entry: LogEntry) => void;

export class ObservabilityEmitter {
  private readonly eventCallbacks: EventCallback[] = [];
  private readonly logCallbacks: LogCallback[] = [];
  private logLevel: LogLevel = 'info';

  private static readonly LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Register a callback for StreamEvents (orchestrator loop events).
   * Returns an unsubscribe function.
   */
  onEvent(callback: EventCallback): this {
    this.eventCallbacks.push(callback);
    return this;
  }

  /**
   * Deregister an event callback by reference.
   */
  offEvent(callback: EventCallback): this {
    const idx = this.eventCallbacks.indexOf(callback);
    if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    return this;
  }

  /**
   * Register a callback for structured log entries.
   * Returns an unsubscribe function.
   */
  onLog(callback: LogCallback): this {
    this.logCallbacks.push(callback);
    return this;
  }

  /**
   * Deregister a log callback by reference.
   */
  offLog(callback: LogCallback): this {
    const idx = this.logCallbacks.indexOf(callback);
    if (idx !== -1) this.logCallbacks.splice(idx, 1);
    return this;
  }

  /**
   * Set minimum log level. Messages below this level are suppressed.
   */
  setLogLevel(level: LogLevel): this {
    this.logLevel = level;
    return this;
  }

  /**
   * Emit a StreamEvent to all registered callbacks.
   */
  emitEvent(event: StreamEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* never break the pipeline */ }
    }
  }

  /**
   * Emit a structured log entry.
   */
  log(level: LogLevel, message: string, data?: Record<string, unknown>, layer?: string): void {
    if (ObservabilityEmitter.LEVEL_ORDER[level] < ObservabilityEmitter.LEVEL_ORDER[this.logLevel]) {
      return;
    }

    const entry: LogEntry = { level, message, data, timestamp: new Date(), layer };

    for (const cb of this.logCallbacks) {
      try { cb(entry); } catch { /* never break the pipeline */ }
    }
  }

  debug(message: string, data?: Record<string, unknown>, layer?: string): void {
    this.log('debug', message, data, layer);
  }

  info(message: string, data?: Record<string, unknown>, layer?: string): void {
    this.log('info', message, data, layer);
  }

  warn(message: string, data?: Record<string, unknown>, layer?: string): void {
    this.log('warn', message, data, layer);
  }

  error(message: string, data?: Record<string, unknown>, layer?: string): void {
    this.log('error', message, data, layer);
  }

  /**
   * Create a stderr-based log callback for development/debugging.
   *
   * Uses process.stderr (not stdout) to avoid polluting application output.
   * Each log entry is written as a single JSON line for structured parsing.
   *
   * @param redactKeys - Keys whose values will be recursively replaced
   *   with "[REDACTED]" at any depth, including inside arrays and nested objects.
   */
  static consoleLogger(redactKeys?: string[]): LogCallback {
    const redactSet = redactKeys ? new Set(redactKeys) : null;

    return (entry: LogEntry) => {
      let data = entry.data;
      if (data) {
        // Always run through deepRedactObj — handles circular refs AND redaction.
        // WeakSet scoped per-call to prevent cross-entry misclassification.
        const seen = new WeakSet();
        data = deepRedactObj(data, redactSet ?? new Set(), seen);
      }

      const line = JSON.stringify({
        ts: entry.timestamp.toISOString(),
        level: entry.level,
        layer: entry.layer,
        msg: entry.message,
        data,
      });

      process.stderr.write(line + '\n');
    };
  }
}

/**
 * Recursively redact keys in an object tree.
 * Handles nested objects, arrays, and circular references.
 * WeakSet is passed per-call to avoid cross-entry state leakage.
 */
function deepRedactObj(
  obj: Record<string, unknown>,
  keys: Set<string>,
  seen: WeakSet<object>,
): Record<string, unknown> {
  if (seen.has(obj)) return { _circular: true };
  seen.add(obj);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (keys.has(k)) {
      result[k] = '[REDACTED]';
    } else if (Array.isArray(v)) {
      result[k] = v.map(item => {
        if (item && typeof item === 'object' && !(item instanceof Date)) {
          return deepRedactObj(item as Record<string, unknown>, keys, seen);
        }
        return item;
      });
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      result[k] = deepRedactObj(v as Record<string, unknown>, keys, seen);
    } else {
      result[k] = v;
    }
  }
  return result;
}
