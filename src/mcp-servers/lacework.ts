/**
 * Lacework REST API MCP Server Wrapper
 * Provides tools for alert and vulnerability management via Lacework
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface LaceworkConfig {
  account: string;
  keyId: string;
  secret: string;
  baseUrl?: string;
}

export class LaceworkMCPServer {
  private readonly baseUrl: string;
  private readonly account: string;
  private readonly keyId: string;
  private readonly secret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: LaceworkConfig) {
    this.account = config.account;
    this.keyId = config.keyId;
    this.secret = config.secret;
    this.baseUrl = config.baseUrl || `https://${config.account}.lacework.net/api/v2`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/access/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyId: this.keyId,
        secret: this.secret,
        account: this.account,
        expiryTime: 3600,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework auth failed: ${response.status} ${text}`);
    }

    let data: { data?: { token: string; expiresAt: string } };
    try {
      data = await response.json() as { data?: { token: string; expiresAt: string } };
    } catch {
      throw new Error('Lacework auth returned invalid JSON');
    }

    if (!data.data?.token) {
      throw new Error('Invalid token response from Lacework');
    }

    this.accessToken = data.data.token;
    this.tokenExpiry = Date.now() + 3540000; // 59 minutes
    return this.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts from Lacework',
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
              description: 'Filter by severity (Critical, High, Medium, Low, Info)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (Open, Dismissed, Resolved)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details of a specific Lacework alert',
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
        name: 'list_vulnerabilities',
        description: 'List detected vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of vulnerabilities to return (default: 50)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (Critical, High, Medium, Low)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (Open, Fixed, Suppressed)',
            },
          },
        },
      },
      {
        name: 'get_compliance_report',
        description: 'Get compliance posture report for specific framework',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Compliance framework (CIS, PCI-DSS, HIPAA, SOC2, ISO27001)',
            },
          },
          required: ['framework'],
        },
      },
      {
        name: 'list_policies',
        description: 'List configured detection policies',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 50)',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter by policy enabled status',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(headers, args);
        case 'get_alert':
          return await this.getAlert(headers, args);
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(headers, args);
        case 'get_compliance_report':
          return await this.getComplianceReport(headers, args);
        case 'list_policies':
          return await this.listPolicies(headers, args);
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
            text: `Lacework API error: ${error instanceof Error ? error.message : String(error)}`,
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

    const body: Record<string, unknown> = {
      returns: limit,
      start_index: offset,
    };

    if (args.severity) body.filters = { severity: args.severity };
    if (args.status) {
      body.filters = body.filters || {};
      (body.filters as Record<string, unknown>).status = args.status;
    }

    // NOTE: The Lacework API requires POST for search/list operations, even
    // for read-only queries. This is a Lacework API design requirement, not a bug.
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Lacework API returned invalid JSON');
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
    const response = await fetch(`${this.baseUrl}/alerts/${encodeURIComponent(String(args.alertId))}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Lacework API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listVulnerabilities(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;

    const body: Record<string, unknown> = {
      returns: limit,
    };

    if (args.severity || args.status) {
      body.filters = {};
      if (args.severity) (body.filters as Record<string, unknown>).severity = args.severity;
      if (args.status) (body.filters as Record<string, unknown>).status = args.status;
    }

    // NOTE: The Lacework API requires POST for search/list operations, even
    // for read-only queries. This is a Lacework API design requirement, not a bug.
    const response = await fetch(`${this.baseUrl}/vulnerabilities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Lacework API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getComplianceReport(
    headers: Record<string, string>,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('framework', String(args.framework));

    const response = await fetch(
      `${this.baseUrl}/compliance-reports?${params.toString()}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Lacework API returned invalid JSON');
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

    if (typeof args.enabled === 'boolean') {
      params.append('enabled', args.enabled.toString());
    }

    const response = await fetch(`${this.baseUrl}/policies?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lacework API error: ${response.status} ${text}`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Lacework API returned invalid JSON');
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
