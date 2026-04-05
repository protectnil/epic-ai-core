/**
 * Notion MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/makenotion/notion-mcp-server — transport: stdio, auth: OAuth2
// Vendor MCP covers: 22 tools (v2.0.0) — pages, databases, data sources, blocks, search, comments,
//   users, file uploads, views. Uses Notion API 2025-09-03 with data_source abstraction for databases.
// Our adapter covers: 15 tools (stable REST API surface using Bearer token for service integrations).
// Recommendation: use-both — MCP exposes 22 tools including data_source/view/file_upload operations
//   not available in our REST adapter. Our REST adapter exposes all 15 stable operations needed for
//   server-side integrations with SSWS internal integration tokens. For full coverage use union.
// Integration: use-both
// MCP-sourced tools (7 unique to MCP): query-data-source, retrieve-a-data-source, update-a-data-source,
//   create-a-data-source, list-data-source-templates, move-page, retrieve-a-database (v2 data_source),
//   list-views, get-view-query-results, create-view-query, list-file-uploads, create-file-upload
// REST-sourced tools (15, all stable API): search, get_page, create_page, update_page,
//   get_block_children, append_block_children, get_block, update_block, delete_block,
//   get_database, query_database, create_database, list_users, get_user, create_comment
// Combined coverage: ~27 tools (MCP: 22 + REST: 15 - shared: ~10)
//
// Base URL: https://api.notion.com/v1
// Auth: Bearer token (Notion Internal Integration Token — starts with "secret_")
// Docs: https://developers.notion.com/reference/intro
// Rate limits: 3 req/s average per integration token (HTTP 429 on breach; respect Retry-After header)
// API Version: 2022-06-28 (stable); 2026-03-11 is the current latest version as of 2026-03-28

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NotionConfig {
  apiKey: string;        // Internal Integration Token (secret_...)
  baseUrl?: string;
  notionVersion?: string;
}

export class NotionMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly notionVersion: string;

  constructor(config: NotionConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.notion.com/v1';
    this.notionVersion = config.notionVersion ?? '2022-06-28';
  }

  static catalog() {
    return {
      name: 'notion',
      displayName: 'Notion',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: ['notion', 'page', 'database', 'block', 'wiki', 'docs', 'notes', 'kanban', 'workspace', 'comment', 'user'],
      toolNames: [
        'search',
        'get_page',
        'create_page',
        'update_page',
        'get_block_children',
        'append_block_children',
        'get_block',
        'update_block',
        'delete_block',
        'get_database',
        'query_database',
        'create_database',
        'list_users',
        'get_user',
        'create_comment',
      ],
      description: 'Notion workspace: search pages and databases, CRUD on pages, blocks, databases, list users, and create comments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search',
        description: 'Search across all Notion pages and databases accessible to the integration with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for in page and database titles',
            },
            filter_type: {
              type: 'string',
              description: 'Limit results to object type: page or database',
            },
            sort_direction: {
              type: 'string',
              description: 'Sort results by last edited time: ascending or descending (default: descending)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results to return per page (default: 10, max: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to retrieve the next page',
            },
          },
        },
      },
      {
        name: 'get_page',
        description: 'Retrieve a Notion page by ID including its properties and metadata; use get_block_children for page content',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Notion page ID (UUID with or without hyphens)',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'create_page',
        description: 'Create a new Notion page as a child of a page or database row with title and optional properties',
        inputSchema: {
          type: 'object',
          properties: {
            parent_page_id: {
              type: 'string',
              description: 'Parent page ID — use this to create a standalone page under another page',
            },
            parent_database_id: {
              type: 'string',
              description: 'Parent database ID — use this to create a database row (requires properties matching the database schema)',
            },
            title: {
              type: 'string',
              description: 'Page title text content',
            },
            properties: {
              type: 'object',
              description: 'Page properties object (required for database rows; overrides title when provided)',
            },
            children: {
              type: 'array',
              description: 'Array of Notion block objects to add as initial page content',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_page',
        description: 'Update properties or archive/unarchive an existing Notion page or database row',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Notion page ID to update',
            },
            properties: {
              type: 'object',
              description: 'Page properties to update (for database rows, use schema-matching property objects)',
            },
            archived: {
              type: 'boolean',
              description: 'Set to true to archive (soft-delete) the page; false to unarchive',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'get_block_children',
        description: 'Retrieve the block children of a Notion page or block, returning the actual content of the page',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
              description: 'Page ID or block ID whose children to retrieve',
            },
            page_size: {
              type: 'number',
              description: 'Number of blocks to return (default: 100, max: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['block_id'],
        },
      },
      {
        name: 'append_block_children',
        description: 'Append new blocks to the end of a Notion page or block; supports all block types (paragraph, heading, bulleted list, code, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
              description: 'Page ID or block ID to append children to',
            },
            children: {
              type: 'array',
              description: 'Array of Notion block objects to append (max 100 per request)',
            },
            after: {
              type: 'string',
              description: 'Block ID after which to insert the new blocks (optional; default: end of parent)',
            },
          },
          required: ['block_id', 'children'],
        },
      },
      {
        name: 'get_block',
        description: 'Retrieve a single Notion block by ID including its type and content',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
              description: 'Notion block ID to retrieve',
            },
          },
          required: ['block_id'],
        },
      },
      {
        name: 'update_block',
        description: 'Update the content of an existing Notion block or archive it',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
              description: 'Notion block ID to update',
            },
            block_content: {
              type: 'object',
              description: 'Block type-specific content object (e.g. { "paragraph": { "rich_text": [...] } })',
            },
            archived: {
              type: 'boolean',
              description: 'Set to true to archive (delete) the block',
            },
          },
          required: ['block_id'],
        },
      },
      {
        name: 'delete_block',
        description: 'Delete (archive) a Notion block by ID — this is reversible via the Notion UI',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
              description: 'Notion block ID to delete',
            },
          },
          required: ['block_id'],
        },
      },
      {
        name: 'get_database',
        description: 'Retrieve a Notion database schema by ID, including all property definitions and types',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: {
              type: 'string',
              description: 'Notion database ID to retrieve schema for',
            },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'query_database',
        description: 'Query rows in a Notion database with optional filter, sort, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: {
              type: 'string',
              description: 'Notion database ID to query',
            },
            filter: {
              type: 'object',
              description: 'Notion filter object to narrow results (e.g. { "property": "Status", "select": { "equals": "Done" } })',
            },
            sorts: {
              type: 'array',
              description: 'Array of sort objects (e.g. [{ "property": "Created", "direction": "descending" }])',
            },
            page_size: {
              type: 'number',
              description: 'Number of rows to return per page (default: 10, max: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'create_database',
        description: 'Create a new Notion database as a child of a page with defined property schema',
        inputSchema: {
          type: 'object',
          properties: {
            parent_page_id: {
              type: 'string',
              description: 'Parent page ID where the database will be created',
            },
            title: {
              type: 'string',
              description: 'Title for the new database',
            },
            properties: {
              type: 'object',
              description: 'Database property schema object defining columns and their types (always includes a "Name" title property)',
            },
          },
          required: ['parent_page_id', 'title', 'properties'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users and bots in the Notion workspace accessible to the integration',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of users to return per page (default: 100, max: 100)',
            },
            start_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve a Notion user by ID including name, email (if available), and type',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Notion user ID to retrieve',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Create a comment on a Notion page or as a reply in an existing comment thread',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Page ID to add the top-level comment to (use this OR discussion_id, not both)',
            },
            discussion_id: {
              type: 'string',
              description: 'Existing discussion thread ID to reply to (use this OR page_id, not both)',
            },
            text: {
              type: 'string',
              description: 'Comment text content',
            },
          },
          required: ['text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search':
          return await this.search(args);
        case 'get_page':
          return await this.getPage(args);
        case 'create_page':
          return await this.createPage(args);
        case 'update_page':
          return await this.updatePage(args);
        case 'get_block_children':
          return await this.getBlockChildren(args);
        case 'append_block_children':
          return await this.appendBlockChildren(args);
        case 'get_block':
          return await this.getBlock(args);
        case 'update_block':
          return await this.updateBlock(args);
        case 'delete_block':
          return await this.deleteBlock(args);
        case 'get_database':
          return await this.getDatabase(args);
        case 'query_database':
          return await this.queryDatabase(args);
        case 'create_database':
          return await this.createDatabase(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'create_comment':
          return await this.createComment(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Notion-Version': this.notionVersion,
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: args.query,
      page_size: (args.page_size as number) ?? 10,
    };
    if (args.filter_type) body.filter = { value: args.filter_type, property: 'object' };
    if (args.sort_direction) body.sort = { direction: args.sort_direction, timestamp: 'last_edited_time' };
    if (args.start_cursor) body.start_cursor = args.start_cursor;
    return this.post('/search', body);
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/pages/${encodeURIComponent(args.page_id as string)}`);
  }

  private async createPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent_page_id && !args.parent_database_id) {
      return {
        content: [{ type: 'text', text: 'create_page requires either parent_page_id or parent_database_id' }],
        isError: true,
      };
    }

    const parent = args.parent_database_id
      ? { database_id: args.parent_database_id }
      : { page_id: args.parent_page_id };

    const properties = args.properties ?? {
      title: { title: [{ text: { content: args.title } }] },
    };

    const body: Record<string, unknown> = { parent, properties };
    if (args.children) body.children = args.children;
    return this.post('/pages', body);
  }

  private async updatePage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.properties) body.properties = args.properties;
    if (args.archived !== undefined) body.archived = args.archived;
    return this.patch(`/pages/${encodeURIComponent(args.page_id as string)}`, body);
  }

  private async getBlockChildren(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page_size', String((args.page_size as number) ?? 100));
    if (args.start_cursor) params.set('start_cursor', String(args.start_cursor));
    return this.get(`/blocks/${encodeURIComponent(args.block_id as string)}/children?${params.toString()}`);
  }

  private async appendBlockChildren(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { children: args.children };
    if (args.after) body.after = args.after;
    return this.patch(`/blocks/${encodeURIComponent(args.block_id as string)}/children`, body);
  }

  private async getBlock(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/blocks/${encodeURIComponent(args.block_id as string)}`);
  }

  private async updateBlock(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.block_content) Object.assign(body, args.block_content);
    if (args.archived !== undefined) body.archived = args.archived;
    return this.patch(`/blocks/${encodeURIComponent(args.block_id as string)}`, body);
  }

  private async deleteBlock(args: Record<string, unknown>): Promise<ToolResult> {
    return this.del(`/blocks/${encodeURIComponent(args.block_id as string)}`);
  }

  private async getDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/databases/${encodeURIComponent(args.database_id as string)}`);
  }

  private async queryDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      page_size: (args.page_size as number) ?? 10,
    };
    if (args.filter) body.filter = args.filter;
    if (args.sorts) body.sorts = args.sorts;
    if (args.start_cursor) body.start_cursor = args.start_cursor;
    return this.post(`/databases/${encodeURIComponent(args.database_id as string)}/query`, body);
  }

  private async createDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      parent: { page_id: args.parent_page_id },
      title: [{ text: { content: args.title } }],
      properties: args.properties,
    };
    return this.post('/databases', body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page_size', String((args.page_size as number) ?? 100));
    if (args.start_cursor) params.set('start_cursor', String(args.start_cursor));
    return this.get(`/users?${params.toString()}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id && !args.discussion_id) {
      return {
        content: [{ type: 'text', text: 'create_comment requires either page_id or discussion_id' }],
        isError: true,
      };
    }

    const body: Record<string, unknown> = {
      rich_text: [{ text: { content: args.text } }],
    };
    if (args.page_id) body.parent = { page_id: args.page_id };
    if (args.discussion_id) body.discussion_id = args.discussion_id;
    return this.post('/comments', body);
  }
}
