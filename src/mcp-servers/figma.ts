/** Figma MCP Server
 * Provides access to Figma design files, projects, comments, and version history
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface FigmaConfig {
  pat: string;
  baseUrl?: string;
}

export class FigmaMCPServer {
  private readonly pat: string;
  private readonly baseUrl: string;

  constructor(config: FigmaConfig) {
    this.pat = config.pat;
    this.baseUrl = config.baseUrl || 'https://api.figma.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_file',
        description: 'Retrieve a Figma file by key, including its document tree, components, and styles',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique identifier of the Figma file',
            },
            depth: {
              type: 'number',
              description: 'Depth of the document tree to return (default: full depth)',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in a Figma team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get all comments on a Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique identifier of the Figma file',
            },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'list_team_projects',
        description: 'List all projects belonging to a Figma team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The Figma team ID',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_file_versions',
        description: 'Get the version history for a Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: {
              type: 'string',
              description: 'The unique identifier of the Figma file',
            },
          },
          required: ['file_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.pat}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'get_file': {
          const fileKey = args.file_key as string;
          if (!fileKey) {
            return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
          }
          let url = `${this.baseUrl}/files/${encodeURIComponent(fileKey)}`;
          if (args.depth !== undefined) url += `?depth=${args.depth}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get file: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Figma returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_projects': {
          const teamId = args.team_id as string;
          if (!teamId) {
            return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/projects`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list projects: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Figma returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_comments': {
          const fileKey = args.file_key as string;
          if (!fileKey) {
            return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/comments`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get comments: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Figma returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_team_projects': {
          const teamId = args.team_id as string;
          if (!teamId) {
            return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/projects`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list team projects: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Figma returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_file_versions': {
          const fileKey = args.file_key as string;
          if (!fileKey) {
            return { content: [{ type: 'text', text: 'file_key is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/files/${encodeURIComponent(fileKey)}/versions`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get file versions: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Figma returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
