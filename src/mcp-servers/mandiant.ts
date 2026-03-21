/**
 * Mandiant (Google) Threat Intelligence MCP Server Wrapper
 * REST API: https://api.intelligence.mandiant.com/v4
 * Auth: OAuth2 (client_credentials) with X-App-Name header
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface MandiantAuthConfig {
  clientId: string;
  clientSecret: string;
  appName: string;
  /** API base URL. Defaults to the Mandiant production endpoint. */
  baseUrl?: string;
}

const MANDIANT_DEFAULT_BASE_URL = 'https://api.intelligence.mandiant.com/v4';

export class MandiantMCPServer {
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly appName: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MandiantAuthConfig) {
    this.baseUrl = config.baseUrl ?? MANDIANT_DEFAULT_BASE_URL;
    // Derive the token URL from the same base (strip /v4 path, append /token)
    const urlBase = this.baseUrl.replace(/\/v\d+\/?$/, '');
    this.tokenUrl = `${urlBase}/token`;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.appName = config.appName;
  }

  private async ensureToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-App-Name': this.appName,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Mandiant auth failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in * 1000 - 60000);
    return this.accessToken;
  }

  private async request(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const token = await this.ensureToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-App-Name': this.appName,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Mandiant API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_indicators',
        description:
          'Search threat indicators (IPs, domains, hashes, URLs) in Mandiant database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Indicator value to search (IP, domain, hash, URL)',
            },
            indicator_type: {
              type: 'string',
              enum: ['ipv4', 'ipv6', 'domain', 'hash', 'url'],
              description: 'Type of indicator to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
              default: 50,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_threat_actor',
        description: 'Retrieve detailed information about a specific threat actor',
        inputSchema: {
          type: 'object',
          properties: {
            actor_id: {
              type: 'string',
              description: 'Unique identifier for the threat actor (e.g., APT28)',
            },
            include_campaigns: {
              type: 'boolean',
              description: 'Include associated campaigns in response',
              default: false,
            },
          },
          required: ['actor_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List threat campaigns with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            actor_id: {
              type: 'string',
              description: 'Filter campaigns by threat actor ID',
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
        name: 'get_malware',
        description: 'Retrieve detailed information about malware families',
        inputSchema: {
          type: 'object',
          properties: {
            malware_name: {
              type: 'string',
              description: 'Name of malware family to retrieve',
            },
            include_variants: {
              type: 'boolean',
              description: 'Include malware variants in response',
              default: false,
            },
          },
          required: ['malware_name'],
        },
      },
      {
        name: 'search_reports',
        description: 'Search threat intelligence reports',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for reports',
            },
            report_type: {
              type: 'string',
              enum: ['campaign', 'vulnerability', 'malware', 'threat-actor'],
              description: 'Filter by report type',
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
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      let result: unknown;

      switch (name) {
        case 'search_indicators': {
          const params = new URLSearchParams();
          params.append('query', String(args.query));
          if (args.indicator_type) params.append('type', String(args.indicator_type));
          params.append('limit', String(args.limit || 50));
          result = await this.request(`/indicators?${params.toString()}`);
          break;
        }

        case 'get_threat_actor':
          // encodeURIComponent applied to all path segment values
          result = await this.request(`/threat-actors/${encodeURIComponent(String(args.actor_id))}`);
          break;

        case 'list_campaigns': {
          const params = new URLSearchParams();
          if (args.actor_id) params.append('actor_id', encodeURIComponent(String(args.actor_id)));
          params.append('limit', String(args.limit || 100));
          params.append('offset', String(args.offset || 0));
          result = await this.request(`/campaigns?${params.toString()}`);
          break;
        }

        case 'get_malware':
          // encodeURIComponent applied to path segment
          result = await this.request(`/malware/${encodeURIComponent(String(args.malware_name))}`);
          break;

        case 'search_reports': {
          const params = new URLSearchParams();
          params.append('query', String(args.query));
          if (args.report_type) params.append('type', String(args.report_type));
          params.append('limit', String(args.limit || 50));
          result = await this.request(`/reports?${params.toString()}`);
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
