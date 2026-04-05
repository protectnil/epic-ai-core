/**
 * @epicai/legion — Prometheus Metrics Exporter
 * Exposes gateway and federation metrics in Prometheus format.
 * Metrics are served at /metrics by the gateway.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createLogger } from '../logger.js';

const log = createLogger('observability.prometheus');

// =============================================================================
// Types
// =============================================================================

interface CounterMetric {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

interface GaugeMetric {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

interface HistogramMetric {
  name: string;
  help: string;
  labels: string[];
  buckets: number[];
  observations: Map<string, { sum: number; count: number; buckets: number[] }>;
}

// =============================================================================
// Prometheus Exporter (zero-dependency implementation)
// =============================================================================

export class PrometheusExporter {
  private readonly counters = new Map<string, CounterMetric>();
  private readonly gauges = new Map<string, GaugeMetric>();
  private readonly histograms = new Map<string, HistogramMetric>();

  constructor() {
    this.registerDefaults();
  }

  // ---------------------------------------------------------------------------
  // Counter
  // ---------------------------------------------------------------------------

  incCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
    const metric = this.counters.get(name);
    if (!metric) return;

    const key = this.labelKey(labels);
    metric.values.set(key, (metric.values.get(key) ?? 0) + value);
  }

  // ---------------------------------------------------------------------------
  // Gauge
  // ---------------------------------------------------------------------------

  setGauge(name: string, labels: Record<string, string> = {}, value: number): void {
    const metric = this.gauges.get(name);
    if (!metric) return;

    const key = this.labelKey(labels);
    metric.values.set(key, value);
  }

  incGauge(name: string, labels: Record<string, string> = {}, value = 1): void {
    const metric = this.gauges.get(name);
    if (!metric) return;

    const key = this.labelKey(labels);
    metric.values.set(key, (metric.values.get(key) ?? 0) + value);
  }

  decGauge(name: string, labels: Record<string, string> = {}, value = 1): void {
    this.incGauge(name, labels, -value);
  }

  // ---------------------------------------------------------------------------
  // Histogram
  // ---------------------------------------------------------------------------

  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    const metric = this.histograms.get(name);
    if (!metric) return;

    const key = this.labelKey(labels);
    let obs = metric.observations.get(key);
    if (!obs) {
      obs = { sum: 0, count: 0, buckets: new Array(metric.buckets.length).fill(0) as number[] };
      metric.observations.set(key, obs);
    }

    obs.sum += value;
    obs.count++;
    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        obs.buckets[i]++;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  /**
   * Render all metrics in Prometheus text exposition format.
   */
  export(): string {
    const lines: string[] = [];

    for (const [, metric] of this.counters) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} counter`);
      for (const [labels, value] of metric.values) {
        lines.push(`${metric.name}${labels} ${value}`);
      }
    }

    for (const [, metric] of this.gauges) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} gauge`);
      for (const [labels, value] of metric.values) {
        lines.push(`${metric.name}${labels} ${value}`);
      }
    }

    for (const [, metric] of this.histograms) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} histogram`);
      for (const [labels, obs] of metric.observations) {
        const labelStr = labels || '';
        const comma = labelStr.length > 1 ? ',' : '';
        const open = labelStr.startsWith('{') ? labelStr.slice(0, -1) : '{';
        const close = '}';

        for (let i = 0; i < metric.buckets.length; i++) {
          const bucketLabel = `${open}${comma}le="${metric.buckets[i]}"${close}`;
          lines.push(`${metric.name}_bucket${bucketLabel} ${obs.buckets[i]}`);
        }
        const infLabel = `${open}${comma}le="+Inf"${close}`;
        lines.push(`${metric.name}_bucket${infLabel} ${obs.count}`);
        lines.push(`${metric.name}_sum${labels} ${obs.sum}`);
        lines.push(`${metric.name}_count${labels} ${obs.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  private registerDefaults(): void {
    // Gateway metrics
    this.counters.set('epicai_gateway_requests_total', {
      name: 'epicai_gateway_requests_total',
      help: 'Total gateway requests',
      labels: ['backend', 'status'],
      values: new Map(),
    });

    this.histograms.set('epicai_gateway_request_duration_seconds', {
      name: 'epicai_gateway_request_duration_seconds',
      help: 'Gateway request duration in seconds',
      labels: ['backend'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
      observations: new Map(),
    });

    this.gauges.set('epicai_gateway_queue_depth', {
      name: 'epicai_gateway_queue_depth',
      help: 'Current queue depth per backend',
      labels: ['backend'],
      values: new Map(),
    });

    this.gauges.set('epicai_gateway_backend_health', {
      name: 'epicai_gateway_backend_health',
      help: 'Backend health status (1=healthy, 0=unhealthy)',
      labels: ['backend', 'status'],
      values: new Map(),
    });

    // Federation metrics
    this.counters.set('epicai_federation_tool_calls_total', {
      name: 'epicai_federation_tool_calls_total',
      help: 'Total tool calls',
      labels: ['adapter', 'tool', 'tier'],
      values: new Map(),
    });

    this.histograms.set('epicai_federation_tool_call_duration_seconds', {
      name: 'epicai_federation_tool_call_duration_seconds',
      help: 'Tool call duration in seconds',
      labels: ['adapter', 'tool'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
      observations: new Map(),
    });

    this.gauges.set('epicai_federation_connections_active', {
      name: 'epicai_federation_connections_active',
      help: 'Active adapter connections',
      labels: ['tenant', 'adapter'],
      values: new Map(),
    });

    // Autonomy metrics
    this.counters.set('epicai_autonomy_decisions_total', {
      name: 'epicai_autonomy_decisions_total',
      help: 'Total autonomy decisions',
      labels: ['tier', 'decision'],
      values: new Map(),
    });

    // Audit metrics
    this.counters.set('epicai_audit_records_total', {
      name: 'epicai_audit_records_total',
      help: 'Total audit records',
      labels: ['tier'],
      values: new Map(),
    });

    log.info('prometheus metrics registered', { counters: this.counters.size, gauges: this.gauges.size, histograms: this.histograms.size });
  }

  private labelKey(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
  }
}
