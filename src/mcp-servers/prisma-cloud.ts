/**
 * Prisma Cloud (Palo Alto Networks) REST API MCP Server Wrapper
 * Provides tools for cloud security posture management
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PrismaCloudConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class PrismaCloudMCPServer {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: PrismaCloudConfig) {
    this.baseUrl = config.baseUrl || 'https://api.prismacloud.io';
    this.username = config.username;
    this.password = config.password;
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Prisma Cloud login failed: ${response.statusText}`);
    }

    let data: { token?: string; expires?: number };
    try {
      data = await response.json() as { token?: string; expires?: number };
    } catch {
      throw new Error('Prisma Cloud login returned invalid JSON');
    }

    if (!data.token) {
      throw new Error('No token in Prisma Cloud login response');
    }

    this.authToken = data.token;
    this.tokenExpiry = Date.now() + ((data.expires || 3600) * 1000) - 60000; // Refresh 1min before expiry
    return this.authToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts from Prisma Cloud',
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
              description: 'Filter by status (open, resolved, dismissed)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details of a specific Prisma Cloud alert',
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
        name: 'list_policies',
        description: 'List configured security policies',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 50)',
            },
            policyType: {
              type: 'string',
              description: 'Filter by policy type (Config, Network, Audit)',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter by policy enabled status',
            },
          },
        },
      },
      {
        name: 'get_compliance_posture',
        description: 'Get cloud security compliance posture summary',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Compliance framework (CIS, PCI-DSS, HIPAA, SOC2, ISO27001)',
            },
          },
        },
      },
      {
        name: 'list_resources',
        description: 'List cloud resources scanned by Prisma Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of resources to return (default: 50)',
            },
            resourceType: {
              type: 'string',
              description: 'Filter by resource type (compute, storage, network, database)',
            },
            cloudType: {
              type: 'string',
              description: 'Filter by cloud type (aws, azure, gcp)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAuthToken();
      const headers = {
        'x-redlock-auth': token,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(headers, args);
        case 'get_alert':
          return await this.getAlert(headers, args);
        case 'list_policies':
          return await this.listPolicies(headers, args);
        case 'get_compliance_posture':
          return await this.getCompliancePosture(headers, args);
        case 'list_resources':
          return await this.listResources(headers, args);
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
            text: `Prisma Cloud API error: ${error instanceof Error ? error.message : String(error)}`,
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

    const filters: Record<string, unknown> = {};
    if (args.severity) filters.severity = [args.severity];
    if (args.status) filters.status = [args.status];

    const response = await fetch(`${this.baseUrl}/alert`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ limit, offset, filters }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prisma Cloud API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Prisma Cloud API returned invalid JSON');
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
      `${this.baseUrl}/alert/${encodeURIComponent(String(args.alertId))}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prisma Cloud API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Prisma Cloud API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listPolicies(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (args.policyType) params.append('policyType', args.policyType as string);
    if (typeof args.enabled === 'boolean') {
      params.append('enabled', args.enabled.toString());
    }

    const response = await fetch(`${this.baseUrl}/policy?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prisma Cloud API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Prisma Cloud API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getCompliancePosture(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const params = new URLSearchParams();

    if (args.framework) {
      params.append('framework', args.framework as string);
    }

    const url = `${this.baseUrl}/compliance${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prisma Cloud API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Prisma Cloud API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listResources(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;

    const filters: Record<string, unknown> = {};
    if (args.resourceType) filters.resourceType = [args.resourceType];
    if (args.cloudType) filters.cloudType = [args.cloudType];

    const response = await fetch(`${this.baseUrl}/resource`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ limit, filters }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Prisma Cloud API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Prisma Cloud API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
