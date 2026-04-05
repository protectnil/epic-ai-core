/**
 * Prometheus MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Prometheus project MCP server exists.
//   Community implementation exists (https://github.com/pab1it0/prometheus-mcp-server, MIT,
//   v1.6.0 released 2026-03-07, 6 tools: execute_query, execute_range_query, list_metrics,
//   get_metric_metadata, get_targets, health_check) but is NOT published by the Prometheus project.
//   Fails criteria: not official. Decision: use-rest-api.
// Our adapter covers: 16 tools. Community MCP covers: 6 tools (strict subset of our coverage).
// Recommendation: use-rest-api — this adapter provides significantly richer coverage.
//
// Base URL: http://{host}:9090/api/v1 (configurable — no fixed SaaS URL, self-hosted)
// Auth: Optional Bearer token or Basic auth depending on deployment; many instances use no auth.
//   Pass bearerToken or username/password in config as appropriate.
// Docs: https://prometheus.io/docs/prometheus/latest/querying/api/
//       https://prometheus.io/docs/prometheus/latest/management_api/
// Rate limits: No formal rate limiting; governed by server capacity and query timeout settings

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PrometheusConfig {
  /** Prometheus server host (e.g. "localhost" or "prometheus.internal"). Port defaults to 9090. */
  host: string;
  /** Override the full base URL. When set, host is ignored. */
  baseUrl?: string;
  /** Optional Bearer token for authenticated Prometheus instances. */
  bearerToken?: string;
  /** Optional Basic auth username. */
  username?: string;
  /** Optional Basic auth password. */
  password?: string;
}

