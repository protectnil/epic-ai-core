/**
 * Grafana API MCP Server
 * Grafana HTTP API — dashboards, datasources, and alert rules.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class GrafanaAPIMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    instance: string;
    serviceAccountToken: string;
  }) {
    this.baseUrl = `https://${config.instance}.grafana.net/api`;
    this.headers = {
      'Authorization': `Bearer ${config.serviceAccountToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_dashboards',
        description: 'List all dashboards in Grafana',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'number',
              description: 'Filter by folder ID (0 = General)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of dashboards to return (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get a dashboard by its UID',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Dashboard UID',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'list_datasources',
        description: 'List all datasources configured in Grafana',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_dashboards',
        description: 'Search for dashboards by query string, tag, or type',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string matched against dashboard title',
            },
            tag: {
              type: 'string',
              description: 'Filter dashboards by tag',
            },
            type: {
              type: 'string',
              description: 'Filter by type: "dash-db" (dashboard) or "dash-folder" (folder)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_alerts',
        description: 'List Grafana alert rules',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'number',
              description: 'Filter alerts by dashboard ID',
            },
            panel_id: {
              type: 'number',
              description: 'Filter alerts by panel ID',
            },
            state: {
              type: 'string',
              description: 'Filter by alert state: "alerting", "ok", "paused", "pending", "no_data"',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alert rules to return (default: 100)',
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
        case 'list_dashboards':
          return await this.listDashboards(
            args.folder_id as number | undefined,
            args.limit as number | undefined,
            args.page as number | undefined
          );
        case 'get_dashboard':
          return await this.getDashboard(args.uid as string);
        case 'list_datasources':
          return await this.listDatasources();
        case 'search_dashboards':
          return await this.searchDashboards(
            args.query as string | undefined,
            args.tag as string | undefined,
            args.type as string | undefined,
            args.limit as number | undefined
          );
        case 'list_alerts':
          return await this.listAlerts(
            args.dashboard_id as number | undefined,
            args.panel_id as number | undefined,
            args.state as string | undefined,
            args.limit as number | undefined
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

  private async listDashboards(
    folderId?: number,
    limit?: number,
    page?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('type', 'dash-db');
    if (folderId !== undefined) params.append('folderIds', String(folderId));
    params.append('limit', String(limit || 100));
    params.append('page', String(page || 1));

    const response = await fetch(
      `${this.baseUrl}/search?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Grafana returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getDashboard(uid: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/dashboards/uid/${uid}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Grafana returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDatasources(): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/datasources`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Grafana returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchDashboards(
    query?: string,
    tag?: string,
    type?: string,
    limit?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (tag) params.append('tag', tag);
    if (type) params.append('type', type);
    params.append('limit', String(limit || 100));

    const response = await fetch(
      `${this.baseUrl}/search?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Grafana returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAlerts(
    dashboardId?: number,
    panelId?: number,
    state?: string,
    limit?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (dashboardId !== undefined) params.append('dashboardId', String(dashboardId));
    if (panelId !== undefined) params.append('panelId', String(panelId));
    if (state) params.append('state', state);
    params.append('limit', String(limit || 100));

    const response = await fetch(
      `${this.baseUrl}/alerts?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Grafana returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
