/**
 * Egnyte MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/egnyte/egnyte-mcp-server — transport: stdio, auth: OAuth2
// Our adapter covers: 20 tools (full CRUD for files, folders, links, users, groups).
// Vendor MCP covers: 1 tool only (search_for_document_by_name). Fails the 10+ tools criterion.
// Recommendation: use-rest-api — vendor MCP is too limited (1 tool); our REST adapter is authoritative.
//                 MCP documented here per protocol; do NOT use vendor MCP as primary integration.
//
// Base URL: https://{domain}.egnyte.com (customer-specific subdomain; no shared base URL)
//           Set config.baseUrl to e.g. https://mycompany.egnyte.com
// Auth: OAuth2 — Bearer access token in Authorization header.
//       Obtain via /puboauth/token with client_credentials or authorization_code grant.
// Docs: https://developers.egnyte.com/api-docs/read/getting-started
//       https://developers.egnyte.com/api-docs/read/Public_API_Authentication
// Rate limits: Enforced per access token. Varies by plan. Token endpoint: 100 req/hr (public app)
//              or 10 calls/user/hr (internal). File API: plan-dependent daily and per-second limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EgnyteConfig {
  accessToken: string;
  baseUrl: string; // e.g. https://mycompany.egnyte.com — required, no default
}

export class EgnyteMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: EgnyteConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'egnyte',
      displayName: 'Egnyte',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'egnyte', 'content governance', 'enterprise file', 'file management', 'folder',
        'document management', 'ecm', 'cloud storage', 'permissions', 'link sharing',
        'audit', 'compliance', 'data governance', 'user management', 'group',
      ],
      toolNames: [
        'list_folder', 'get_file_info', 'upload_file', 'download_file', 'delete_file',
        'create_folder', 'delete_folder', 'move_file', 'copy_file', 'search_files',
        'create_link', 'list_links', 'delete_link',
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_groups', 'get_group',
      ],
      description: 'Egnyte enterprise content governance: manage files, folders, sharing links, users, groups, and folder permissions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_folder',
        description: 'List the contents of an Egnyte folder including files and subfolders with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute path to the folder in Egnyte e.g. /Shared/Finance or / for root',
            },
            count: {
              type: 'number',
              description: 'Number of items to return per page (default: 100, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            list_custom_metadata: {
              type: 'boolean',
              description: 'Include custom metadata fields in the response (default: false)',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'get_file_info',
        description: 'Retrieve metadata for a specific file including size, checksum, versions, and custom metadata',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Full path to the file in Egnyte e.g. /Shared/Finance/Q1-Report.pdf',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a file to a specified Egnyte path with optional overwrite control',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Destination path in Egnyte including filename e.g. /Shared/Docs/report.pdf',
            },
            content: {
              type: 'string',
              description: 'Base64-encoded file content to upload',
            },
            content_type: {
              type: 'string',
              description: 'MIME type of the file e.g. application/pdf, text/csv (default: application/octet-stream)',
            },
            overwrite: {
              type: 'boolean',
              description: 'Overwrite if file already exists (default: true)',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'download_file',
        description: 'Download a file from Egnyte by path; returns base64-encoded content',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Full path to the file in Egnyte e.g. /Shared/Finance/report.xlsx',
            },
            entry_id: {
              type: 'string',
              description: 'Specific version entry ID to download a prior version (optional)',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file from Egnyte by path (moves to trash; does not permanently delete)',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Full path to the file to delete e.g. /Shared/Finance/old-report.pdf',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder at the specified path in Egnyte',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Full path of the new folder to create e.g. /Shared/Projects/NewProject',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'delete_folder',
        description: 'Delete a folder and all its contents from Egnyte (moves to trash)',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Full path to the folder to delete e.g. /Shared/Archive/2020',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'move_file',
        description: 'Move or rename a file or folder within Egnyte to a new destination path',
        inputSchema: {
          type: 'object',
          properties: {
            source_path: {
              type: 'string',
              description: 'Current full path of the file or folder to move',
            },
            destination_path: {
              type: 'string',
              description: 'New full destination path (including new name if renaming)',
            },
          },
          required: ['source_path', 'destination_path'],
        },
      },
      {
        name: 'copy_file',
        description: 'Copy a file or folder to a new destination path within Egnyte',
        inputSchema: {
          type: 'object',
          properties: {
            source_path: {
              type: 'string',
              description: 'Full path of the source file or folder',
            },
            destination_path: {
              type: 'string',
              description: 'Full destination path for the copy',
            },
          },
          required: ['source_path', 'destination_path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files and folders across the Egnyte domain by name or content query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string — matches filename, folder name, or full-text content',
            },
            folder: {
              type: 'string',
              description: 'Restrict search to a specific folder path (default: entire domain)',
            },
            type: {
              type: 'string',
              description: 'Filter by type: file, folder (default: both)',
            },
            count: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_link',
        description: 'Create a shared link for a file or folder with configurable access level and expiry',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file or folder to create a link for',
            },
            type: {
              type: 'string',
              description: 'Link type: file or folder',
            },
            accessibility: {
              type: 'string',
              description: 'Access level: anyone (public), password (password protected), domain (domain users), recipients (specific users)',
            },
            expiry_date: {
              type: 'string',
              description: 'Link expiry date in YYYY-MM-DD format (optional; link does not expire if omitted)',
            },
            send_email: {
              type: 'boolean',
              description: 'Send email invitation to recipients (default: false)',
            },
            recipients: {
              type: 'string',
              description: 'Comma-separated list of email addresses to share with (required when accessibility is recipients)',
            },
            notify_on_view: {
              type: 'boolean',
              description: 'Notify owner when link is accessed (default: false)',
            },
          },
          required: ['path', 'type', 'accessibility'],
        },
      },
      {
        name: 'list_links',
        description: 'List sharing links in the Egnyte domain with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Filter links pointing to this file or folder path',
            },
            username: {
              type: 'string',
              description: 'Filter links created by a specific username',
            },
            created_before: {
              type: 'string',
              description: 'Return links created before this date in YYYY-MM-DD format',
            },
            created_after: {
              type: 'string',
              description: 'Return links created after this date in YYYY-MM-DD format',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'delete_link',
        description: 'Delete a sharing link by its link ID to revoke access',
        inputSchema: {
          type: 'object',
          properties: {
            link_id: {
              type: 'string',
              description: 'Link ID to delete (from the id field in list_links or create_link)',
            },
          },
          required: ['link_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Egnyte domain with optional filters for status and role',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: active, inactive (default: active)',
            },
            usertype: {
              type: 'string',
              description: 'Filter by user type: admin, power, standard, external',
            },
            count: {
              type: 'number',
              description: 'Number of users per page (default: 100)',
            },
            startIndex: {
              type: 'number',
              description: 'SCIM-style start index for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve profile and role details for an Egnyte user by username or user ID',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Egnyte username to retrieve — provide username or user_id',
            },
            user_id: {
              type: 'number',
              description: 'Numeric Egnyte user ID — provide user_id or username',
            },
          },
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user in the Egnyte domain with specified role and folder access',
        inputSchema: {
          type: 'object',
          properties: {
            userName: {
              type: 'string',
              description: 'Username for the new user (must be unique in the domain)',
            },
            externalId: {
              type: 'string',
              description: 'External system identifier for the user',
            },
            email: {
              type: 'string',
              description: 'Email address for the new user',
            },
            name_formatted: {
              type: 'string',
              description: 'Full display name e.g. John Smith',
            },
            usertype: {
              type: 'string',
              description: 'User type: admin, power, standard, external (default: standard)',
            },
            active: {
              type: 'boolean',
              description: 'Activate the user on creation (default: true)',
            },
          },
          required: ['userName', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update user profile fields, status, or role for an existing Egnyte user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric Egnyte user ID to update',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            name_formatted: {
              type: 'string',
              description: 'New display name',
            },
            usertype: {
              type: 'string',
              description: 'New user type: admin, power, standard, external',
            },
            active: {
              type: 'boolean',
              description: 'Set active status: true to activate, false to deactivate',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user from the Egnyte domain by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric Egnyte user ID to delete',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List groups in the Egnyte domain with member counts',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of groups per page (default: 100)',
            },
            startIndex: {
              type: 'number',
              description: 'SCIM-style start index for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details and membership list for an Egnyte group by group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Egnyte group ID to retrieve',
            },
          },
          required: ['group_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_folder': return this.listFolder(args);
        case 'get_file_info': return this.getFileInfo(args);
        case 'upload_file': return this.uploadFile(args);
        case 'download_file': return this.downloadFile(args);
        case 'delete_file': return this.deleteFile(args);
        case 'create_folder': return this.createFolder(args);
        case 'delete_folder': return this.deleteFolder(args);
        case 'move_file': return this.moveFile(args);
        case 'copy_file': return this.copyFile(args);
        case 'search_files': return this.searchFiles(args);
        case 'create_link': return this.createLink(args);
        case 'list_links': return this.listLinks(args);
        case 'delete_link': return this.deleteLink(args);
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'create_user': return this.createUser(args);
        case 'update_user': return this.updateUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'list_groups': return this.listGroups(args);
        case 'get_group': return this.getGroup(args);
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
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async egGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async egPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async egPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async egDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }


  private fsPath(path: string): string {
    // Egnyte FS API: metadata/list/delete/move/copy/create-folder uses /pubapi/v1/fs/{path}
    const clean = path.replace(/^\//, '');
    return `/pubapi/v1/fs/${clean}`;
  }

  private fsContentPath(path: string): string {
    // Egnyte FS API: file upload and download use /pubapi/v1/fs-content/{path}
    const clean = path.replace(/^\//, '');
    return `/pubapi/v1/fs-content/${clean}`;
  }

  private async listFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params: Record<string, string> = {
      count: String((args.count as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.list_custom_metadata) params.list_custom_metadata = 'true';
    return this.egGet(this.fsPath(args.path as string), params);
  }

  private async getFileInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    return this.egGet(this.fsPath(args.path as string));
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.content) return { content: [{ type: 'text', text: 'path and content are required' }], isError: true };
    const contentType = (args.content_type as string) || 'application/octet-stream';
    let fileBytes: Uint8Array;
    try {
      const b64 = args.content as string;
      const binaryStr = atob(b64);
      fileBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) { fileBytes[i] = binaryStr.charCodeAt(i); }
    } catch {
      return { content: [{ type: 'text', text: 'content must be base64-encoded' }], isError: true };
    }
    const overwrite = args.overwrite !== false;
    const path = this.fsContentPath(args.path as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${overwrite ? '' : '?x-egnyte-conflict=fail'}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': contentType,
      },
      body: fileBytes,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async downloadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.entry_id) params.entry_id = args.entry_id as string;
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${this.fsContentPath(args.path as string)}${qs}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binaryStr = '';
    for (const byte of bytes) { binaryStr += String.fromCharCode(byte); }
    const b64 = btoa(binaryStr);
    return { content: [{ type: 'text', text: JSON.stringify({ base64_content: b64, size_bytes: bytes.length }) }], isError: false };
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    return this.egDelete(this.fsPath(args.path as string));
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}${this.fsPath(args.path as string)}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'add_folder' }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, path: args.path }) }], isError: false };
  }

  private async deleteFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    return this.egDelete(this.fsPath(args.path as string));
  }

  private async moveFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_path || !args.destination_path) {
      return { content: [{ type: 'text', text: 'source_path and destination_path are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${this.fsPath(args.source_path as string)}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'move', destination: args.destination_path }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, destination: args.destination_path }) }], isError: false };
  }

  private async copyFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_path || !args.destination_path) {
      return { content: [{ type: 'text', text: 'source_path and destination_path are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${this.fsPath(args.source_path as string)}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action: 'copy', destination: args.destination_path }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, destination: args.destination_path }) }], isError: false };
  }

  private async searchFiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      count: String((args.count as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.folder) params.folder = args.folder as string;
    if (args.type) params.type = args.type as string;
    return this.egGet('/pubapi/v1/search', params);
  }

  private async createLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path || !args.type || !args.accessibility) {
      return { content: [{ type: 'text', text: 'path, type, and accessibility are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      path: args.path,
      type: args.type,
      accessibility: args.accessibility,
    };
    if (args.expiry_date) body.expiry_date = args.expiry_date;
    if (typeof args.send_email === 'boolean') body.send_email = args.send_email;
    if (args.recipients) body.recipients = (args.recipients as string).split(',').map(r => r.trim());
    if (typeof args.notify_on_view === 'boolean') body.notify_on_view = args.notify_on_view;
    return this.egPost('/pubapi/v1/links', body);
  }

  private async listLinks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) ?? 25),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.path) params.path = args.path as string;
    if (args.username) params.username = args.username as string;
    if (args.created_before) params.created_before = args.created_before as string;
    if (args.created_after) params.created_after = args.created_after as string;
    return this.egGet('/pubapi/v1/links', params);
  }

  private async deleteLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.link_id) return { content: [{ type: 'text', text: 'link_id is required' }], isError: true };
    return this.egDelete(`/pubapi/v1/links/${encodeURIComponent(args.link_id as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) ?? 100),
      startIndex: String((args.startIndex as number) ?? 1),
    };
    if (args.status) params.status = args.status as string;
    if (args.usertype) params.usertype = args.usertype as string;
    return this.egGet('/pubapi/v2/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.user_id) {
      return this.egGet(`/pubapi/v2/users/${encodeURIComponent(String(args.user_id))}`);
    }
    if (args.username) {
      return this.egGet('/pubapi/v2/users', { usernameFilter: args.username as string });
    }
    return { content: [{ type: 'text', text: 'username or user_id is required' }], isError: true };
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userName || !args.email) return { content: [{ type: 'text', text: 'userName and email are required' }], isError: true };
    const body: Record<string, unknown> = {
      userName: args.userName,
      email: args.email,
      active: args.active !== false,
      usertype: (args.usertype as string) || 'standard',
    };
    if (args.externalId) body.externalId = args.externalId;
    if (args.name_formatted) body.name = { formatted: args.name_formatted };
    return this.egPost('/pubapi/v2/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.email) body.email = args.email;
    if (args.name_formatted) body.name = { formatted: args.name_formatted };
    if (args.usertype) body.usertype = args.usertype;
    if (typeof args.active === 'boolean') body.active = args.active;
    return this.egPatch(`/pubapi/v2/users/${encodeURIComponent(String(args.user_id))}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.egDelete(`/pubapi/v2/users/${encodeURIComponent(String(args.user_id))}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) ?? 100),
      startIndex: String((args.startIndex as number) ?? 1),
    };
    return this.egGet('/pubapi/v2/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.egGet(`/pubapi/v2/groups/${encodeURIComponent(args.group_id as string)}`);
  }
}
