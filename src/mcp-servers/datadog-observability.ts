/**
 * Datadog Observability MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/datadog-labs/mcp-server — transport: streamable-HTTP, auth: DD-API-KEY + DD-APPLICATION-KEY
// Our adapter covers: 18 tools (core observability). Vendor MCP covers: 16+ core tools (logs, metrics, traces, dashboards, monitors, incidents, hosts).
// Recommendation: use-both — vendor MCP covers logs, metrics, traces, monitors, hosts, incidents, dashboards as read operations;
//   our REST adapter adds mute_monitor, unmute_monitor, list_downtimes, get_host_totals, list_events, list_slos, get_slo_history
//   which are not exposed by the vendor MCP core toolset. Use MCP for reads, REST adapter for write/downtime/SLO operations.
//
// MCP tool names (core): get_logs, list_spans, get_trace, list_metrics, get_metrics, get_monitors, list_hosts,
//   list_incidents, get_incident, list_dashboards, search_datadog_events, search_datadog_monitors,
//   search_datadog_dashboards, search_datadog_hosts, search_datadog_incidents, search_datadog_metrics
//
// Base URL: https://api.{site}  (site examples: datadoghq.com, datadoghq.eu, us3.datadoghq.com)
// Auth: DD-API-KEY + DD-APPLICATION-KEY headers (Application Key required for most read operations)
// Docs: https://docs.datadoghq.com/api/latest/
// Rate limits: Varies by endpoint; metrics query ~300 req/hour; logs search ~300 req/hour

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DatadogObservabilityConfig {
  apiKey: string;
  applicationKey: string;
  /** Datadog site (default: datadoghq.com). Examples: datadoghq.eu, us3.datadoghq.com, us5.datadoghq.com */
  site?: string;
}

