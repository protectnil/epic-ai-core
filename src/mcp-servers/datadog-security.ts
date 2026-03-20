import { ToolDefinition, ToolResult } from './types.js';

export class DatadogSecurityMCPServer {
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
        name: 'list_security_signals',
        description: 'List security signals from Datadog',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression (e.g., "status:high severity:critical")',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
            sort: {
              type: 'string',
              description: 'Sort order (default: "-timestamp")',
            },
          },
        },
      },
      {
        name: 'get_signal',
        description: 'Get details of a specific security signal',
        inputSchema: {
          type: 'object',
          properties: {
            signal_id: {
              type: 'string',
              description: 'The security signal ID',
            },
          },
          required: ['signal_id'],
        },
      },
      {
        name: 'search_logs',
        description: 'Search logs in Datadog with query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Log query string (e.g., "@severity:ERROR @service:api")',
            },
            from: {
              type: 'number',
              description: 'Start timestamp in milliseconds',
            },
            to: {
              type: 'number',
              description: 'End timestamp in milliseconds',
            },
            limit: {
              type: 'number',
              description: 'Maximum logs to return (default: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_monitors',
        description: 'List security monitors configured in Datadog',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_type: {
              type: 'string',
              description: 'Filter by monitor type (e.g., "security")',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
            },
          },
        },
      },
      {
        name: 'get_cloud_security_findings',
        description: 'Retrieve cloud security findings and compliance issues',
        inputSchema: {
          type: 'object',
          properties: {
            resource_type: {
              type: 'string',
              description: 'Filter by resource type (e.g., "aws", "azure", "gcp")',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (open, resolved)',
            },
            limit: {
              type: 'number',
              description: 'Maximum findings to return',
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
        case 'list_security_signals':
          return await this.listSecuritySignals(
            args.filter as string | undefined,
            args.page as number | undefined,
            args.page_size as number | undefined,
            args.sort as string | undefined
          );
        case 'get_signal':
          return await this.getSignal(args.signal_id as string);
        case 'search_logs':
          return await this.searchLogs(
            args.query as string,
            args.from as number | undefined,
            args.to as number | undefined,
            args.limit as number | undefined
          );
        case 'list_monitors':
          return await this.listMonitors(
            args.monitor_type as string | undefined,
            args.page as number | undefined
          );
        case 'get_cloud_security_findings':
          return await this.getCloudSecurityFindings(
            args.resource_type as string | undefined,
            args.severity as string | undefined,
            args.status as string | undefined,
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
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : String(error)) }],
        isError: true,
      };
    }
  }

  private async listSecuritySignals(
    filter?: string,
    page?: number,
    pageSize?: number,
    sort?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    if (filter) {
      params.append('filter', filter);
    }
    params.append('page', String(page || 0));
    params.append('page_size', String(pageSize || 50));
    params.append('sort', sort || '-timestamp');

    const response = await fetch(
      `${this.baseUrl}/api/v2/security_monitoring/signals?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSignal(signalId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v2/security_monitoring/signals/${signalId}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    // Finding #19
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
    const requestBody = {
      filter: {
        from: from || now - 24 * 60 * 60 * 1000,
        to: to || now,
        query,
      },
      options: {
        timezone: 'UTC',
      },
      page: {
        limit: limit || 100,
      },
    };

    const response = await fetch(
      `${this.baseUrl}/api/v2/logs/events/search`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listMonitors(
    monitorType?: string,
    page?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    if (monitorType) {
      params.append('type', monitorType);
    }
    params.append('page', String(page || 0));

    const response = await fetch(
      `${this.baseUrl}/api/v1/monitor?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getCloudSecurityFindings(
    resourceType?: string,
    severity?: string,
    status?: string,
    limit?: number
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    if (resourceType) {
      params.append('resource_type', resourceType);
    }
    if (severity) {
      params.append('severity', severity);
    }
    if (status) {
      params.append('status', status);
    }
    params.append('limit', String(limit || 100));

    const response = await fetch(
      `${this.baseUrl}/api/v2/security_monitoring/findings?${params}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Datadog API error: ${response.status} ${response.statusText}`
      );
    }

    // Finding #19
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Datadog returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
