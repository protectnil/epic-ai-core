/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class TerraformRegistryMCPServer {
  private baseUrl = 'https://app.terraform.io/api/v2';

  constructor(private config: { token: string; organization: string }) {}

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List Terraform Cloud workspaces in an organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Number of results per page', default: 20 },
            page_number: { type: 'number', description: 'Page number', default: 1 },
            search_name: { type: 'string', description: 'Filter by workspace name' },
          },
          required: [],
        },
      },
      {
        name: 'get_workspace',
        description: 'Get details of a specific Terraform Cloud workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_name: { type: 'string', description: 'Workspace name' },
          },
          required: ['workspace_name'],
        },
      },
      {
        name: 'list_runs',
        description: 'List runs for a Terraform Cloud workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID' },
            page_size: { type: 'number', description: 'Number of results per page', default: 20 },
            page_number: { type: 'number', description: 'Page number', default: 1 },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'get_run',
        description: 'Get details of a specific Terraform Cloud run',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Run ID' },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'list_modules',
        description: 'List modules in the Terraform Cloud private registry',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Number of results per page', default: 20 },
            page_number: { type: 'number', description: 'Page number', default: 1 },
            search_name: { type: 'string', description: 'Filter by module name' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;

      const headers = {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      };

      switch (name) {
        case 'list_workspaces': {
          const params = new URLSearchParams({
            'page[size]': String(args.page_size ?? 20),
            'page[number]': String(args.page_number ?? 1),
          });
          if (args.search_name) params.set('search[name]', String(args.search_name));
          url = `${this.baseUrl}/organizations/${this.config.organization}/workspaces?${params}`;
          break;
        }
        case 'get_workspace': {
          url = `${this.baseUrl}/organizations/${this.config.organization}/workspaces/${args.workspace_name}`;
          break;
        }
        case 'list_runs': {
          const params = new URLSearchParams({
            'page[size]': String(args.page_size ?? 20),
            'page[number]': String(args.page_number ?? 1),
          });
          url = `${this.baseUrl}/workspaces/${args.workspace_id}/runs?${params}`;
          break;
        }
        case 'get_run': {
          url = `${this.baseUrl}/runs/${args.run_id}`;
          break;
        }
        case 'list_modules': {
          const params = new URLSearchParams({
            'page[size]': String(args.page_size ?? 20),
            'page[number]': String(args.page_number ?? 1),
          });
          if (args.search_name) params.set('search[name]', String(args.search_name));
          url = `${this.baseUrl}/organizations/${this.config.organization}/registry-modules?${params}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, { headers });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}
