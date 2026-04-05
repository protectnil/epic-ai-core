/**
 * IBM Instana MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/instana/mcp-instana — transport: stdio + streamable-HTTP, auth: API token via env or HTTP header
// Official IBM repo (instana org), Python-based (requires uv). Actively maintained (2026-03+). 7 unified tools:
//   manage_instana_resources, manage_website_resources, manage_custom_dashboards, analyze_infrastructure,
//   manage_automation, manage_events_resources, manage_slo.
// Our adapter covers: 16 tools (infrastructure, services, events, traces, metrics, websites, SLI, alert configs).
// Vendor MCP covers: 7 unified router tools wrapping the full REST API surface.
// Recommendation: use-both — Vendor MCP uses aggregate router tools (1 tool per domain vs. our granular operations).
//   Our REST adapter provides direct per-operation access (get_snapshot, search_traces, get_event, etc.).
//   MCP-sourced tools (7): manage_instana_resources, manage_website_resources, manage_custom_dashboards,
//     analyze_infrastructure, manage_automation, manage_events_resources, manage_slo
//   REST-sourced tools (16): all tools in this adapter — granular per-operation coverage.
//   Use vendor MCP when Python/uv runtime is available and coarse-grained routing is acceptable.
//   Use this adapter for air-gapped or TypeScript-native deployments needing per-operation control.
//
// Base URL: https://{tenant}.instana.io  (SaaS) or https://instana.internal.example.com  (on-prem)
//           No fixed default — every deployment is tenant-specific. baseUrl is required.
// Auth: Authorization: apiToken {token}  (NOT "Bearer" — Instana uses the literal prefix "apiToken")
// Docs: https://instana.github.io/openapi/
// Rate limits: Not publicly documented. The REST API is designed for low-frequency tooling, not streaming.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InstanaConfig {
  /**
   * Instana tenant unit base URL.
   * SaaS example:  https://mycompany.instana.io
   * On-prem example: https://instana.internal.example.com
   */
  baseUrl: string;
  /**
   * Instana API token. Create at: Instana UI → Settings → Team Settings → API Tokens.
   * Sent as: Authorization: apiToken {token}
   */
  apiToken: string;
}

