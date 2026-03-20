/**
 * Barracuda Email Security REST API MCP Server Wrapper
 * REST API: https://{host}/api/v1
 * Auth: API key header (Authorization: Bearer {api_key})
 */

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

interface BarracudaAuthConfig {
  host: string;
  apiKey: string;
  useHttps?: boolean;
}

export class BarracudaMCPServer {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: BarracudaAuthConfig) {
    const protocol = config.useHttps !== false ? 'https' : 'http';
    this.baseUrl = `${protocol}://${config.host}/api/v1`;
    this.apiKey = config.apiKey;
  }

  private async request(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Barracuda API error: ${response.status} ${response.statusText}`
      );
    }

    // Finding #19: wrap response.json() to provide contextual error on non-JSON responses
    try {
      return await response.json();
    } catch {
      throw new Error(`Barracuda returned non-JSON response (HTTP ${response.status})`);
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List detected threats in the email gateway',
        inputSchema: {
          type: 'object',
          properties: {
            threat_type: {
              type: 'string',
              enum: [
                'malware',
                'phishing',
                'spam',
                'dlp',
                'virus',
                'ransomware',
              ],
              description: 'Filter by threat type',
            },
            status: {
              type: 'string',
              enum: ['detected', 'blocked', 'quarantined', 'released'],
              description: 'Filter by threat status',
            },
            from_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format',
            },
            to_date: {
              type: 'string',
              description: 'End date in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Retrieve detailed information about a specific threat',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Unique threat identifier',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search messages in the email gateway',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (sender, recipient, subject)',
            },
            from_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format',
            },
            to_date: {
              type: 'string',
              description: 'End date in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_quarantined',
        description: 'List quarantined messages',
        inputSchema: {
          type: 'object',
          properties: {
            quarantine_type: {
              type: 'string',
              enum: [
                'malware',
                'phishing',
                'spam',
                'dlp',
                'undeliverable',
              ],
              description: 'Filter by quarantine type',
            },
            from_date: {
              type: 'string',
              description: 'Start date in ISO 8601 format',
            },
            to_date: {
              type: 'string',
              description: 'End date in ISO 8601 format',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'list_policies',
        description: 'List email security policies configured on the gateway',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              enum: [
                'inbound',
                'outbound',
                'internal',
                'dlp',
                'encryption',
              ],
              description: 'Filter by policy type',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled/disabled status',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
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
      let result: unknown;

      switch (name) {
        case 'list_threats': {
          // Use URLSearchParams for all query parameters — dates and other values properly encoded
          const params = new URLSearchParams();
          if (args.threat_type) params.append('threat_type', String(args.threat_type));
          if (args.status) params.append('status', String(args.status));
          if (args.from_date) params.append('from', String(args.from_date));
          if (args.to_date) params.append('to', String(args.to_date));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/threats?${params.toString()}`);
          break;
        }

        case 'get_threat':
          result = await this.request(`/threats/${encodeURIComponent(String(args.threat_id))}`);
          break;

        case 'search_messages': {
          const params = new URLSearchParams();
          params.append('query', String(args.query));
          if (args.from_date) params.append('from', String(args.from_date));
          if (args.to_date) params.append('to', String(args.to_date));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/messages/search?${params.toString()}`);
          break;
        }

        case 'list_quarantined': {
          const params = new URLSearchParams();
          if (args.quarantine_type) params.append('type', String(args.quarantine_type));
          if (args.from_date) params.append('from', String(args.from_date));
          if (args.to_date) params.append('to', String(args.to_date));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/quarantine?${params.toString()}`);
          break;
        }

        case 'list_policies': {
          const params = new URLSearchParams();
          if (args.policy_type) params.append('type', String(args.policy_type));
          if (args.enabled !== undefined) params.append('enabled', String(args.enabled));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/policies?${params.toString()}`);
          break;
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
