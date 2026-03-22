/**
 * @epicai/core — Logger
 * Thin wrapper over globalThis.console, following the Anthropic/OpenAI SDK pattern.
 * Zero dependencies. Controllable via EPICAI_LOG env var or constructor logLevel.
 *
 * Default: 'warn' — only warnings and errors.
 * Set EPICAI_LOG=debug to see full LLM request/response payloads.
 *
 * Optional Loki transport: set EPICAI_LOG_LOKI_URL, EPICAI_LOG_LOKI_USER,
 * and EPICAI_LOG_LOKI_TOKEN to push logs to Grafana Cloud Loki alongside stderr.
 * Logs persist even if the machine is destroyed.
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  off: 4,
};

function resolveLevel(explicit?: LogLevel): LogLevel {
  if (explicit) return explicit;
  const env = (typeof process !== 'undefined' && process.env?.EPICAI_LOG) || '';
  if (env && env in LEVEL_ORDER) return env as LogLevel;
  return 'warn';
}

export interface LoggerInterface {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  flush(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Loki transport — batched HTTP push, zero dependencies
// ---------------------------------------------------------------------------

interface LokiEntry {
  ts: string;       // nanosecond timestamp
  line: string;     // JSON log line
  level: string;
  component: string;
}

let lokiBuffer: LokiEntry[] = [];
let lokiFlushTimer: ReturnType<typeof setTimeout> | null = null;
const LOKI_FLUSH_INTERVAL_MS = 2000;
const LOKI_MAX_BUFFER = 50;

function lokiEnabled(): boolean {
  return !!(
    typeof process !== 'undefined' &&
    process.env?.EPICAI_LOG_LOKI_URL &&
    process.env?.EPICAI_LOG_LOKI_TOKEN
  );
}

function queueLoki(component: string, level: string, line: string): void {
  if (!lokiEnabled()) return;

  const ts = (Date.now() * 1_000_000).toString(); // nanoseconds
  lokiBuffer.push({ ts, line, level, component });

  if (lokiBuffer.length >= LOKI_MAX_BUFFER) {
    void flushLoki();
  }

  if (!lokiFlushTimer) {
    lokiFlushTimer = setTimeout(() => {
      lokiFlushTimer = null;
      void flushLoki();
    }, LOKI_FLUSH_INTERVAL_MS);
  }
}

async function flushLoki(): Promise<void> {
  if (lokiBuffer.length === 0) return;

  const url = process.env.EPICAI_LOG_LOKI_URL!;
  const user = process.env.EPICAI_LOG_LOKI_USER || '';
  const token = process.env.EPICAI_LOG_LOKI_TOKEN!;
  const auth = Buffer.from(`${user}:${token}`).toString('base64');

  const entries = [...lokiBuffer];
  lokiBuffer = [];

  // Group by component+level for efficient push
  const streamMap = new Map<string, { stream: Record<string, string>; values: [string, string][] }>();
  for (const entry of entries) {
    const key = `${entry.component}:${entry.level}`;
    if (!streamMap.has(key)) {
      streamMap.set(key, {
        stream: {
          app: 'epicai-core',
          component: entry.component,
          level: entry.level,
          env: process.env.NODE_ENV || 'test',
        },
        values: [],
      });
    }
    streamMap.get(key)!.values.push([entry.ts, entry.line]);
  }

  const payload = { streams: [...streamMap.values()] };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok && response.status !== 204) {
      process.stderr.write(`[epicai.logger] Loki push failed: ${response.status}\n`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[epicai.logger] Loki push error: ${msg}\n`);
  }
}

// Flush on exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => { void flushLoki(); });
}

// ---------------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------------

/**
 * Create a logger instance scoped to a component.
 *
 * Usage:
 *   const log = createLogger('orchestrator', 'debug');
 *   log.debug('Raw Ollama response', { data: responseBody });
 *
 * Or let it read from EPICAI_LOG env var:
 *   const log = createLogger('orchestrator');
 *   // EPICAI_LOG=debug npm test  ← enables debug output
 *
 * Optional Loki transport (for persistent remote logging):
 *   EPICAI_LOG_LOKI_URL=https://logs-prod-021.grafana.net/loki/api/v1/push
 *   EPICAI_LOG_LOKI_USER=1221670
 *   EPICAI_LOG_LOKI_TOKEN=glc_...
 *   EPICAI_LOG=debug npm run test:integration
 */
export function createLogger(component: string, level?: LogLevel): LoggerInterface {
  const minLevel = resolveLevel(level);

  function shouldLog(msgLevel: LogLevel): boolean {
    return LEVEL_ORDER[msgLevel] >= LEVEL_ORDER[minLevel];
  }

  function formatStderr(msgLevel: string, message: string, data?: Record<string, unknown>): string {
    const ts = new Date().toISOString();
    const base = `[${ts}] epicai.${component} ${msgLevel.toUpperCase()}: ${message}`;
    if (data && Object.keys(data).length > 0) {
      return `${base} ${JSON.stringify(data)}`;
    }
    return base;
  }

  function formatLoki(msgLevel: string, message: string, data?: Record<string, unknown>): string {
    return JSON.stringify({
      ts: new Date().toISOString(),
      level: msgLevel,
      component,
      message,
      ...data,
    });
  }

  function emit(msgLevel: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(msgLevel)) return;
    process.stderr.write(formatStderr(msgLevel, message, data) + '\n');
    queueLoki(component, msgLevel, formatLoki(msgLevel, message, data));
  }

  return {
    debug(message: string, data?: Record<string, unknown>): void {
      emit('debug', message, data);
    },
    info(message: string, data?: Record<string, unknown>): void {
      emit('info', message, data);
    },
    warn(message: string, data?: Record<string, unknown>): void {
      emit('warn', message, data);
    },
    error(message: string, data?: Record<string, unknown>): void {
      emit('error', message, data);
    },
    async flush(): Promise<void> {
      await flushLoki();
    },
  };
}
