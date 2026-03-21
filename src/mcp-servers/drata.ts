/**
 * Drata MCP Server Wrapper
 * Integrates Drata REST API for compliance automation and evidence management
 * Base URL: https://public-api.drata.com
 * Auth: Bearer token
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface DrataConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DrataMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: DrataConfig) {
    this.baseUrl = config.baseUrl || 'https://public-api.drata.com';
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_controls',
        description: 'List all compliance controls in Drata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of controls to return',
            },
            offset: {
              type: 'number',
              description: 'Number of controls to skip',
            },
            status: {
              type: 'string',
              description: 'Filter by control status (compliant, non-compliant, not-applicable)',
            },
            framework: {
              type: 'string',
              description: 'Filter by compliance framework (SOC2, ISO27001, etc)',
            },
          },
        },
      },
      {
        name: 'get_control',
        description: 'Get details of a specific control by ID',
        inputSchema: {
          type: 'object',
          properties: {
            controlId: {
              type: 'string',
              description: 'The control ID',
            },
          },
          required: ['controlId'],
        },
      },
      {
        name: 'list_evidence',
        description: 'List evidence items uploaded to Drata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of evidence items to return',
            },
            offset: {
              type: 'number',
              description: 'Number of evidence items to skip',
            },
            controlId: {
              type: 'string',
              description: 'Filter evidence by control ID',
            },
            status: {
              type: 'string',
              description: 'Filter by evidence status (pending, approved, rejected)',
            },
          },
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get overall compliance status and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Get compliance status for specific framework (SOC2, ISO27001, etc)',
            },
          },
        },
      },
      {
        name: 'list_personnel',
        description: 'List personnel and team members in Drata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of personnel to return',
            },
            offset: {
              type: 'number',
              description: 'Number of personnel to skip',
            },
            role: {
              type: 'string',
              description: 'Filter by role',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_controls':
          return await this.listControls(args);
        case 'get_control':
          return await this.getControl(args);
        case 'list_evidence':
          return await this.listEvidence(args);
        case 'get_compliance_status':
          return await this.getComplianceStatus(args);
        case 'list_personnel':
          return await this.listPersonnel(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 50));
    params.append('offset', String(args.offset || 0));
    if (args.status) params.append('status', String(args.status));
    if (args.framework) params.append('framework', String(args.framework));

    const response = await fetch(
      `${this.baseUrl}/controls?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Drata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    const { controlId } = args;
    if (!controlId) {
      throw new Error('controlId is required');
    }

    const response = await fetch(
      `${this.baseUrl}/controls/${encodeURIComponent(String(controlId))}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Drata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 50));
    params.append('offset', String(args.offset || 0));
    if (args.controlId) params.append('controlId', String(args.controlId));
    if (args.status) params.append('status', String(args.status));

    const response = await fetch(
      `${this.baseUrl}/evidence?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Drata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getComplianceStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.framework) params.append('framework', String(args.framework));

    const query = params.toString();
    const url = `${this.baseUrl}/compliance-status${query ? `?${query}` : ''}`;

    const response = await fetch(url, { method: 'GET', headers: this.headers });

    if (!response.ok) {
      throw new Error(`Drata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listPersonnel(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(args.limit || 50));
    params.append('offset', String(args.offset || 0));
    if (args.role) params.append('role', String(args.role));

    const response = await fetch(
      `${this.baseUrl}/personnel?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Drata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
