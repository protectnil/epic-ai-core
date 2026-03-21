/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class ConfluenceMCPServer {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: { instance: string; email: string; api_token: string }) {
    this.baseUrl = `https://${config.instance}.atlassian.net/wiki/api/v2`;
    this.authHeader = 'Basic ' + Buffer.from(`${config.email}:${config.api_token}`).toString('base64');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pages',
        description: 'List pages in a Confluence space',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: { type: 'string', description: 'The space ID' },
            limit: { type: 'number', description: 'Maximum number of results', default: 25 },
            cursor: { type: 'string', description: 'Pagination cursor' },
          },
          required: ['space_id'],
        },
      },
      {
        name: 'get_page',
        description: 'Get a specific Confluence page by ID',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: { type: 'string', description: 'The page ID' },
            include_body: { type: 'boolean', description: 'Include page body content', default: true },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'create_page',
        description: 'Create a new Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            space_id: { type: 'string', description: 'The space ID' },
            title: { type: 'string', description: 'Page title' },
            body: { type: 'string', description: 'Page body content in storage format' },
            parent_id: { type: 'string', description: 'Parent page ID' },
            status: { type: 'string', description: 'Page status (current or draft)', default: 'current' },
          },
          required: ['space_id', 'title', 'body'],
        },
      },
      {
        name: 'search_content',
        description: 'Search Confluence content using CQL',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'CQL query string' },
            limit: { type: 'number', description: 'Maximum number of results', default: 25 },
            cursor: { type: 'string', description: 'Pagination cursor' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_spaces',
        description: 'List all accessible Confluence spaces',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of results', default: 25 },
            cursor: { type: 'string', description: 'Pagination cursor' },
            type: { type: 'string', description: 'Space type filter (global or personal)' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;
      let method = 'GET';
      let body: unknown;

      switch (name) {
        case 'list_pages': {
          const params = new URLSearchParams({ spaceId: String(args.space_id), limit: String(args.limit ?? 25) });
          if (args.cursor) params.set('cursor', String(args.cursor));
          url = `${this.baseUrl}/pages?${params}`;
          break;
        }
        case 'get_page': {
          const params = new URLSearchParams();
          if (args.include_body !== false) params.set('body-format', 'storage');
          url = `${this.baseUrl}/pages/${args.page_id}?${params}`;
          break;
        }
        case 'create_page': {
          url = `${this.baseUrl}/pages`;
          method = 'POST';
          body = {
            spaceId: args.space_id,
            status: args.status ?? 'current',
            title: args.title,
            ...(args.parent_id ? { parentId: args.parent_id } : {}),
            body: {
              representation: 'storage',
              value: args.body,
            },
          };
          break;
        }
        case 'search_content': {
          const params = new URLSearchParams({ query: String(args.query), limit: String(args.limit ?? 25) });
          if (args.cursor) params.set('cursor', String(args.cursor));
          url = `${this.baseUrl}/search?${params}`;
          break;
        }
        case 'list_spaces': {
          const params = new URLSearchParams({ limit: String(args.limit ?? 25) });
          if (args.cursor) params.set('cursor', String(args.cursor));
          if (args.type) params.set('type', String(args.type));
          url = `${this.baseUrl}/spaces?${params}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
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
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}