export class PrometheusMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly bearerToken: string | undefined;
  private readonly username: string | undefined;
  private readonly password: string | undefined;

  constructor(config: PrometheusConfig) {
    super();
    this.baseUrl = config.baseUrl
      ? config.baseUrl.replace(/\/$/, '')
      : `http://${config.host}:9090/api/v1`;
    this.bearerToken = config.bearerToken;
    this.username = config.username;
    this.password = config.password;
  }

  static catalog() {
    return {
      name: 'prometheus',
      displayName: 'Prometheus',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['prometheus', 'metrics', 'promql', 'monitoring', 'alerting', 'time-series', 'tsdb', 'scrape', 'target', 'query', 'series', 'label'],
      toolNames: [
        'query', 'query_range', 'query_exemplars',
        'list_series', 'list_label_names', 'list_label_values',
        'get_metric_metadata',
        'list_targets', 'list_target_metadata',
        'list_alerts', 'list_rules',
        'get_status_config', 'get_status_flags', 'get_status_runtimeinfo', 'get_status_buildinfo', 'get_tsdb_stats',
      ],
      description: 'Query Prometheus metrics via PromQL instant and range queries, explore series and labels, inspect scrape targets, and retrieve alerts and recording rules.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query',
        description: 'Execute an instant PromQL query at a single point in time and return the current metric values',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'PromQL expression to evaluate (e.g. up, rate(http_requests_total[5m]))',
            },
            time: {
              type: 'string',
              description: 'Evaluation timestamp (Unix seconds or RFC3339, defaults to current time)',
            },
            timeout: {
              type: 'string',
              description: 'Evaluation timeout (e.g. 30s, 1m — defaults to server-configured timeout)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'query_range',
        description: 'Execute a PromQL query over a time range and return a matrix of samples at each step interval',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'PromQL expression to evaluate',
            },
            start: {
              type: 'string',
              description: 'Start of range as Unix seconds or RFC3339 (e.g. 2026-03-24T00:00:00Z)',
            },
            end: {
              type: 'string',
              description: 'End of range as Unix seconds or RFC3339',
            },
            step: {
              type: 'string',
              description: 'Query resolution step width (e.g. 15s, 1m, 5m)',
            },
            timeout: {
              type: 'string',
              description: 'Evaluation timeout (e.g. 30s)',
            },
          },
          required: ['query', 'start', 'end', 'step'],
        },
      },
      {
        name: 'query_exemplars',
        description: 'Return exemplars (trace-linked sample points) for a PromQL query within a specific time range',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'PromQL expression to return exemplars for',
            },
            start: {
              type: 'string',
              description: 'Start of time range as Unix seconds or RFC3339',
            },
            end: {
              type: 'string',
              description: 'End of time range as Unix seconds or RFC3339',
            },
          },
          required: ['query', 'start', 'end'],
        },
      },
      {
        name: 'list_series',
        description: 'List time series matching one or more label selectors within an optional time range',
        inputSchema: {
          type: 'object',
          properties: {
            match: {
              type: 'array',
              items: { type: 'string' },
              description: 'One or more series selectors (e.g. [\'up\', \'http_requests_total{job="api"}\'])',
            },
            start: {
              type: 'string',
              description: 'Start of time range (Unix seconds or RFC3339)',
            },
            end: {
              type: 'string',
              description: 'End of time range (Unix seconds or RFC3339)',
            },
          },
          required: ['match'],
        },
      },
      {
        name: 'list_label_names',
        description: 'List all label names present in the TSDB, optionally restricted by series selector and time range',
        inputSchema: {
          type: 'object',
          properties: {
            match: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional series selectors to restrict which series are searched',
            },
            start: {
              type: 'string',
              description: 'Start of time range (Unix seconds or RFC3339)',
            },
            end: {
              type: 'string',
              description: 'End of time range (Unix seconds or RFC3339)',
            },
          },
        },
      },
      {
        name: 'list_label_values',
        description: 'List all values for a specific label name, optionally filtered by series selector and time range',
        inputSchema: {
          type: 'object',
          properties: {
            labelName: {
              type: 'string',
              description: 'The label name whose values to retrieve (e.g. job, instance, __name__)',
            },
            match: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional series selectors to restrict which series are searched',
            },
            start: {
              type: 'string',
              description: 'Start of time range (Unix seconds or RFC3339)',
            },
            end: {
              type: 'string',
              description: 'End of time range (Unix seconds or RFC3339)',
            },
          },
          required: ['labelName'],
        },
      },
      {
        name: 'get_metric_metadata',
        description: 'Return metadata (type, help text, unit) for one or all metrics tracked by Prometheus',
        inputSchema: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              description: 'Metric name to filter metadata for (optional — omit to retrieve all metric metadata)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of metrics to return (optional)',
            },
          },
        },
      },
      {
        name: 'list_targets',
        description: 'Return current scrape target state for all Prometheus targets: health, labels, and last scrape info',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Filter targets by state: active, dropped, any (default: any)',
            },
          },
        },
      },
      {
        name: 'list_target_metadata',
        description: 'List metric metadata reported by scrape targets, optionally filtered by metric name or target',
        inputSchema: {
          type: 'object',
          properties: {
            matchTarget: {
              type: 'string',
              description: 'Label selector to match a specific target (e.g. {job="prometheus"})',
            },
            metric: {
              type: 'string',
              description: 'Metric name to filter metadata for (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of metadata entries to return (optional)',
            },
          },
        },
      },
      {
        name: 'list_alerts',
        description: 'List all active Prometheus alerting rules that are currently firing',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_rules',
        description: 'List all Prometheus alerting and recording rules loaded from rule files, with their current evaluation state',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by rule type: alert, record (optional — omit to list all rule types)',
            },
          },
        },
      },
      {
        name: 'get_status_config',
        description: 'Return the currently loaded Prometheus configuration (prometheus.yml) as a YAML string',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_status_flags',
        description: 'Return the command-line flags that the Prometheus server was started with',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_status_runtimeinfo',
        description: 'Return Prometheus runtime information: uptime, storage path, active queries, and server state',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_status_buildinfo',
        description: 'Return Prometheus build information: version, branch, revision, and Go version',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_tsdb_stats',
        description: 'Return TSDB (time series database) statistics: head cardinality, top series by label, and storage stats',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of series in top-N statistics lists (default: 10)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query':
          return await this.instantQuery(args);
        case 'query_range':
          return await this.rangeQuery(args);
        case 'query_exemplars':
          return await this.queryExemplars(args);
        case 'list_series':
          return await this.listSeries(args);
        case 'list_label_names':
          return await this.listLabelNames(args);
        case 'list_label_values':
          return await this.listLabelValues(args);
        case 'get_metric_metadata':
          return await this.getMetricMetadata(args);
        case 'list_targets':
          return await this.listTargets(args);
        case 'list_target_metadata':
          return await this.listTargetMetadata(args);
        case 'list_alerts':
          return await this.listAlerts();
        case 'list_rules':
          return await this.listRules(args);
        case 'get_status_config':
          return await this.getStatusConfig();
        case 'get_status_flags':
          return await this.getStatusFlags();
        case 'get_status_runtimeinfo':
          return await this.getStatusRuntimeinfo();
        case 'get_status_buildinfo':
          return await this.getStatusBuildinfo();
        case 'get_tsdb_stats':
          return await this.getTsdbStats(args);
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

  private get reqHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.username && this.password) {
      headers['Authorization'] = `Basic ${btoa(`${this.username}:${this.password}`)}`;
    }
    return headers;
  }

  private async doFetch(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.reqHeaders });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Prometheus API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Prometheus returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async instantQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params = new URLSearchParams({ query: String(args.query) });
    if (args.time) params.set('time', String(args.time));
    if (args.timeout) params.set('timeout', String(args.timeout));
    return this.doFetch(`${this.baseUrl}/query?${params.toString()}`);
  }

  private async rangeQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query || !args.start || !args.end || !args.step) {
      return { content: [{ type: 'text', text: 'query, start, end, and step are required' }], isError: true };
    }
    const params = new URLSearchParams({
      query: String(args.query),
      start: String(args.start),
      end: String(args.end),
      step: String(args.step),
    });
    if (args.timeout) params.set('timeout', String(args.timeout));
    return this.doFetch(`${this.baseUrl}/query_range?${params.toString()}`);
  }

  private async queryExemplars(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'query, start, and end are required' }], isError: true };
    }
    const params = new URLSearchParams({
      query: String(args.query),
      start: String(args.start),
      end: String(args.end),
    });
    return this.doFetch(`${this.baseUrl}/query_exemplars?${params.toString()}`);
  }

  private async listSeries(args: Record<string, unknown>): Promise<ToolResult> {
    const matchSelectors = args.match as string[] | undefined;
    if (!matchSelectors?.length) return { content: [{ type: 'text', text: 'match (array) is required' }], isError: true };
    const params = new URLSearchParams();
    for (const m of matchSelectors) params.append('match[]', m);
    if (args.start) params.set('start', String(args.start));
    if (args.end) params.set('end', String(args.end));
    return this.doFetch(`${this.baseUrl}/series?${params.toString()}`);
  }

  private async listLabelNames(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (Array.isArray(args.match)) {
      for (const m of args.match as string[]) params.append('match[]', m);
    }
    if (args.start) params.set('start', String(args.start));
    if (args.end) params.set('end', String(args.end));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/labels${qs}`);
  }

  private async listLabelValues(args: Record<string, unknown>): Promise<ToolResult> {
    const labelName = args.labelName as string;
    if (!labelName) return { content: [{ type: 'text', text: 'labelName is required' }], isError: true };
    const params = new URLSearchParams();
    if (Array.isArray(args.match)) {
      for (const m of args.match as string[]) params.append('match[]', m);
    }
    if (args.start) params.set('start', String(args.start));
    if (args.end) params.set('end', String(args.end));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/label/${encodeURIComponent(labelName)}/values${qs}`);
  }

  private async getMetricMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.metric) params.set('metric', String(args.metric));
    if (args.limit) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/metadata${qs}`);
  }

  private async listTargets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.state) params.set('state', String(args.state));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/targets${qs}`);
  }

  private async listTargetMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.matchTarget) params.set('match_target', String(args.matchTarget));
    if (args.metric) params.set('metric', String(args.metric));
    if (args.limit) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/targets/metadata${qs}`);
  }

  private async listAlerts(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/alerts`);
  }

  private async listRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', String(args.type));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/rules${qs}`);
  }

  private async getStatusConfig(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/status/config`);
  }

  private async getStatusFlags(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/status/flags`);
  }

  private async getStatusRuntimeinfo(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/status/runtimeinfo`);
  }

  private async getStatusBuildinfo(): Promise<ToolResult> {
    return this.doFetch(`${this.baseUrl}/status/buildinfo`);
  }

  private async getTsdbStats(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.doFetch(`${this.baseUrl}/status/tsdb${qs}`);
  }
}