export class DatadogObservabilityMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: DatadogObservabilityConfig) {
    super();
    this.baseUrl = `https://api.${config.site ?? 'datadoghq.com'}`;
    this.headers = {
      'DD-API-KEY': config.apiKey,
      'DD-APPLICATION-KEY': config.applicationKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'datadog-observability',
      displayName: 'Datadog Observability',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'datadog', 'metrics', 'monitor', 'alert', 'dashboard', 'log', 'incident',
        'downtime', 'slo', 'service level objective', 'host', 'event', 'trace', 'apm',
      ],
      toolNames: [
        'query_metrics', 'list_metrics',
        'list_monitors', 'get_monitor', 'mute_monitor', 'unmute_monitor',
        'search_logs', 'list_dashboards', 'get_dashboard',
        'list_incidents', 'get_incident',
        'list_downtimes',
        'list_hosts', 'get_host_totals',
        'list_events', 'query_events',
        'list_slos', 'get_slo_history',
      ],
      description: 'Datadog observability: query metrics, search logs, manage monitors, dashboards, SLOs, incidents, hosts, and events.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_metrics',
        description: 'Query time-series metric data from Datadog for a given query string and time window',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Datadog metrics query string (e.g. "avg:system.cpu.user{env:prod}")',
            },
            from: {
              type: 'number',
              description: 'Start of query window as Unix epoch seconds',
            },
            to: {
              type: 'number',
              description: 'End of query window as Unix epoch seconds',
            },
          },
          required: ['query', 'from', 'to'],
        },
      },
      {
        name: 'list_metrics',
        description: 'List all metric names available in Datadog, optionally filtered by a name prefix',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Prefix or substring to filter metric names (e.g. "system.cpu")',
            },
          },
        },
      },
      {
        name: 'list_monitors',
        description: 'List Datadog monitors with optional filters for name, tags, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter monitors whose name contains this substring',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated monitor tags to filter by (e.g. "env:prod,team:sre")',
            },
            page: {
              type: 'number',
              description: 'Page index for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of monitors per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_monitor',
        description: 'Get full configuration, state, and alert history for a specific Datadog monitor by ID',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'number',
              description: 'Numeric monitor ID',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'mute_monitor',
        description: 'Mute a Datadog monitor to suppress alerts, with optional end time and scope',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'number',
              description: 'Numeric monitor ID to mute',
            },
            end: {
              type: 'number',
              description: 'Unix epoch seconds when mute should expire (default: indefinite)',
            },
            scope: {
              type: 'string',
              description: 'Optional scope to restrict muting to specific group tags (e.g. "env:prod")',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'unmute_monitor',
        description: 'Remove an active mute from a Datadog monitor to resume alert notifications',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'number',
              description: 'Numeric monitor ID to unmute',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'search_logs',
        description: 'Search Datadog logs using a query string with optional time range and result limit',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Log search query (e.g. "service:api status:error @http.status_code:500")',
            },
            from: {
              type: 'number',
              description: 'Start timestamp in milliseconds (default: 24 hours ago)',
            },
            to: {
              type: 'number',
              description: 'End timestamp in milliseconds (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of logs to return (default: 100, max: 1000)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List Datadog dashboards with optional filters for shared status and deleted state',
        inputSchema: {
          type: 'object',
          properties: {
            filter_shared: {
              type: 'boolean',
              description: 'When true, only return shared/public dashboards',
            },
            filter_deleted: {
              type: 'boolean',
              description: 'When true, return only soft-deleted dashboards',
            },
            count: {
              type: 'number',
              description: 'Maximum number of dashboards to return per page (default: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset to start the returned list from (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Retrieve the full widget layout and definition of a specific Datadog dashboard by ID',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'string',
              description: 'Dashboard ID string (e.g. "abc-def-123")',
            },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'list_incidents',
        description: 'List Datadog Incident Management incidents with pagination and optional related-object includes',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of incidents per page (max 100, default: 10)',
            },
            page_offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            include: {
              type: 'string',
              description: 'Comma-separated related object types to include (e.g. "users,teams")',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Get full details, timeline, and responders for a specific Datadog incident by incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Incident ID (UUID string)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_downtimes',
        description: 'List all active and scheduled downtimes in Datadog, optionally filtered by current status',
        inputSchema: {
          type: 'object',
          properties: {
            current_only: {
              type: 'boolean',
              description: 'When true, only return currently active downtimes (default: false)',
            },
          },
        },
      },
      {
        name: 'list_hosts',
        description: 'List all hosts reporting to Datadog with optional filter, sort, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter hosts by hostname, tag, or alias (e.g. "env:prod")',
            },
            sort_field: {
              type: 'string',
              description: 'Field to sort by: status, apps, cpu, iowait, load (default: status)',
            },
            sort_dir: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            count: {
              type: 'number',
              description: 'Maximum number of hosts to return (default: 100)',
            },
            start: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_host_totals',
        description: 'Get total counts of active hosts reporting to Datadog over the last 2 hours',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_events',
        description: 'List Datadog events stream with filters for time range, priority, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Start of time window as Unix epoch seconds',
            },
            end: {
              type: 'number',
              description: 'End of time window as Unix epoch seconds',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority: normal or low',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated tags to filter events by (e.g. "env:prod,service:api")',
            },
          },
        },
      },
      {
        name: 'query_events',
        description: 'Search the Datadog event stream using a query string with optional time range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Event search query (e.g. "source:kubernetes priority:normal")',
            },
            from: {
              type: 'number',
              description: 'Start timestamp in Unix milliseconds (default: 24 hours ago)',
            },
            to: {
              type: 'number',
              description: 'End timestamp in Unix milliseconds (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_slos',
        description: 'List all Service Level Objectives (SLOs) with optional filter by name, tags, or IDs',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter SLOs by name substring',
            },
            tags_query: {
              type: 'string',
              description: 'Filter SLOs by tag (e.g. "service:checkout")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of SLOs to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_slo_history',
        description: 'Get the SLO status history and error budget remaining for a specific SLO over a time window',
        inputSchema: {
          type: 'object',
          properties: {
            slo_id: {
              type: 'string',
              description: 'SLO ID (string)',
            },
            from_ts: {
              type: 'number',
              description: 'Start of time window as Unix epoch seconds',
            },
            to_ts: {
              type: 'number',
              description: 'End of time window as Unix epoch seconds',
            },
          },
          required: ['slo_id', 'from_ts', 'to_ts'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_metrics':
          return await this.queryMetrics(args);
        case 'list_metrics':
          return await this.listMetrics(args);
        case 'list_monitors':
          return await this.listMonitors(args);
        case 'get_monitor':
          return await this.getMonitor(args);
        case 'mute_monitor':
          return await this.muteMonitor(args);
        case 'unmute_monitor':
          return await this.unmuteMonitor(args);
        case 'search_logs':
          return await this.searchLogs(args);
        case 'list_dashboards':
          return await this.listDashboards(args);
        case 'get_dashboard':
          return await this.getDashboard(args);
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'list_downtimes':
          return await this.listDowntimes(args);
        case 'list_hosts':
          return await this.listHosts(args);
        case 'get_host_totals':
          return await this.getHostTotals();
        case 'list_events':
          return await this.listEvents(args);
        case 'query_events':
          return await this.queryEvents(args);
        case 'list_slos':
          return await this.listSlos(args);
        case 'get_slo_history':
          return await this.getSloHistory(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Response helper ───────────────────────────────────────────────────────────


  private async jsonOrError(res: Response, context: string): Promise<unknown> {
    if (!res.ok) throw new Error(`Datadog API error (${context}): ${res.status} ${res.statusText}`);
    try {
      return await res.json();
    } catch {
      throw new Error(`Datadog returned non-JSON response for ${context} (HTTP ${res.status})`);
    }
  }

  // ── Tool implementations ──────────────────────────────────────────────────────

  private async queryMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    const from = args.from as number;
    const to = args.to as number;
    if (!query) throw new Error('query is required');
    if (from === undefined) throw new Error('from is required');
    if (to === undefined) throw new Error('to is required');

    const params = new URLSearchParams({ query, from: String(from), to: String(to) });
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/query?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'query_metrics')) }], isError: false };
  }

  private async listMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    // q param acts as a prefix/substring filter on metric names
    if (args.q) params.set('q', args.q as string);
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/metrics?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_metrics')) }], isError: false };
  }

  private async listMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', args.name as string);
    if (args.tags) params.set('monitor_tags', args.tags as string);
    params.set('page', String((args.page as number) ?? 0));
    params.set('page_size', String((args.page_size as number) ?? 100));
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/monitor?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_monitors')) }], isError: false };
  }

  private async getMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const monitor_id = args.monitor_id as number;
    if (!monitor_id) throw new Error('monitor_id is required');
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/monitor/${monitor_id}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_monitor')) }], isError: false };
  }

  private async muteMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const monitor_id = args.monitor_id as number;
    if (!monitor_id) throw new Error('monitor_id is required');
    const body: Record<string, unknown> = {};
    if (args.end !== undefined) body.end = args.end;
    if (args.scope) body.scope = args.scope;
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/monitor/${monitor_id}/mute`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'mute_monitor')) }], isError: false };
  }

  private async unmuteMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const monitor_id = args.monitor_id as number;
    if (!monitor_id) throw new Error('monitor_id is required');
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/monitor/${monitor_id}/unmute`, {
      method: 'POST',
      headers: this.headers,
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'unmute_monitor')) }], isError: false };
  }

  private async searchLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) throw new Error('query is required');
    const now = Date.now();
    const body = {
      filter: {
        query,
        from: String(new Date((args.from as number) ?? now - 86_400_000).toISOString()),
        to: String(new Date((args.to as number) ?? now).toISOString()),
      },
      options: { timezone: 'UTC' },
      page: { limit: (args.limit as number) ?? 100 },
    };
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v2/logs/events/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'search_logs')) }], isError: false };
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter_shared !== undefined) params.set('filter[shared]', String(args.filter_shared));
    if (args.filter_deleted !== undefined) params.set('filter[deleted]', String(args.filter_deleted));
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.start !== undefined) params.set('start', String(args.start));
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/dashboard?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_dashboards')) }], isError: false };
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const dashboard_id = args.dashboard_id as string;
    if (!dashboard_id) throw new Error('dashboard_id is required');
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/dashboard/${encodeURIComponent(dashboard_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_dashboard')) }], isError: false };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));
    if (args.page_offset !== undefined) params.set('page[offset]', String(args.page_offset));
    if (args.include) params.set('include', args.include as string);
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v2/incidents?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_incidents')) }], isError: false };
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incident_id = args.incident_id as string;
    if (!incident_id) throw new Error('incident_id is required');
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v2/incidents/${encodeURIComponent(incident_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_incident')) }], isError: false };
  }

  private async listDowntimes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.current_only !== undefined) params.set('current_only', String(args.current_only));
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v2/downtime?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_downtimes')) }], isError: false };
  }

  private async listHosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    if (args.sort_field) params.set('sort_field', args.sort_field as string);
    if (args.sort_dir) params.set('sort_dir', args.sort_dir as string);
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.start !== undefined) params.set('start', String(args.start));
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/hosts?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_hosts')) }], isError: false };
  }

  private async getHostTotals(): Promise<ToolResult> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/hosts/totals`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_host_totals')) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start !== undefined) params.set('start', String(args.start));
    if (args.end !== undefined) params.set('end', String(args.end));
    if (args.priority) params.set('priority', args.priority as string);
    if (args.tags) params.set('tags', args.tags as string);
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/events?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_events')) }], isError: false };
  }

  private async queryEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) throw new Error('query is required');
    const now = Date.now();
    const body = {
      filter: {
        query,
        from: new Date((args.from as number) ?? now - 86_400_000).toISOString(),
        to: new Date((args.to as number) ?? now).toISOString(),
      },
      page: { limit: (args.limit as number) ?? 100 },
    };
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v2/events/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'query_events')) }], isError: false };
  }

  private async listSlos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.tags_query) params.set('tags_query', args.tags_query as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    const res = await this.fetchWithRetry(`${this.baseUrl}/api/v1/slo?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_slos')) }], isError: false };
  }

  private async getSloHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const slo_id = args.slo_id as string;
    const from_ts = args.from_ts as number;
    const to_ts = args.to_ts as number;
    if (!slo_id) throw new Error('slo_id is required');
    if (from_ts === undefined) throw new Error('from_ts is required');
    if (to_ts === undefined) throw new Error('to_ts is required');

    const params = new URLSearchParams({ from_ts: String(from_ts), to_ts: String(to_ts) });
    const res = await this.fetchWithRetry(
      `${this.baseUrl}/api/v1/slo/${encodeURIComponent(slo_id)}/history?${params}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_slo_history')) }], isError: false };
  }
}
