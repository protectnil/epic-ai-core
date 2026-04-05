/**
 * Datadog RUM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/datadog-labs/mcp-server — transport: streamable-HTTP, auth: DD-API-KEY + DD-APPLICATION-KEY
// Our adapter covers: 10 tools (RUM-focused: applications, events, aggregations, metrics).
// Vendor MCP covers: 16+ core tools (logs, metrics, traces, dashboards, monitors, incidents, hosts) — ZERO RUM-specific tools.
// Recommendation: use-rest-api — vendor MCP has no RUM application, RUM events, or RUM metrics tools.
//   This adapter is the only integration layer for Datadog RUM operations.
//
// Base URL: https://api.datadoghq.com (US1 — default). Regional variants:
//   US3: https://api.us3.datadoghq.com
//   US5: https://api.us5.datadoghq.com
//   EU:  https://api.datadoghq.eu
//   AP1: https://api.ap1.datadoghq.com
//   GOV: https://api.ddog-gov.com
// Auth: DD-API-KEY header (required for all endpoints) + DD-APPLICATION-KEY header (required for write/management)
// Docs: https://docs.datadoghq.com/api/latest/rum/
// Rate limits: 300 requests/hour per API key for most v2 endpoints (varies by endpoint and plan).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DatadogRUMConfig {
  apiKey: string;
  appKey?: string;    // Required for create/update/delete operations
  baseUrl?: string;
}

export class DatadogRUMMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly appKey: string;
  private readonly baseUrl: string;

  constructor(config: DatadogRUMConfig) {
    super();
    this.apiKey = config.apiKey;
    this.appKey = config.appKey || '';
    this.baseUrl = config.baseUrl || 'https://api.datadoghq.com';
  }

  static catalog() {
    return {
      name: 'datadog-rum',
      displayName: 'Datadog RUM',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'datadog', 'rum', 'real user monitoring', 'session replay', 'frontend monitoring',
        'page load', 'web vitals', 'core web vitals', 'lcp', 'cls', 'fid', 'error tracking',
        'user session', 'browser monitoring', 'mobile monitoring', 'performance',
      ],
      toolNames: [
        'list_rum_applications', 'get_rum_application', 'create_rum_application',
        'update_rum_application', 'delete_rum_application',
        'search_rum_events', 'list_rum_events',
        'aggregate_rum_events',
        'list_rum_metrics', 'create_rum_metric',
      ],
      description: 'Datadog Real User Monitoring: manage RUM applications, search and aggregate browser/mobile session events, and configure custom RUM metrics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_rum_applications',
        description: 'List all RUM applications configured in the Datadog organization with application IDs and client tokens',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_rum_application',
        description: 'Retrieve configuration details for a specific Datadog RUM application by application ID',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'RUM application ID (UUID format)',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'create_rum_application',
        description: 'Create a new Datadog RUM application for browser or mobile monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name of the RUM application',
            },
            type: {
              type: 'string',
              description: 'Application type: browser, ios, android, react-native, flutter, roku (default: browser)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_rum_application',
        description: 'Update the name or type of an existing Datadog RUM application',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'RUM application ID to update (UUID format)',
            },
            name: {
              type: 'string',
              description: 'New display name for the RUM application',
            },
            type: {
              type: 'string',
              description: 'Updated application type: browser, ios, android, react-native, flutter, roku',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'delete_rum_application',
        description: 'Delete a Datadog RUM application by ID — this is permanent and cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'RUM application ID to delete (UUID format)',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'search_rum_events',
        description: 'Search RUM events using a Datadog query string with time range and pagination — returns sessions, views, actions, errors, and resources',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Datadog RUM search query (e.g. "@type:error @error.source:source", "service:my-app @view.url_path:/checkout") — default: * (all events)',
            },
            from: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format or relative (e.g. "now-1h", "2026-03-01T00:00:00Z")',
            },
            to: {
              type: 'string',
              description: 'End of time range in ISO 8601 format or relative (e.g. "now", "2026-03-24T23:59:59Z")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25, max: 1000)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: timestamp (oldest first) or -timestamp (newest first — default)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (page[cursor] field)',
            },
          },
        },
      },
      {
        name: 'list_rum_events',
        description: 'List RUM events for a time range using simple GET pagination — suitable for streaming large result sets',
        inputSchema: {
          type: 'object',
          properties: {
            filter_query: {
              type: 'string',
              description: 'Datadog RUM filter query string (e.g. "@type:action @action.name:click")',
            },
            filter_from: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format (default: now-1h)',
            },
            filter_to: {
              type: 'string',
              description: 'End of time range in ISO 8601 format (default: now)',
            },
            page_limit: {
              type: 'number',
              description: 'Number of events per page (default: 25, max: 1000)',
            },
            page_cursor: {
              type: 'string',
              description: 'Cursor for the next page from a previous response',
            },
            sort: {
              type: 'string',
              description: 'Sort by timestamp: timestamp (oldest first) or -timestamp (newest first)',
            },
          },
        },
      },
      {
        name: 'aggregate_rum_events',
        description: 'Aggregate RUM events into computed metrics, counts, or timeseries — supports group by, filter, and multi-dimensional aggregations',
        inputSchema: {
          type: 'object',
          properties: {
            filter_query: {
              type: 'string',
              description: 'Datadog RUM query to filter events before aggregation (e.g. "@type:error service:checkout")',
            },
            filter_from: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format (default: now-1h)',
            },
            filter_to: {
              type: 'string',
              description: 'End of time range in ISO 8601 format (default: now)',
            },
            group_by_facet: {
              type: 'string',
              description: 'Facet to group results by (e.g. "@view.url_path", "@browser.name", "service", "@error.type")',
            },
            group_by_limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 10, max: 1000)',
            },
            compute_metric: {
              type: 'string',
              description: 'Metric to compute: count, cardinality, sum, avg, min, max, pc50, pc75, pc90, pc95, pc99 (default: count)',
            },
            compute_facet: {
              type: 'string',
              description: 'Facet to compute the metric on (required for sum/avg/min/max/percentile — e.g. "@view.loading_time")',
            },
          },
        },
      },
      {
        name: 'list_rum_metrics',
        description: 'List all custom RUM-based metrics configured in the Datadog organization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_rum_metric',
        description: 'Create a custom Datadog RUM metric to count or measure specific user interactions over time',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Metric name (must match pattern: rum.{metric_name} — e.g. rum.checkout_errors)',
            },
            event_type: {
              type: 'string',
              description: 'RUM event type to base the metric on: session, view, action, error, resource, long_task',
            },
            filter_query: {
              type: 'string',
              description: 'Filter query to select specific events (e.g. "@action.name:add_to_cart" — default: * for all events of the type)',
            },
            group_by_facet: {
              type: 'string',
              description: 'Optional facet to slice the metric by (e.g. "service", "@view.url_path", "@browser.name")',
            },
            compute_facet: {
              type: 'string',
              description: 'Optional facet to compute a distribution on (e.g. "@view.loading_time" for p50/p75/p90/p99)',
            },
          },
          required: ['name', 'event_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_rum_applications':
          return this.listRumApplications();
        case 'get_rum_application':
          return this.getRumApplication(args);
        case 'create_rum_application':
          return this.createRumApplication(args);
        case 'update_rum_application':
          return this.updateRumApplication(args);
        case 'delete_rum_application':
          return this.deleteRumApplication(args);
        case 'search_rum_events':
          return this.searchRumEvents(args);
        case 'list_rum_events':
          return this.listRumEvents(args);
        case 'aggregate_rum_events':
          return this.aggregateRumEvents(args);
        case 'list_rum_metrics':
          return this.listRumMetrics();
        case 'create_rum_metric':
          return this.createRumMetric(args);
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

  private get readHeaders(): Record<string, string> {
    return {
      'DD-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private get writeHeaders(): Record<string, string> {
    return {
      'DD-API-KEY': this.apiKey,
      'DD-APPLICATION-KEY': this.appKey,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params?: Record<string, string>, requiresAppKey = false): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const headers = requiresAppKey ? this.writeHeaders : this.readHeaders;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>, requiresAppKey = true): Promise<ToolResult> {
    const headers = requiresAppKey ? this.writeHeaders : this.readHeaders;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.writeHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.writeHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // DELETE responses are often 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"deleted": true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRumApplications(): Promise<ToolResult> {
    return this.apiGet('/api/v2/rum/applications');
  }

  private async getRumApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.apiGet(`/api/v2/rum/applications/${encodeURIComponent(args.app_id as string)}`);
  }

  private async createRumApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body = {
      data: {
        attributes: {
          name: args.name as string,
          type: (args.type as string) || 'browser',
        },
        type: 'rum_application_create',
      },
    };
    return this.apiPost('/api/v2/rum/applications', body);
  }

  private async updateRumApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const attributes: Record<string, unknown> = {};
    if (args.name) attributes.name = args.name;
    if (args.type) attributes.type = args.type;
    const body = {
      data: {
        id: args.app_id,
        attributes,
        type: 'rum_application_update',
      },
    };
    return this.apiPatch(`/api/v2/rum/applications/${encodeURIComponent(args.app_id as string)}`, body);
  }

  private async deleteRumApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    return this.apiDelete(`/api/v2/rum/applications/${encodeURIComponent(args.app_id as string)}`);
  }

  private async searchRumEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      filter: {
        query: (args.query as string) || '*',
        from: (args.from as string) || 'now-1h',
        to: (args.to as string) || 'now',
      },
      sort: (args.sort as string) || '-timestamp',
      page: {
        limit: (args.limit as number) ?? 25,
      },
    };
    if (args.cursor) (body.page as Record<string, unknown>).cursor = args.cursor;
    // search_rum_events uses POST but only needs API key (read-only)
    return this.apiPost('/api/v2/rum/events/search', body, false);
  }

  private async listRumEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'filter[query]': (args.filter_query as string) || '*',
      'filter[from]': (args.filter_from as string) || 'now-1h',
      'filter[to]': (args.filter_to as string) || 'now',
      'page[limit]': String((args.page_limit as number) ?? 25),
    };
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/api/v2/rum/events', params);
  }

  private async aggregateRumEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const compute: Record<string, unknown>[] = [{
      aggregation: (args.compute_metric as string) || 'count',
    }];
    if (args.compute_facet) (compute[0] as Record<string, unknown>).metric = args.compute_facet;

    const body: Record<string, unknown> = {
      compute,
      filter: {
        query: (args.filter_query as string) || '*',
        from: (args.filter_from as string) || 'now-1h',
        to: (args.filter_to as string) || 'now',
      },
    };

    if (args.group_by_facet) {
      body.group_by = [{
        facet: args.group_by_facet,
        limit: (args.group_by_limit as number) ?? 10,
        sort: { aggregation: 'count', order: 'desc' },
      }];
    }

    return this.apiPost('/api/v2/rum/analytics/aggregate', body, false);
  }

  private async listRumMetrics(): Promise<ToolResult> {
    return this.apiGet('/api/v2/rum/config/metrics');
  }

  private async createRumMetric(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.event_type) {
      return { content: [{ type: 'text', text: 'name and event_type are required' }], isError: true };
    }
    const attributes: Record<string, unknown> = {
      event_type: args.event_type,
      filter: { query: (args.filter_query as string) || '*' },
    };
    if (args.group_by_facet) {
      attributes.group_by = [{ path: args.group_by_facet }];
    }
    if (args.compute_facet) {
      attributes.compute = {
        aggregation_type: 'distribution',
        include_percentiles: true,
        path: args.compute_facet,
      };
    } else {
      attributes.compute = { aggregation_type: 'count' };
    }
    const body = {
      data: {
        id: args.name,
        type: 'rum_metric',
        attributes,
      },
    };
    return this.apiPost('/api/v2/rum/config/metrics', body);
  }
}
