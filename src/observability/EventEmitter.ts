/**
 * @epic-ai/core — Event Emitter
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
   * Convenience: create a console-based log callback.
   *
   * WARNING: This logger outputs structured log data to stdout.
   * Sensitive fields (e.g. tokens, passwords, secrets) in `entry.data` will be
   * visible in logs. Use `redactKeys` to replace sensitive values with [REDACTED].
   *
   * @param redactKeys - Optional list of data keys whose values will be replaced
   *   with "[REDACTED]" before logging. Applied shallowly to entry.data.
   */
  static consoleLogger(redactKeys?: string[]): LogCallback {
    const redactSet = redactKeys ? new Set(redactKeys) : null;

    return (entry: LogEntry) => {
      const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}]${entry.layer ? ` [${entry.layer}]` : ''}`;

      let data = entry.data;
      if (data && redactSet && redactSet.size > 0) {
        data = Object.fromEntries(
          Object.entries(data).map(([k, v]) =>
            redactSet.has(k) ? [k, '[REDACTED]'] : [k, v],
          ),
        );
      }

      if (data) {
        console.log(`${prefix} ${entry.message}`, data);
      } else {
        console.log(`${prefix} ${entry.message}`);
      }
    };
  }
}
