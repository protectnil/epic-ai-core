/**
 * Strapi MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Community MCP servers exist (misterboe/strapi-mcp-server, l33tdawg/strapi-mcp) but none are published by Strapi Inc.
// misterboe server last commit Jan 7, 2026 (~10 tools); NOT official — community only.
//
// Base URL: {your-strapi-host}/api  (self-hosted; no fixed domain)
// Auth: Bearer API token in Authorization header — generated in Strapi Admin > Settings > API Tokens
// Docs: https://docs.strapi.io/cms/api/rest | https://docs.strapi.io/cms/api/rest/upload
// Rate limits: Determined by the hosting infrastructure; Strapi itself does not enforce rate limits by default
// Note: Content type names in API paths are plural and kebab-cased (e.g. /api/blog-posts).
//       The baseUrl must include the host and /api prefix (e.g. https://cms.example.com/api).
//       list_content_types uses the Content-Type Builder admin API (/content-type-builder/content-types)
//       which requires admin JWT auth, not an API token. Callers should be aware of this distinction.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StrapiConfig {
  apiToken: string;
  baseUrl: string;
}

export class StrapiMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: StrapiConfig) {
    super();
    this.apiToken = config.apiToken;
    // baseUrl should be the full API root, e.g. https://cms.example.com/api
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'strapi',
      displayName: 'Strapi',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'strapi', 'cms', 'headless cms', 'content', 'content type', 'entries',
        'media', 'upload', 'users', 'roles', 'permissions', 'api', 'rest',
      ],
      toolNames: [
        'list_entries', 'get_entry', 'create_entry', 'update_entry', 'delete_entry',
        'list_content_types', 'search_entries',
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_roles', 'get_role',
        'list_media', 'upload_media',
      ],
      description: 'Strapi headless CMS REST API: manage content entries, media uploads, users, and roles across any content type.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_entries',
        description: 'List entries for a Strapi content type with optional filters, sorting, pagination, and field population',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Plural API ID of the content type (e.g. articles, blog-posts, products)',
            },
            filters: {
              type: 'string',
              description: 'URL-encoded filter query string (e.g. filters[title][$contains]=hello)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. createdAt:desc)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of entries per page (default: 25, max: 100)',
            },
            populate: {
              type: 'string',
              description: 'Fields to populate (e.g. populate=* for all, or populate[0]=author)',
            },
          },
          required: ['content_type'],
        },
      },
      {
        name: 'get_entry',
        description: 'Retrieve a single entry by content type and entry ID with optional field population',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Plural API ID of the content type (e.g. articles)',
            },
            entry_id: {
              type: 'number',
              description: 'Numeric ID of the entry to retrieve',
            },
            populate: {
              type: 'string',
              description: 'Fields to populate (e.g. populate=* for all relations and media)',
            },
          },
          required: ['content_type', 'entry_id'],
        },
      },
      {
        name: 'create_entry',
        description: 'Create a new entry for a Strapi content type by providing field data as a JSON object',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Plural API ID of the content type (e.g. articles)',
            },
            data: {
              type: 'object',
              description: 'Field values for the new entry (e.g. {"title": "Hello", "body": "World"})',
            },
          },
          required: ['content_type', 'data'],
        },
      },
      {
        name: 'update_entry',
        description: 'Update an existing entry in a Strapi content type — only provided fields are updated (partial update)',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Plural API ID of the content type (e.g. articles)',
            },
            entry_id: {
              type: 'number',
              description: 'Numeric ID of the entry to update',
            },
            data: {
              type: 'object',
              description: 'Fields to update (partial update — omitted fields are unchanged)',
            },
          },
          required: ['content_type', 'entry_id', 'data'],
        },
      },
      {
        name: 'delete_entry',
        description: 'Delete an entry from a Strapi content type by content type and entry ID — this is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Plural API ID of the content type',
            },
            entry_id: {
              type: 'number',
              description: 'Numeric ID of the entry to delete',
            },
          },
          required: ['content_type', 'entry_id'],
        },
      },
      {
        name: 'list_content_types',
        description: 'List all content types registered in the Strapi project via the admin API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_entries',
        description: 'Full-text search entries in a content type using a search query across searchable fields',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Plural API ID of the content type to search',
            },
            query: {
              type: 'string',
              description: 'Search term to match against entry fields',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: ['content_type', 'query'],
        },
      },
      {
        name: 'list_users',
        description: 'List registered users in the Strapi Users & Permissions plugin with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'string',
              description: 'URL-encoded filter query string (e.g. filters[email][$contains]=example.com)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. createdAt:desc)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of users per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific Strapi user by user ID including role and profile fields',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric ID of the Strapi user',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user in the Strapi Users & Permissions system with email, username, password, and role',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Unique username for the new user',
            },
            email: {
              type: 'string',
              description: 'Email address for the new user',
            },
            password: {
              type: 'string',
              description: 'Password for the new user',
            },
            role: {
              type: 'number',
              description: 'Role ID to assign (default Authenticated role ID is typically 1)',
            },
            confirmed: {
              type: 'boolean',
              description: 'Whether the user account is confirmed (default: true)',
            },
          },
          required: ['username', 'email', 'password'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing Strapi user profile, email, or role by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric ID of the user to update',
            },
            username: {
              type: 'string',
              description: 'Updated username',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            role: {
              type: 'number',
              description: 'Updated role ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a Strapi user account by user ID — this removes the account permanently',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric ID of the user to delete',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_roles',
        description: 'List all roles configured in the Strapi Users & Permissions plugin with permissions summary',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_role',
        description: 'Get full permissions configuration for a specific Strapi role by role ID',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: {
              type: 'number',
              description: 'Numeric ID of the role to retrieve',
            },
          },
          required: ['role_id'],
        },
      },
      {
        name: 'list_media',
        description: 'List files in the Strapi Media Library with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            mime_type: {
              type: 'string',
              description: 'Filter by MIME type prefix (e.g. image, video, application/pdf)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of files per page (default: 25)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. createdAt:desc)',
            },
          },
        },
      },
      {
        name: 'upload_media',
        description: 'Upload a file to the Strapi Media Library from a publicly accessible URL by fetching and re-uploading it',
        inputSchema: {
          type: 'object',
          properties: {
            file_url: {
              type: 'string',
              description: 'Publicly accessible URL of the file to upload',
            },
            file_name: {
              type: 'string',
              description: 'Filename to use in the Media Library (e.g. banner.png)',
            },
            folder_id: {
              type: 'number',
              description: 'Optional Media Library folder ID to place the file in',
            },
          },
          required: ['file_url', 'file_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_entries': return this.listEntries(args);
        case 'get_entry': return this.getEntry(args);
        case 'create_entry': return this.createEntry(args);
        case 'update_entry': return this.updateEntry(args);
        case 'delete_entry': return this.deleteEntry(args);
        case 'list_content_types': return this.listContentTypes();
        case 'search_entries': return this.searchEntries(args);
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'create_user': return this.createUser(args);
        case 'update_user': return this.updateUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'list_roles': return this.listRoles();
        case 'get_role': return this.getRole(args);
        case 'list_media': return this.listMedia(args);
        case 'upload_media': return this.uploadMedia(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEntries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type) return { content: [{ type: 'text', text: 'content_type is required' }], isError: true };
    const params: Record<string, string> = {
      'pagination[page]': String((args.page as number) || 1),
      'pagination[pageSize]': String((args.page_size as number) || 25),
    };
    if (args.sort) params.sort = args.sort as string;
    if (args.populate) params.populate = args.populate as string;
    // filters is a raw query string fragment (e.g. filters[title][$contains]=hello) — append as-is
    const qs = new URLSearchParams(params).toString();
    const filterStr = args.filters ? `&${args.filters as string}` : '';
    const url = `${this.baseUrl}/${encodeURIComponent(args.content_type as string)}?${qs}${filterStr}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type || args.entry_id === undefined) return { content: [{ type: 'text', text: 'content_type and entry_id are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.populate) params.populate = args.populate as string;
    return this.apiGet(`/${encodeURIComponent(args.content_type as string)}/${encodeURIComponent(args.entry_id as string)}`, params);
  }

  private async createEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type || !args.data) return { content: [{ type: 'text', text: 'content_type and data are required' }], isError: true };
    return this.apiPost(`/${encodeURIComponent(args.content_type as string)}`, { data: args.data });
  }

  private async updateEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type || args.entry_id === undefined || !args.data) {
      return { content: [{ type: 'text', text: 'content_type, entry_id, and data are required' }], isError: true };
    }
    return this.apiPut(`/${encodeURIComponent(args.content_type as string)}/${encodeURIComponent(args.entry_id as string)}`, { data: args.data });
  }

  private async deleteEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type || args.entry_id === undefined) return { content: [{ type: 'text', text: 'content_type and entry_id are required' }], isError: true };
    return this.apiDelete(`/${encodeURIComponent(args.content_type as string)}/${encodeURIComponent(args.entry_id as string)}`);
  }

  private async listContentTypes(): Promise<ToolResult> {
    return this.apiGet('/content-type-builder/content-types');
  }

  private async searchEntries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.content_type || !args.query) return { content: [{ type: 'text', text: 'content_type and query are required' }], isError: true };
    const params: Record<string, string> = {
      '_q': args.query as string,
      'pagination[page]': String((args.page as number) || 1),
      'pagination[pageSize]': String((args.page_size as number) || 25),
    };
    return this.apiGet(`/${encodeURIComponent(args.content_type as string)}`, params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'pagination[page]': String((args.page as number) || 1),
      'pagination[pageSize]': String((args.page_size as number) || 25),
    };
    if (args.sort) params.sort = args.sort as string;
    const qs = new URLSearchParams(params).toString();
    const filterStr = args.filters ? `&${args.filters as string}` : '';
    const url = `${this.baseUrl}/users?${qs}${filterStr}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.user_id === undefined) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.email || !args.password) return { content: [{ type: 'text', text: 'username, email, and password are required' }], isError: true };
    const body: Record<string, unknown> = {
      username: args.username,
      email: args.email,
      password: args.password,
      confirmed: typeof args.confirmed === 'boolean' ? args.confirmed : true,
    };
    if (args.role !== undefined) body.role = args.role;
    return this.apiPost('/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.user_id === undefined) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.username) body.username = args.username;
    if (args.email) body.email = args.email;
    if (args.role !== undefined) body.role = args.role;
    return this.apiPut(`/users/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.user_id === undefined) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiDelete(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listRoles(): Promise<ToolResult> {
    return this.apiGet('/users-permissions/roles');
  }

  private async getRole(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.role_id === undefined) return { content: [{ type: 'text', text: 'role_id is required' }], isError: true };
    return this.apiGet(`/users-permissions/roles/${encodeURIComponent(args.role_id as string)}`);
  }

  private async listMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'pagination[page]': String((args.page as number) || 1),
      'pagination[pageSize]': String((args.page_size as number) || 25),
    };
    if (args.sort) params.sort = args.sort as string;
    if (args.mime_type) params['filters[mime][$contains]'] = args.mime_type as string;
    return this.apiGet('/upload/files', params);
  }

  private async uploadMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_url || !args.file_name) return { content: [{ type: 'text', text: 'file_url and file_name are required' }], isError: true };
    // Fetch the file from the remote URL
    const fileResponse = await this.fetchWithRetry(args.file_url as string, {});
    if (!fileResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch file from URL: ${fileResponse.status}` }], isError: true };
    }
    const fileBuffer = await fileResponse.arrayBuffer();
    const mimeType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    const formData = new FormData();
    formData.append('files', new Blob([fileBuffer], { type: mimeType }), args.file_name as string);
    if (args.folder_id !== undefined) {
      formData.append('path', String(args.folder_id));
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiToken}` },
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Upload error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
