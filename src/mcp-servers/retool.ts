/** Retool MCP Server
 * Retool app and workflow management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface RetoolConfig {
  apiKey: string;
  baseUrl?: string;
}

export class RetoolMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RetoolConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.retool.com/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_apps',
        description: 'List all Retool apps',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
          required: [],
        },
      },
      {
        name: 'get_app',
        description: 'Get a specific Retool app by ID',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'App ID' },
          },
          required: ['appId'],
        },
      },
      {
        name: 'list_resources',
        description: 'List all Retool resources',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
          required: [],
        },
      },
      {
        name: 'trigger_workflow',
        description: 'Trigger a Retool workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Workflow ID' },
            payload: { type: 'object', description: 'Workflow input payload' },
          },
          required: ['workflowId'],
        },
      },
      {
        name: 'list_folders',
        description: 'List all Retool folders',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'list_apps': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.pageSize !== undefined) params.set('pageSize', String(args.pageSize));
          response = await fetch(`${this.baseUrl}/apps?${params}`, { headers });
          break;
        }
        case 'get_app': {
          response = await fetch(`${this.baseUrl}/apps/${args.appId}`, { headers });
          break;
        }
        case 'list_resources': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.pageSize !== undefined) params.set('pageSize', String(args.pageSize));
          response = await fetch(`${this.baseUrl}/resources?${params}`, { headers });
          break;
        }
        case 'trigger_workflow': {
          response = await fetch(`${this.baseUrl}/workflows/${args.workflowId}/trigger`, {
            method: 'POST',
            headers,
            body: JSON.stringify(args.payload ?? {}),
          });
          break;
        }
        case 'list_folders': {
          const params = new URLSearchParams();
          if (args.page !== undefined) params.set('page', String(args.page));
          if (args.pageSize !== undefined) params.set('pageSize', String(args.pageSize));
          response = await fetch(`${this.baseUrl}/folders?${params}`, { headers });
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
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
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
