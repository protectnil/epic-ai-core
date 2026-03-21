/**
 * @epicai/core — Sumo Logic MCP Server
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class SumoLogicMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    region: string;
    accessId: string;
    accessKey: string;
  }) {
    this.baseUrl = `https://api.${config.region}.sumologic.com/api`;
    const credentials = Buffer.from(
      `${config.accessId}:${config.accessKey}`
    ).toString('base64');
    this.headers = {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_search_job',
        description: 'Create a new search job in Sumo Logic',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Sumo Logic query string',
            },
            from: {
              type: 'number',
              description: 'Start time in milliseconds since epoch',
            },
            to: {
              type: 'number',
              description: 'End time in milliseconds since epoch',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for the search (default: "UTC")',
            },
          },
          required: ['query', 'from', 'to'],
        },
      },
      {
        name: 'get_search_results',
        description: 'Retrieve results from a search job',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: {
              type: 'string',
              description: 'The search job ID',
            },
            offset: {
              type: 'number',
              description: 'Result offset for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'list_monitors',
        description: 'List all monitors in Sumo Logic',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum monitors to return (default: 100)',
            },
            monitor_type: {
              type: 'string',
              description: 'Filter by monitor type',
            },
          },
        },
      },
      {
        name: 'get_collector_status',
        description: 'Get status of a log collector',
        inputSchema: {
          type: 'object',
          properties: {
            collector_id: {
              type: 'string',
              description: 'The collector ID',
            },
          },
          required: ['collector_id'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List all dashboards in Sumo Logic',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum dashboards to return (default: 100)',
            },
            folder_id: {
              type: 'string',
              description: 'Filter by folder ID',
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
        case 'create_search_job':
          return await this.createSearchJob(
            args.query as string,
            args.from as number,
            args.to as number,
            args.timezone as string | undefined
          );
        case 'get_search_results':
          return await this.getSearchResults(
            args.search_id as string,
            args.offset as number | undefined,
            args.limit as number | undefined
          );
        case 'list_monitors':
          return await this.listMonitors(
            args.offset as number | undefined,
            args.limit as number | undefined,
            args.monitor_type as string | undefined
          );
        case 'get_collector_status':
          return await this.getCollectorStatus(args.collector_id as string);
        case 'list_dashboards':
          return await this.listDashboards(
            args.offset as number | undefined,
            args.limit as number | undefined,
            args.folder_id as string | undefined
          );
        default:
          return {
            content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async createSearchJob(
    query: string,
    from: number,
    to: number,
    timezone?: string
  ): Promise<ToolResult> {
    const requestBody = {
      query,
      from,
      to,
      timezone: timezone || 'UTC',
    };

    const response = await fetch(
      `${this.baseUrl}/v1/search/jobs`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Sumo Logic API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getSearchResults(
    searchId: string,
    offset?: number,
    limit?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('offset', String(offset || 0));
    params.append('limit', String(limit || 100));

    const response = await fetch(
      `${this.baseUrl}/v1/search/jobs/${searchId}/messages?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Sumo Logic API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listMonitors(
    offset?: number,
    limit?: number,
    monitorType?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('offset', String(offset || 0));
    params.append('limit', String(limit || 100));

    if (monitorType) {
      params.append('monitorType', monitorType);
    }

    const response = await fetch(
      `${this.baseUrl}/v1/monitors?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Sumo Logic API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getCollectorStatus(
    collectorId: string
  ): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/v1/collectors/${collectorId}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Sumo Logic API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listDashboards(
    offset?: number,
    limit?: number,
    folderId?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('offset', String(offset || 0));
    params.append('limit', String(limit || 100));

    if (folderId) {
      params.append('parentId', folderId);
    }

    const response = await fetch(
      `${this.baseUrl}/v1/dashboards?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Sumo Logic API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
