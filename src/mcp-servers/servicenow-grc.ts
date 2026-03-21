/**
 * ServiceNow GRC MCP Server Wrapper
 * Integrates ServiceNow GRC REST API for risk, compliance, and policy management
 * Base URL: https://{instance}.service-now.com/api/now
 * Auth: Basic auth or OAuth2 bearer token
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface ServiceNowGRCConfig {
  instance: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  baseUrl?: string;
}

export class ServiceNowGRCMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: ServiceNowGRCConfig) {
    this.baseUrl = config.baseUrl || `https://${config.instance}.service-now.com/api/now`;

    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (config.bearerToken) {
      this.headers['Authorization'] = `Bearer ${config.bearerToken}`;
    } else if (config.username && config.password) {
      const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.headers['Authorization'] = `Basic ${credentials}`;
    } else {
      throw new Error(
        'ServiceNowGRCMCPServer: authentication required. Provide either bearerToken or both username and password.'
      );
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_risks',
        description: 'List all risks in ServiceNow GRC',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip',
            },
            query: {
              type: 'string',
              description: 'Query filter criteria',
            },
            state: {
              type: 'string',
              description: 'Filter by risk state (identified, assessed, mitigated, etc)',
            },
          },
        },
      },
      {
        name: 'get_risk',
        description: 'Get details of a specific risk by ID',
        inputSchema: {
          type: 'object',
          properties: {
            riskId: {
              type: 'string',
              description: 'The risk ID (sys_id)',
            },
          },
          required: ['riskId'],
        },
      },
      {
        name: 'list_compliance_tasks',
        description: 'List compliance-related tasks',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip',
            },
            state: {
              type: 'string',
              description: 'Filter by task state (new, in_progress, completed)',
            },
          },
        },
      },
      {
        name: 'list_audit_items',
        description: 'List audit items and findings',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip',
            },
            status: {
              type: 'string',
              description: 'Filter by audit status',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get details of a specific policy by ID',
        inputSchema: {
          type: 'object',
          properties: {
            policyId: {
              type: 'string',
              description: 'The policy ID (sys_id)',
            },
          },
          required: ['policyId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_risks':
          return await this.listRisks(args);
        case 'get_risk':
          return await this.getRisk(args);
        case 'list_compliance_tasks':
          return await this.listComplianceTasks(args);
        case 'list_audit_items':
          return await this.listAuditItems(args);
        case 'get_policy':
          return await this.getPolicy(args);
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

  private async listRisks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('sysparm_limit', String(args.limit || 100));
    params.append('sysparm_offset', String(args.offset || 0));

    // Combine query filters into a single sysparm_query using ^ operator
    const queryParts: string[] = [];
    if (args.query) queryParts.push(String(args.query));
    if (args.state) queryParts.push(`state=${encodeURIComponent(String(args.state))}`);
    if (queryParts.length > 0) {
      params.append('sysparm_query', queryParts.join('^'));
    }

    const response = await fetch(
      `${this.baseUrl}/table/u_risk?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getRisk(args: Record<string, unknown>): Promise<ToolResult> {
    const { riskId } = args;
    if (!riskId) {
      throw new Error('riskId is required');
    }

    const response = await fetch(
      `${this.baseUrl}/table/u_risk/${encodeURIComponent(String(riskId))}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listComplianceTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('sysparm_limit', String(args.limit || 100));
    params.append('sysparm_offset', String(args.offset || 0));

    if (args.state) {
      params.append('sysparm_query', `state=${encodeURIComponent(String(args.state))}`);
    }

    const response = await fetch(
      `${this.baseUrl}/table/u_compliance_task?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listAuditItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('sysparm_limit', String(args.limit || 100));
    params.append('sysparm_offset', String(args.offset || 0));

    if (args.status) {
      params.append('sysparm_query', `status=${encodeURIComponent(String(args.status))}`);
    }

    const response = await fetch(
      `${this.baseUrl}/table/u_audit_item?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const { policyId } = args;
    if (!policyId) {
      throw new Error('policyId is required');
    }

    const response = await fetch(
      `${this.baseUrl}/table/u_policy/${encodeURIComponent(String(policyId))}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
