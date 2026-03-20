/**
 * ThreatConnect REST API MCP Server Wrapper
 * REST API: https://api.threatconnect.com/v3
 * Auth: HMAC signature (TC-Token or timestamp-based HMAC)
 */

import crypto from 'crypto';

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ToolResult {
  content: unknown;
  isError: boolean;
}

interface ThreatConnectAuthConfig {
  accessId: string;
  secretKey: string;
  baseUrl?: string;
}

export class ThreatConnectMCPServer {
  private readonly baseUrl: string;
  private readonly accessId: string;
  private readonly secretKey: string;

  constructor(config: ThreatConnectAuthConfig) {
    this.baseUrl = config.baseUrl || 'https://api.threatconnect.com/v3';
    this.accessId = config.accessId;
    this.secretKey = config.secretKey;
  }

  private generateHmacSignature(path: string, timestamp: number): string {
    const signature_string = `${path}:${this.accessId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(signature_string)
      .digest('base64');
    return signature;
  }

  private async request(
    path: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateHmacSignature(path, timestamp);
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `TC-Token ${this.accessId}:${signature}:${timestamp}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `ThreatConnect API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_indicators',
        description:
          'List indicators with optional filtering and pagination',
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'TQL filter expression (e.g., "typeName EQ Address")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 100)',
              default: 100,
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
              default: 0,
            },
          },
        },
      },
      {
        name: 'get_indicator',
        description: 'Retrieve detailed information about a specific indicator',
        parameters: {
          type: 'object',
          properties: {
            indicator_id: {
              type: 'string',
              description: 'Unique identifier for the indicator',
            },
          },
          required: ['indicator_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List threat groups (campaigns, incidents, adversaries)',
        parameters: {
          type: 'object',
          properties: {
            group_type: {
              type: 'string',
              enum: ['campaign', 'incident', 'adversary', 'intrusion-set'],
              description: 'Filter by group type',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
              default: 0,
            },
          },
        },
      },
      {
        name: 'search_intelligence',
        description: 'Search threat intelligence across all data types',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            data_type: {
              type: 'string',
              enum: ['indicator', 'group', 'document', 'signature'],
              description: 'Limit search to specific data type',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
              default: 50,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_playbooks',
        description: 'List available automation playbooks',
        parameters: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled status',
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
        case 'list_indicators':
          {
            let path = '/indicators?';
            if (args.filter)
              path += `filter=${encodeURIComponent(args.filter as string)}&`;
            path += `limit=${args.limit || 100}&offset=${args.offset || 0}`;
            result = await this.request(path);
          }
          break;

        case 'get_indicator':
          result = await this.request(`/indicators/${args.indicator_id}`);
          break;

        case 'list_groups':
          {
            let path = '/groups?';
            if (args.group_type)
              path += `type=${args.group_type}&`;
            path += `limit=${args.limit || 100}&offset=${args.offset || 0}`;
            result = await this.request(path);
          }
          break;

        case 'search_intelligence':
          result = await this.request(
            `/search?query=${encodeURIComponent(args.query as string)}&type=${args.data_type || ''}&limit=${args.limit || 50}`
          );
          break;

        case 'list_playbooks':
          {
            let path = '/playbooks?';
            if (args.enabled !== undefined)
              path += `enabled=${args.enabled}&`;
            path += `limit=${args.limit || 100}`;
            result = await this.request(path);
          }
          break;

        default:
          return {
            content: `Unknown tool: ${name}`,
            isError: true,
          };
      }

      return {
        content: result,
        isError: false,
      };
    } catch (error) {
      return {
        content: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