export class InstanaMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(config: InstanaConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
  }

  static catalog() {
    return {
      name: 'instana',
      displayName: 'IBM Instana',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['instana', 'ibm', 'apm', 'observability', 'infrastructure', 'snapshot', 'trace', 'metric', 'event', 'alert', 'service', 'website', 'sli'],
      toolNames: [
        'get_infrastructure_snapshots', 'get_snapshot', 'get_infrastructure_metrics',
        'list_services', 'get_service_metrics', 'list_endpoints', 'get_endpoint_metrics',
        'get_events', 'get_event',
        'get_trace', 'search_traces',
        'list_websites', 'get_website_metrics',
        'list_alert_configs',
        'get_sli_configs',
        'get_application_perspectives',
      ],
      description: 'IBM Instana APM and infrastructure observability: query snapshots, service metrics, traces, events, alerts, websites, SLI configs, and application perspectives.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_infrastructure_snapshots',
        description: 'Search infrastructure entity snapshots (hosts, containers, JVMs, processes) using Dynamic Focus query syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Dynamic Focus query to filter entities (e.g. "entity.type:host", "entity.tag:production AND entity.zone:us-east")',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds to search within (default: 60000 = 1 minute)',
            },
            size: {
              type: 'number',
              description: 'Maximum number of snapshots to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_snapshot',
        description: 'Retrieve detailed metadata for a single infrastructure entity snapshot by snapshot ID',
        inputSchema: {
          type: 'object',
          properties: {
            snapshot_id: { type: 'string', description: 'Snapshot ID of the infrastructure entity to retrieve' },
          },
          required: ['snapshot_id'],
        },
      },
      {
        name: 'get_infrastructure_metrics',
        description: 'Retrieve time-series infrastructure metrics (CPU, memory, disk, network) for a specific entity snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            snapshot_id: { type: 'string', description: 'Snapshot ID of the infrastructure entity' },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metric names to retrieve (e.g. ["cpu.user", "mem.used", "fs.bytes.used", "net.bytes.rcvd"])',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 = 1 hour)',
            },
            granularity: {
              type: 'number',
              description: 'Data granularity in seconds: 1, 5, 10, 60, 300, 600, 3600 (default: 60)',
            },
          },
          required: ['snapshot_id', 'metrics'],
        },
      },
      {
        name: 'list_services',
        description: 'List application services discovered by Instana APM within the specified time window',
        inputSchema: {
          type: 'object',
          properties: {
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 = 1 hour)',
            },
            name_filter: {
              type: 'string',
              description: 'Optional filter to match service names (substring match)',
            },
          },
        },
      },
      {
        name: 'get_service_metrics',
        description: 'Retrieve APM performance metrics (call rate, error rate, latency percentiles) for a specific service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Instana service ID from list_services' },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metric names: calls, erroneousCalls, meanLatency, p50Latency, p75Latency, p90Latency, p95Latency, p98Latency, p99Latency',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 = 1 hour)',
            },
            granularity: {
              type: 'number',
              description: 'Data granularity in seconds (default: 60)',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_endpoints',
        description: 'List service endpoints (APIs) discovered by Instana for a specific service or across all services',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Optional Instana service ID to filter endpoints for a specific service' },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 = 1 hour)',
            },
          },
        },
      },
      {
        name: 'get_endpoint_metrics',
        description: 'Retrieve performance metrics for a specific service endpoint (call rate, errors, latency)',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: { type: 'string', description: 'Instana endpoint ID from list_endpoints' },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metric names: calls, erroneousCalls, meanLatency, p99Latency (default: all four)',
            },
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 = 1 hour)',
            },
            granularity: { type: 'number', description: 'Data granularity in seconds (default: 60)' },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'get_events',
        description: 'Retrieve events and incidents detected by Instana, filtered by time window and minimum severity',
        inputSchema: {
          type: 'object',
          properties: {
            window_size: {
              type: 'number',
              description: 'Time window in milliseconds (default: 3600000 = 1 hour)',
            },
            severity: {
              type: 'number',
              description: 'Minimum severity: 5 = warning, 10 = critical (returns this level and above)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve full details for a specific Instana event by event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'Instana event ID to retrieve' },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'get_trace',
        description: 'Retrieve a complete distributed trace by trace ID including all spans and service hops',
        inputSchema: {
          type: 'object',
          properties: {
            trace_id: { type: 'string', description: 'Distributed trace ID to retrieve' },
          },
          required: ['trace_id'],
        },
      },
      {
        name: 'search_traces',
        description: 'Search distributed traces by service, endpoint, time range, or minimum latency threshold',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: { type: 'string', description: 'Filter traces by originating service name' },
            endpoint_name: { type: 'string', description: 'Filter traces by endpoint name (HTTP path or method)' },
            window_size: { type: 'number', description: 'Time window in milliseconds (default: 3600000 = 1 hour)' },
            min_duration_ms: { type: 'number', description: 'Filter traces with duration above this threshold in milliseconds' },
            erroneous: { type: 'boolean', description: 'If true, return only traces with errors (default: false = all traces)' },
            size: { type: 'number', description: 'Maximum number of traces to return (default: 50)' },
          },
        },
      },
      {
        name: 'list_websites',
        description: 'List websites monitored by Instana End-User Monitoring (EUM / website monitoring)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_website_metrics',
        description: 'Retrieve website performance metrics (page load, JS errors, AJAX calls) for an Instana-monitored website',
        inputSchema: {
          type: 'object',
          properties: {
            website_id: { type: 'string', description: 'Website ID from list_websites' },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metric names to retrieve (e.g. ["pageLoads", "onLoadTime", "jsErrors", "httpRequests"])',
            },
            window_size: { type: 'number', description: 'Time window in milliseconds (default: 3600000 = 1 hour)' },
            granularity: { type: 'number', description: 'Data granularity in seconds (default: 60)' },
          },
          required: ['website_id'],
        },
      },
      {
        name: 'list_alert_configs',
        description: 'List all alert configuration rules set up in Instana (smart alerts and custom alert channels)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_sli_configs',
        description: 'List all Service Level Indicator (SLI) configurations defined in Instana',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_application_perspectives',
        description: 'List all application perspectives (logical groupings of services) configured in Instana',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_infrastructure_snapshots':
          return await this.getInfrastructureSnapshots(args);
        case 'get_snapshot':
          return await this.getSnapshot(args);
        case 'get_infrastructure_metrics':
          return await this.getInfrastructureMetrics(args);
        case 'list_services':
          return await this.listServices(args);
        case 'get_service_metrics':
          return await this.getServiceMetrics(args);
        case 'list_endpoints':
          return await this.listEndpoints(args);
        case 'get_endpoint_metrics':
          return await this.getEndpointMetrics(args);
        case 'get_events':
          return await this.getEvents(args);
        case 'get_event':
          return await this.getEvent(args);
        case 'get_trace':
          return await this.getTrace(args);
        case 'search_traces':
          return await this.searchTraces(args);
        case 'list_websites':
          return await this.listWebsites();
        case 'get_website_metrics':
          return await this.getWebsiteMetrics(args);
        case 'list_alert_configs':
          return await this.listAlertConfigs();
        case 'get_sli_configs':
          return await this.getSliConfigs();
        case 'get_application_perspectives':
          return await this.getApplicationPerspectives();
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `apiToken ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params && params.toString() ? `?${params}` : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getInfrastructureSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('windowSize', String((args.window_size as number) ?? 60000));
    if (args.query) params.set('query', args.query as string);
    if (args.size) params.set('size', String(args.size));
    return this.apiGet('/api/infrastructure-monitoring/snapshots', params);
  }

  private async getSnapshot(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.snapshot_id as string;
    if (!id) return { content: [{ type: 'text', text: 'snapshot_id is required' }], isError: true };
    return this.apiGet(`/api/infrastructure-monitoring/snapshots/${encodeURIComponent(id)}`);
  }

  private async getInfrastructureMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const snapshotId = args.snapshot_id as string;
    const metrics = args.metrics as string[] | undefined;
    if (!snapshotId || !metrics || metrics.length === 0) {
      return { content: [{ type: 'text', text: 'snapshot_id and metrics are required' }], isError: true };
    }
    const windowSize = (args.window_size as number) ?? 3600000;
    const granularity = (args.granularity as number) ?? 60;
    return this.apiPost('/api/infrastructure-monitoring/metrics', {
      timeFrame: { windowSize },
      metrics: metrics.map((m) => ({ metric: m, granularity })),
      snapshotId,
    });
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      windowSize: String((args.window_size as number) ?? 3600000),
    });
    if (args.name_filter) params.set('nameFilter', args.name_filter as string);
    return this.apiGet('/api/application-monitoring/services', params);
  }

  private async getServiceMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.service_id as string;
    if (!serviceId) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    const windowSize = (args.window_size as number) ?? 3600000;
    const granularity = (args.granularity as number) ?? 60;
    const metrics = (args.metrics as string[]) ?? ['calls', 'erroneousCalls', 'meanLatency'];
    return this.apiPost('/api/application-monitoring/metrics/services', {
      timeFrame: { windowSize },
      metrics: metrics.map((m) => ({ metric: m, granularity })),
      applicationBoundaryScope: 'ALL',
      serviceId,
    });
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      windowSize: String((args.window_size as number) ?? 3600000),
    });
    if (args.service_id) params.set('serviceId', args.service_id as string);
    return this.apiGet('/api/application-monitoring/endpoints', params);
  }

  private async getEndpointMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointId = args.endpoint_id as string;
    if (!endpointId) return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    const windowSize = (args.window_size as number) ?? 3600000;
    const granularity = (args.granularity as number) ?? 60;
    const metrics = (args.metrics as string[]) ?? ['calls', 'erroneousCalls', 'meanLatency', 'p99Latency'];
    return this.apiPost('/api/application-monitoring/metrics/endpoints', {
      timeFrame: { windowSize },
      metrics: metrics.map((m) => ({ metric: m, granularity })),
      endpointId,
    });
  }

  private async getEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      windowSize: String((args.window_size as number) ?? 3600000),
    });
    if (args.severity !== undefined) params.set('severity', String(args.severity));
    return this.apiGet('/api/events', params);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.event_id as string;
    if (!id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.apiGet(`/api/events/${encodeURIComponent(id)}`);
  }

  private async getTrace(args: Record<string, unknown>): Promise<ToolResult> {
    const traceId = args.trace_id as string;
    if (!traceId) return { content: [{ type: 'text', text: 'trace_id is required' }], isError: true };
    return this.apiGet(`/api/application-monitoring/traces/${encodeURIComponent(traceId)}`);
  }

  private async searchTraces(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      timeFrame: { windowSize: (args.window_size as number) ?? 3600000 },
      pagination: { pageSize: (args.size as number) ?? 50 },
    };
    if (args.service_name) body.serviceName = args.service_name;
    if (args.endpoint_name) body.endpointName = args.endpoint_name;
    if (args.min_duration_ms) body.minDurationMillis = args.min_duration_ms;
    if (args.erroneous) body.erroneous = args.erroneous;
    return this.apiPost('/api/application-monitoring/analyze/traces', body);
  }

  private async listWebsites(): Promise<ToolResult> {
    return this.apiGet('/api/website-monitoring/config');
  }

  private async getWebsiteMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const websiteId = args.website_id as string;
    if (!websiteId) return { content: [{ type: 'text', text: 'website_id is required' }], isError: true };
    const windowSize = (args.window_size as number) ?? 3600000;
    const granularity = (args.granularity as number) ?? 60;
    const metrics = (args.metrics as string[]) ?? ['pageLoads', 'onLoadTime', 'jsErrors'];
    return this.apiPost('/api/website-monitoring/metrics', {
      timeFrame: { windowSize },
      metrics: metrics.map((m) => ({ metric: m, granularity })),
      websiteId,
    });
  }

  private async listAlertConfigs(): Promise<ToolResult> {
    return this.apiGet('/api/events/settings/alerts');
  }

  private async getSliConfigs(): Promise<ToolResult> {
    return this.apiGet('/api/settings/sli');
  }

  private async getApplicationPerspectives(): Promise<ToolResult> {
    return this.apiGet('/api/application-monitoring/applications');
  }
}
