/**
 * Datadog Observability MCP Server
 * Datadog API v1/v2 observability — metrics, monitors, logs, and dashboards.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class DatadogObservabilityMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    apiKey: string;
    applicationKey: string;
    site?: string;
  }) {
    this.baseUrl = `https://api.${config.site || 'datadoghq.com'}`;
    this.headers = {
      'DD-API-KEY': config.apiKey,
      'DD-APPLICATION-KEY': config.applicationKey,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_metrics',
        description: 'Query time-series metric data from Datadog',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Datadog metrics query (e.g., "avg:system.cpu.user{*}")',
            },
            from: {
              type: 'number',
              description: 'Start of the query window as Unix epoch seconds',
            },
            to: {
              type: 'number',
              description: 'End of the query window as Unix epoch seconds',
            },
          },
          required: ['query', 'from', 'to'],
        },
      },
      {
        name: 'list_monitors',
        description: 'List monitors configured in Datadog',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter monitors by name substring',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter by (e.g., "env:prod,team:sre")',
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
        description: 'Get full details for a specific Datadog monitor',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'number',
              description: 'The numeric monitor ID',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'search_logs',
        description: 'Search logs in Datadog using a query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Log query string (e.g., "service:api status:error")',
            },
            from: {
              type: 'number',
              description: 'Start timestamp in milliseconds (default: 24 h ago)',
            },
            to: {
              type: 'number',
              description: 'End timestamp in milliseconds (default: now)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of logs to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List dashboards available in Datadog',
        inputSchema: {
          type: 'object',
          properties: {
            filter_shared: {
              type: 'boolean',
              description: 'When true, only return shared dashboards',
            },
            filter_deleted: {
              type: 'boolean',
              description: 'When true, include soft-deleted dashboards',
            },
            count: {
              type: 'number',
              description: 'Number of dashboards to return per page (default: 100)',
            },
            start: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_metrics':
          return await this.queryMetrics(
            args.query as string,
            args.from as number,
            args.to as number
          );
        case 'list_monitors':
          return await this.listMonitors(
            args.name as string | undefined,
            args.tags as string | undefined,
            args.page as number | undefined,
            args.page_size as number | undefined
          );
        case 'get_monitor':
          return await this.getMonitor(args.monitor_id as number);
        case 'search_logs':
          return await this.searchLogs(
            args.query as string,
            args.from as number | undefined,
            args.to as number | undefined,
            args.limit as number | undefined
          );
        case 'list_dashboards':
          return await this.listDashboards(
            args.filter_shared as boolean | undefined,
            args.filter_deleted as boolean | undefined,
            args.count as number | undefined,
            args.start as number | undefined
          );
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async queryMetrics(
    query: string,
    from: number,
    to: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams({
      query,
      from: String(from),
      to: String(to),
    });

    const response = await fetch(
      `${this.baseUrl}/api/v1/query?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listMonitors(
    name?: string,
    tags?: string,
    page?: number,
    pageSize?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (tags) params.append('monitor_tags', tags);
    params.append('page', String(page || 0));
    params.append('page_size', String(pageSize || 100));

    const response = await fetch(
      `${this.baseUrl}/api/v1/monitor?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getMonitor(monitorId: number): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/monitor/${monitorId}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchLogs(
    query: string,
    from?: number,
    to?: number,
    limit?: number
  ): Promise<ToolResult> {
    const now = Date.now();
    const body = {
      filter: {
        query,
        from: from || now - 24 * 60 * 60 * 1000,
        to: to || now,
      },
      options: { timezone: 'UTC' },
      page: { limit: limit || 100 },
    };

    const response = await fetch(
      `${this.baseUrl}/api/v2/logs/events/search`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDashboards(
    filterShared?: boolean,
    filterDeleted?: boolean,
    count?: number,
    start?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (filterShared !== undefined) params.append('filter[shared]', String(filterShared));
    if (filterDeleted !== undefined) params.append('filter[deleted]', String(filterDeleted));
    params.append('count', String(count || 100));
    if (start !== undefined) params.append('start', String(start));

    const response = await fetch(
      `${this.baseUrl}/api/v1/dashboard?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
