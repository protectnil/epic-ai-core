import { ToolDefinition, ToolResult } from './types.js';

export class CiscoSecureMCPServer {
  private readonly baseUrl: string;
  private readonly firewallUsername: string | null;
  private readonly firewallPassword: string | null;
  private readonly umbrellaApiKey: string | null;
  private readonly firewallToken: string | null;

  constructor(config: {
    baseUrl: string;
    firewallUsername?: string;
    firewallPassword?: string;
    umbrellaApiKey?: string;
    firewallToken?: string;
  }) {
    // Finding #12: Validate that at least one credential set is present at construction time
    const hasToken = !!config.firewallToken;
    const hasUserPass = !!(config.firewallUsername && config.firewallPassword);
    if (!hasToken && !hasUserPass) {
      throw new Error(
        'CiscoSecureMCPServer: either firewallToken or both firewallUsername and firewallPassword must be provided'
      );
    }

    this.baseUrl = config.baseUrl;
    this.firewallUsername = config.firewallUsername || null;
    this.firewallPassword = config.firewallPassword || null;
    this.umbrellaApiKey = config.umbrellaApiKey || null;
    this.firewallToken = config.firewallToken || null;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List detected threats and malware events',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of threats to return',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            filter: {
              type: 'string',
              description: 'Filter threats by type or severity',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get details for a specific security event',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'The event ID to retrieve',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'list_access_policies',
        description: 'List access control policies',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return',
            },
          },
        },
      },
      {
        name: 'query_umbrella_dns',
        description: 'Query Umbrella DNS security logs',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Start time (RFC3339 format)',
            },
            end_time: {
              type: 'string',
              description: 'End time (RFC3339 format)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
          },
        },
      },
      {
        name: 'get_amp_events',
        description: 'Get AMP (Advanced Malware Protection) events',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of events to return',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            event_type: {
              type: 'string',
              description: 'Filter by event type (e.g., "malware", "compromise")',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats':
          return await this.listThreats(args);
        case 'get_event':
          return await this.getEvent(args);
        case 'list_access_policies':
          return await this.listAccessPolicies(args);
        case 'query_umbrella_dns':
          return await this.queryUmbrellaDns(args);
        case 'get_amp_events':
          return await this.getAmpEvents(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(error instanceof Error ? error.message : 'Unknown error') }],
        isError: true,
      };
    }
  }

  private getTokenHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.firewallToken) {
      headers['X-auth-token'] = this.firewallToken;
    } else if (this.firewallUsername && this.firewallPassword) {
      const credentials = Buffer.from(`${this.firewallUsername}:${this.firewallPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  private getUmbrellaHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.umbrellaApiKey) {
      headers['Authorization'] = `Bearer ${this.umbrellaApiKey}`;
    }

    return headers;
  }

  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const filter = args.filter as string | undefined;

    let url = `${this.baseUrl}/api/v1/security/events?limit=${limit}&offset=${offset}`;

    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getTokenHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Cisco Secure API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco Secure returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const eventId = args.event_id as string;

    const url = `${this.baseUrl}/api/v1/security/events/${encodeURIComponent(eventId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getTokenHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Cisco Secure API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco Secure returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAccessPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;

    const url = `${this.baseUrl}/api/v1/access-policies?limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getTokenHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Cisco Secure API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco Secure returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async queryUmbrellaDns(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = args.start_time as string | undefined;
    const endTime = args.end_time as string | undefined;
    const limit = (args.limit as number) || 100;

    let url = `${this.baseUrl}/api/v1/umbrella/dns-logs?limit=${limit}`;

    if (startTime) {
      url += `&start_time=${encodeURIComponent(startTime)}`;
    }
    if (endTime) {
      url += `&end_time=${encodeURIComponent(endTime)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getUmbrellaHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Cisco Secure Umbrella API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco Secure Umbrella returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getAmpEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const eventType = args.event_type as string | undefined;

    let url = `${this.baseUrl}/api/v1/amp/events?limit=${limit}&offset=${offset}`;

    if (eventType) {
      url += `&event_type=${encodeURIComponent(eventType)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getTokenHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Cisco Secure AMP API error: ${response.status} ${response.statusText}`);
    }

    // Finding #19
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Cisco Secure AMP returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
