/**
 * @epicai/core — Microsoft Sentinel MCP Server
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

export class SentinelMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    subscriptionId: string;
    resourceGroup: string;
    workspaceName: string;
    bearerToken: string;
  }) {
    if (!UUID_RE.test(config.subscriptionId)) {
      throw new Error('SentinelMCPServer: subscriptionId must be a valid UUID');
    }
    if (!SAFE_NAME_RE.test(config.resourceGroup)) {
      throw new Error('SentinelMCPServer: resourceGroup contains invalid characters');
    }
    if (!SAFE_NAME_RE.test(config.workspaceName)) {
      throw new Error('SentinelMCPServer: workspaceName contains invalid characters');
    }

    this.baseUrl =
      `https://management.azure.com/subscriptions/${config.subscriptionId}/` +
      `resourceGroups/${config.resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${config.workspaceName}`;

    this.headers = {
      Authorization: `Bearer ${config.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  private withApiVersion(url: string): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}api-version=2022-07-01-preview`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List incidents in Microsoft Sentinel',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: "OData filter expression (e.g., \"properties/status eq 'New'\")",
            },
            orderby: {
              type: 'string',
              description: 'Sort field (e.g., "properties/createdTimeUtc desc")',
            },
            top: {
              type: 'number',
              description: 'Maximum incidents to return',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Get details of a specific incident',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List alerts in Microsoft Sentinel',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression',
            },
            top: {
              type: 'number',
              description: 'Maximum alerts to return',
            },
          },
        },
      },
      {
        name: 'run_hunting_query',
        description: 'Execute a KQL hunting query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'KQL (Kusto Query Language) query string',
            },
            timespan: {
              type: 'string',
              description: 'Timespan (e.g., "PT24H" for 24 hours)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_watchlists',
        description: 'List watchlists in Microsoft Sentinel',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter watchlists by name',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents':
          return await this.listIncidents(
            args.filter as string | undefined,
            args.orderby as string | undefined,
            args.top as number | undefined
          );
        case 'get_incident':
          return await this.getIncident(args.incident_id as string);
        case 'list_alerts':
          return await this.listAlerts(
            args.filter as string | undefined,
            args.top as number | undefined
          );
        case 'run_hunting_query':
          return await this.runHuntingQuery(
            args.query as string,
            args.timespan as string | undefined
          );
        case 'list_watchlists':
          return await this.listWatchlists(args.filter as string | undefined);
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

  private async listIncidents(filter?: string, orderby?: string, top?: number): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (filter) params.append('$filter', escapeOData(filter));
    if (orderby) params.append('$orderby', orderby);
    if (top) params.append('$top', String(top));

    const baseEndpoint = `${this.baseUrl}/providers/Microsoft.SecurityInsights/incidents?${params}`;
    const response = await fetch(this.withApiVersion(baseEndpoint), { method: 'GET', headers: this.headers });

    if (!response.ok) throw new Error(`Sentinel API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getIncident(incidentId: string): Promise<ToolResult> {
    const response = await fetch(
      this.withApiVersion(`${this.baseUrl}/providers/Microsoft.SecurityInsights/incidents/${encodeURIComponent(incidentId)}`),
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) throw new Error(`Sentinel API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAlerts(filter?: string, top?: number): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (filter) params.append('$filter', escapeOData(filter));
    if (top) params.append('$top', String(top));

    const baseEndpoint = `${this.baseUrl}/providers/Microsoft.SecurityInsights/alertRules?${params}`;
    const response = await fetch(this.withApiVersion(baseEndpoint), { method: 'GET', headers: this.headers });

    if (!response.ok) throw new Error(`Sentinel API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async runHuntingQuery(query: string, timespan?: string): Promise<ToolResult> {
    const requestBody = { query, timespan: timespan || 'PT24H' };

    const response = await fetch(
      this.withApiVersion(`${this.baseUrl}/api/query`),
      { method: 'POST', headers: this.headers, body: JSON.stringify(requestBody) }
    );

    if (!response.ok) throw new Error(`Sentinel API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listWatchlists(filter?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (filter) {
      params.append('$filter', `contains(name,'${escapeOData(filter)}')`);
    }

    const baseEndpoint = `${this.baseUrl}/providers/Microsoft.SecurityInsights/watchlists?${params}`;
    const response = await fetch(this.withApiVersion(baseEndpoint), { method: 'GET', headers: this.headers });

    if (!response.ok) throw new Error(`Sentinel API error: ${response.status} ${response.statusText}`);

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
