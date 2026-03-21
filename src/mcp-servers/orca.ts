/**
 * Orca Security REST API MCP Server Wrapper
 * Provides tools for alert and asset management via Orca Security
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface OrcaConfig {
  apiToken: string;
  baseUrl?: string;
}

export class OrcaMCPServer {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(config: OrcaConfig) {
    this.baseUrl = config.baseUrl || 'https://api.orcasecurity.io';
    this.apiToken = config.apiToken;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts from Orca Security',
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
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (open, resolved, in_progress)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details of a specific Orca Security alert',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'The ID of the alert to retrieve',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'list_assets',
        description: 'List cloud assets monitored by Orca Security',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 50)',
            },
            type: {
              type: 'string',
              description: 'Filter by asset type (instance, storage, database, network)',
            },
            cloudProvider: {
              type: 'string',
              description: 'Filter by cloud provider (aws, azure, gcp)',
            },
          },
        },
      },
      {
        name: 'get_attack_path',
        description: 'Get attack path analysis for a specific asset',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'string',
              description: 'The ID of the asset to analyze',
            },
          },
          required: ['assetId'],
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get compliance status for security frameworks',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Compliance framework (CIS, PCI-DSS, HIPAA, SOC2)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers = this.getHeaders();

      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(headers, args);
        case 'get_alert':
          return await this.getAlert(headers, args);
        case 'list_assets':
          return await this.listAssets(headers, args);
        case 'get_attack_path':
          return await this.getAttackPath(headers, args);
        case 'get_compliance_status':
          return await this.getComplianceStatus(headers, args);
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
            text: `Orca Security API error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listAlerts(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (args.severity) params.append('severity', args.severity as string);
    if (args.status) params.append('status', args.status as string);

    const response = await fetch(`${this.baseUrl}/api/alerts?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Orca API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Orca API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAlert(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/api/alerts/${encodeURIComponent(String(args.alertId))}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Orca API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Orca API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listAssets(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;

    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (args.type) params.append('type', args.type as string);
    if (args.cloudProvider) params.append('cloud_provider', args.cloudProvider as string);

    const response = await fetch(`${this.baseUrl}/api/assets?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Orca API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Orca API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAttackPath(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/api/assets/${encodeURIComponent(String(args.assetId))}/attack-path`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Orca API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Orca API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getComplianceStatus(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    if (args.framework) {
      params.append('framework', args.framework as string);
    }

    const url = `${this.baseUrl}/api/compliance${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Orca API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Orca API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
