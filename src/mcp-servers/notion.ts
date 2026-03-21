/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class NotionMCPServer {
  private baseUrl = 'https://api.notion.com/v1';
  private notionVersion = '2022-06-28';

  constructor(private config: { api_key: string }) {}

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search',
        description: 'Search Notion pages and databases',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query text' },
            filter_type: { type: 'string', enum: ['page', 'database'], description: 'Filter by object type' },
            page_size: { type: 'number', description: 'Number of results to return', default: 10 },
            start_cursor: { type: 'string', description: 'Pagination cursor' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_page',
        description: 'Get a Notion page by ID',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: { type: 'string', description: 'The page ID' },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'create_page',
        description: 'Create a new Notion page',
        inputSchema: {
          type: 'object',
          properties: {
            parent_page_id: { type: 'string', description: 'Parent page ID' },
            parent_database_id: { type: 'string', description: 'Parent database ID' },
            title: { type: 'string', description: 'Page title' },
            properties: { type: 'object', description: 'Page properties (for database pages)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'query_database',
        description: 'Query a Notion database',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: { type: 'string', description: 'The database ID' },
            filter: { type: 'object', description: 'Filter object' },
            sorts: { type: 'array', items: { type: 'object' }, description: 'Sort criteria' },
            page_size: { type: 'number', description: 'Number of results', default: 10 },
            start_cursor: { type: 'string', description: 'Pagination cursor' },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'get_database',
        description: 'Get a Notion database by ID',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: { type: 'string', description: 'The database ID' },
          },
          required: ['database_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;
      let method = 'GET';
      let body: unknown;

      const headers = {
        Authorization: `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Notion-Version': this.notionVersion,
      };

      switch (name) {
        case 'search': {
          url = `${this.baseUrl}/search`;
          method = 'POST';
          body = {
            query: args.query,
            page_size: args.page_size ?? 10,
            ...(args.filter_type ? { filter: { value: args.filter_type, property: 'object' } } : {}),
            ...(args.start_cursor ? { start_cursor: args.start_cursor } : {}),
          };
          break;
        }
        case 'get_page': {
          url = `${this.baseUrl}/pages/${args.page_id}`;
          break;
        }
        case 'create_page': {
          url = `${this.baseUrl}/pages`;
          method = 'POST';
          const parent = args.parent_database_id
            ? { database_id: args.parent_database_id }
            : { page_id: args.parent_page_id };
          body = {
            parent,
            properties: args.properties ?? {
              title: { title: [{ text: { content: args.title } }] },
            },
          };
          break;
        }
        case 'query_database': {
          url = `${this.baseUrl}/databases/${args.database_id}/query`;
          method = 'POST';
          body = {
            page_size: args.page_size ?? 10,
            ...(args.filter ? { filter: args.filter } : {}),
            ...(args.sorts ? { sorts: args.sorts } : {}),
            ...(args.start_cursor ? { start_cursor: args.start_cursor } : {}),
          };
          break;
        }
        case 'get_database': {
          url = `${this.baseUrl}/databases/${args.database_id}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, {
        method,
        headers,
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
