/**
 * @epicai/core — Run Telemetry
 * Collects a concise, human-readable summary of one agent run.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import type { StreamEvent } from '../types/index.js';
import type { LogEntry, LogLevel } from './EventEmitter.js';

export interface RunTelemetryStep {
  type: StreamEvent['type'];
  timestamp: Date;
  data: StreamEvent['data'];
}

export interface RunTelemetryLog {
  level: LogLevel;
  timestamp: Date;
  message: string;
  layer?: string;
  data?: Record<string, unknown>;
}

export interface RunTelemetrySnapshot {
  runId: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number;
  eventCounts: Record<StreamEvent['type'], number>;
  logCounts: Record<LogLevel, number>;
  recentSteps: RunTelemetryStep[];
  recentLogs: RunTelemetryLog[];
  lastEventType: StreamEvent['type'] | null;
  lastError: string | null;
}

interface TelemetrySource {
  onEvent(callback: (event: StreamEvent) => void): unknown;
  offEvent?(callback: (event: StreamEvent) => void): unknown;
  onLog(callback: (entry: LogEntry) => void): unknown;
  offLog?(callback: (entry: LogEntry) => void): unknown;
}

export interface RunTelemetryCollectorOptions {
  runId?: string;
  startedAt?: Date;
  maxRecentEntries?: number;
}

const EVENT_TYPES: StreamEvent['type'][] = [
  'plan',
  'action',
  'approval-needed',
  'result',
  'memory',
  'narrative',
  'error',
  'done',
];

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function createEventCounts(): Record<StreamEvent['type'], number> {
  return {
    plan: 0,
    action: 0,
    'approval-needed': 0,
    result: 0,
    memory: 0,
    narrative: 0,
    error: 0,
    done: 0,
  };
}

function createLogCounts(): Record<LogLevel, number> {
  return {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
  };
}

function cloneData(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as unknown;
  }
}

/**
 * Collects and formats run-level telemetry from StreamEvents and structured logs.
 */
export class RunTelemetryCollector {
  private readonly runId: string;
  private readonly startedAt: Date;
  private readonly maxRecentEntries: number;
  private finishedAt: Date | null = null;
  private readonly eventCounts = createEventCounts();
  private readonly logCounts = createLogCounts();
  private readonly recentSteps: RunTelemetryStep[] = [];
  private readonly recentLogs: RunTelemetryLog[] = [];
  private lastEventType: StreamEvent['type'] | null = null;
  private lastError: string | null = null;

  constructor(options: RunTelemetryCollectorOptions = {}) {
    this.runId = options.runId ?? randomUUID();
    this.startedAt = options.startedAt ?? new Date();
    this.maxRecentEntries = options.maxRecentEntries ?? 12;
  }

  recordEvent(event: StreamEvent): void {
    this.eventCounts[event.type] += 1;
    this.lastEventType = event.type;

    if (event.type === 'error') {
      this.lastError = event.data.message;
    }

    if (event.type === 'done') {
      this.finishedAt = event.timestamp;
    }

    this.recentSteps.push({
      type: event.type,
      timestamp: event.timestamp,
      data: cloneData(event.data) as StreamEvent['data'],
    });

    this.trimRecentEntries();
  }

  recordLog(entry: LogEntry): void {
    this.logCounts[entry.level] += 1;

    this.recentLogs.push({
      level: entry.level,
      timestamp: entry.timestamp,
      message: entry.message,
      layer: entry.layer,
      data: entry.data ? cloneData(entry.data) as Record<string, unknown> : undefined,
    });

    this.trimRecentEntries();
  }

  attach(source: TelemetrySource): () => void {
    const eventCallback = (event: StreamEvent) => this.recordEvent(event);
    const logCallback = (entry: LogEntry) => this.recordLog(entry);

    source.onEvent(eventCallback);
    source.onLog(logCallback);

    return () => {
      source.offEvent?.(eventCallback);
      source.offLog?.(logCallback);
    };
  }

  snapshot(): RunTelemetrySnapshot {
    const endTime = this.finishedAt ?? this.recentSteps.at(-1)?.timestamp ?? this.recentLogs.at(-1)?.timestamp ?? this.startedAt;
    const durationMs = Math.max(0, endTime.getTime() - this.startedAt.getTime());

    return {
      runId: this.runId,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      durationMs,
      eventCounts: { ...this.eventCounts },
      logCounts: { ...this.logCounts },
      recentSteps: [...this.recentSteps],
      recentLogs: [...this.recentLogs],
      lastEventType: this.lastEventType,
      lastError: this.lastError,
    };
  }

  format(): string {
    const snapshot = this.snapshot();
    const events = EVENT_TYPES.map(type => `${type}=${snapshot.eventCounts[type]}`).join(' ');
    const logs = LOG_LEVELS.map(level => `${level}=${snapshot.logCounts[level]}`).join(' ');
    const steps = snapshot.recentSteps.length > 0
      ? snapshot.recentSteps
          .map(step => `  - [${step.type}] ${JSON.stringify(step.data)}`)
          .join('\n')
      : '  - (none)';
    const logTail = snapshot.recentLogs.length > 0
      ? snapshot.recentLogs
          .map(entry => `  - [${entry.level}] ${entry.layer ?? 'unknown'} ${entry.message}`)
          .join('\n')
      : '  - (none)';

    return [
      `Run ${snapshot.runId}`,
      `Duration: ${snapshot.durationMs}ms`,
      `Events: ${events}`,
      `Logs: ${logs}`,
      `Last event: ${snapshot.lastEventType ?? 'none'}`,
      `Last error: ${snapshot.lastError ?? 'none'}`,
      'Recent events:',
      steps,
      'Recent logs:',
      logTail,
    ].join('\n');
  }

  private trimRecentEntries(): void {
    while (this.recentSteps.length > this.maxRecentEntries) {
      this.recentSteps.shift();
    }
    while (this.recentLogs.length > this.maxRecentEntries) {
      this.recentLogs.shift();
    }
  }
}
