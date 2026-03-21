/** Neon MCP Server
 * Neon serverless PostgreSQL project and branch management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface NeonConfig {
  token: string;
}

export class NeonMCPServer {
  private config: NeonConfig;
  private baseUrl: string;

  constructor(config: NeonConfig) {
    this.config = config;
    this.baseUrl = 'https://console.neon.tech/api/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Neon projects in the account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of projects to return' },
            cursor: { type: 'string', description: 'Pagination cursor' },
            search: { type: 'string', description: 'Search string to filter projects by name' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Neon project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_branches',
        description: 'List all branches in a Neon project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_branch',
        description: 'Create a new branch in a Neon project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            name: { type: 'string', description: 'Branch name' },
            parentId: { type: 'string', description: 'Parent branch ID (defaults to primary)' },
            parentLsn: { type: 'string', description: 'LSN on the parent branch to branch from' },
            parentTimestamp: { type: 'string', description: 'Timestamp on the parent branch to branch from' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases in a Neon project branch',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            branchId: { type: 'string', description: 'Branch ID' },
          },
          required: ['projectId', 'branchId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      let url: string;
      let method: string;
      let body: unknown;

      switch (name) {
        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.cursor) params.set('cursor', String(args.cursor));
          if (args.search) params.set('search', String(args.search));
          url = `${this.baseUrl}/projects?${params}`;
          method = 'GET';
          break;
        }
        case 'get_project': {
          url = `${this.baseUrl}/projects/${args.projectId}`;
          method = 'GET';
          break;
        }
        case 'list_branches': {
          url = `${this.baseUrl}/projects/${args.projectId}/branches`;
          method = 'GET';
          break;
        }
        case 'create_branch': {
          url = `${this.baseUrl}/projects/${args.projectId}/branches`;
          method = 'POST';
          const branchSpec: Record<string, unknown> = {};
          if (args.name) branchSpec['name'] = args.name;
          if (args.parentId) branchSpec['parent_id'] = args.parentId;
          if (args.parentLsn) branchSpec['parent_lsn'] = args.parentLsn;
          if (args.parentTimestamp) branchSpec['parent_timestamp'] = args.parentTimestamp;
          body = { branch: branchSpec };
          break;
        }
        case 'list_databases': {
          url = `${this.baseUrl}/projects/${args.projectId}/branches/${args.branchId}/databases`;
          method = 'GET';
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(url!, {
        method: method!,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

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
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
