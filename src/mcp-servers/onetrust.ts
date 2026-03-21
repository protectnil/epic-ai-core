/**
 * OneTrust MCP Server Wrapper
 * Integrates OneTrust REST API for privacy, compliance, and assessment management
 * Base URL: https://app.onetrust.com/api
 * Auth: Bearer token
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface OneTrustConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OneTrustMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: OneTrustConfig) {
    this.baseUrl = config.baseUrl || 'https://app.onetrust.com/api';
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_assessments',
        description: 'List all assessments in OneTrust',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page',
            },
            pageIndex: {
              type: 'number',
              description: 'Page index for pagination',
            },
            status: {
              type: 'string',
              description: 'Filter by assessment status',
            },
          },
        },
      },
      {
        name: 'get_assessment',
        description: 'Get details of a specific assessment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            assessmentId: {
              type: 'string',
              description: 'The assessment ID',
            },
          },
          required: ['assessmentId'],
        },
      },
      {
        name: 'list_data_maps',
        description: 'List all data maps in OneTrust',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page',
            },
            pageIndex: {
              type: 'number',
              description: 'Page index for pagination',
            },
          },
        },
      },
      {
        name: 'get_privacy_request',
        description: 'Get details of a privacy request by ID',
        inputSchema: {
          type: 'object',
          properties: {
            requestId: {
              type: 'string',
              description: 'The privacy request ID',
            },
          },
          required: ['requestId'],
        },
      },
      {
        name: 'list_compliance_tasks',
        description: 'List compliance tasks and their statuses',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page',
            },
            pageIndex: {
              type: 'number',
              description: 'Page index for pagination',
            },
            status: {
              type: 'string',
              description: 'Filter by task status (pending, completed, overdue)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_assessments':
          return await this.listAssessments(args);
        case 'get_assessment':
          return await this.getAssessment(args);
        case 'list_data_maps':
          return await this.listDataMaps(args);
        case 'get_privacy_request':
          return await this.getPrivacyRequest(args);
        case 'list_compliance_tasks':
          return await this.listComplianceTasks(args);
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

  private async listAssessments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('pageSize', String(args.pageSize || 20));
    params.append('pageIndex', String(args.pageIndex || 0));
    if (args.status) params.append('status', String(args.status));

    const response = await fetch(
      `${this.baseUrl}/assessments?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`OneTrust API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAssessment(args: Record<string, unknown>): Promise<ToolResult> {
    const { assessmentId } = args;
    if (!assessmentId) {
      throw new Error('assessmentId is required');
    }

    const response = await fetch(
      `${this.baseUrl}/assessments/${encodeURIComponent(String(assessmentId))}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`OneTrust API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listDataMaps(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('pageSize', String(args.pageSize || 20));
    params.append('pageIndex', String(args.pageIndex || 0));

    const response = await fetch(
      `${this.baseUrl}/datamaps?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`OneTrust API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getPrivacyRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { requestId } = args;
    if (!requestId) {
      throw new Error('requestId is required');
    }

    const response = await fetch(
      `${this.baseUrl}/privacy-requests/${encodeURIComponent(String(requestId))}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`OneTrust API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listComplianceTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('pageSize', String(args.pageSize || 20));
    params.append('pageIndex', String(args.pageIndex || 0));
    if (args.status) params.append('status', String(args.status));

    const response = await fetch(
      `${this.baseUrl}/compliance-tasks?${params.toString()}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`OneTrust API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
