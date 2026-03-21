/**
 * Recorded Future REST API MCP Server Wrapper
 * Provides tools for threat intelligence and risk scoring via Recorded Future
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface RecordedFutureConfig {
  apiToken: string;
  baseUrl?: string;
}

export class RecordedFutureMCPServer {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(config: RecordedFutureConfig) {
    this.baseUrl = config.baseUrl || 'https://api.recordedfuture.com/v2';
    this.apiToken = config.apiToken;
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-RFToken': this.apiToken,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_indicators',
        description: 'Search for threat indicators (IPs, domains, hashes, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (IP, domain, hash, email, file path)',
            },
            indicatorType: {
              type: 'string',
              description: 'Filter by indicator type (ip, domain, hash, url, email)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_indicator',
        description: 'Get detailed intelligence about a specific indicator',
        inputSchema: {
          type: 'object',
          properties: {
            indicator: {
              type: 'string',
              description: 'The indicator value (IP, domain, hash, URL, email)',
            },
            indicatorType: {
              type: 'string',
              description: 'Type of indicator (ip, domain, hash, url, email, file)',
            },
          },
          required: ['indicator', 'indicatorType'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List threat intelligence alerts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            triggered: {
              type: 'string',
              description: 'Filter by alert triggered time (last-7-days, last-30-days)',
            },
          },
        },
      },
      {
        name: 'get_risk_score',
        description: 'Get risk score and threat intelligence for an indicator',
        inputSchema: {
          type: 'object',
          properties: {
            indicator: {
              type: 'string',
              description: 'The indicator value to score',
            },
            indicatorType: {
              type: 'string',
              description: 'Type of indicator (ip, domain, hash, url, email, file)',
            },
          },
          required: ['indicator', 'indicatorType'],
        },
      },
      {
        name: 'search_threat_actors',
        description: 'Search for threat actors and adversary intelligence',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term for threat actor or group name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
            sortBy: {
              type: 'string',
              description: 'Sort results by (name, lastSeen, riskScore)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.getHeaders();

      switch (name) {
        case 'search_indicators':
          return await this.searchIndicators(headers, args);
        case 'get_indicator':
          return await this.getIndicator(headers, args);
        case 'list_alerts':
          return await this.listAlerts(headers, args);
        case 'get_risk_score':
          return await this.getRiskScore(headers, args);
        case 'search_threat_actors':
          return await this.searchThreatActors(headers, args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Recorded Future API error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async searchIndicators(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const params = new URLSearchParams({
      query: args.query as string,
    });

    if (args.indicatorType) params.append('indicatorType', args.indicatorType as string);
    if (args.limit) params.append('limit', (args.limit as number).toString());

    const response = await fetch(`${this.baseUrl}/indicators/search?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json() as Record<string, unknown>;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: !response.ok,
    };
  }

  private async getIndicator(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const indicatorType = args.indicatorType as string;
    const indicator = encodeURIComponent(args.indicator as string);

    const response = await fetch(
      `${this.baseUrl}/indicators/${indicatorType}/${indicator}`,
      {
        method: 'GET',
        headers,
      }
    );

    const data = await response.json() as Record<string, unknown>;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: !response.ok,
    };
  }

  private async listAlerts(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    if (args.limit) params.append('limit', (args.limit as number).toString());
    if (args.offset) params.append('offset', (args.offset as number).toString());
    if (args.triggered) params.append('triggered', args.triggered as string);

    const response = await fetch(`${this.baseUrl}/alerts?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json() as Record<string, unknown>;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: !response.ok,
    };
  }

  private async getRiskScore(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const indicatorType = args.indicatorType as string;
    const indicator = encodeURIComponent(args.indicator as string);

    const response = await fetch(
      `${this.baseUrl}/indicators/${indicatorType}/${indicator}/risk`,
      {
        method: 'GET',
        headers,
      }
    );

    const data = await response.json() as Record<string, unknown>;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: !response.ok,
    };
  }

  private async searchThreatActors(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const params = new URLSearchParams({
      query: args.query as string,
    });

    if (args.limit) params.append('limit', (args.limit as number).toString());
    if (args.sortBy) params.append('sortBy', args.sortBy as string);

    const response = await fetch(`${this.baseUrl}/threat-actors/search?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json() as Record<string, unknown>;
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: !response.ok,
    };
  }
}
