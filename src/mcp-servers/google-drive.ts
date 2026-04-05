/**
 * Google Drive MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Google-maintained MCP server for Google Drive was found on GitHub.
// Community implementations exist but are not officially supported.
//
// Base URL: https://www.googleapis.com/drive/v3
// Auth: OAuth2 Bearer token (access_token via Google OAuth2 flow)
// Docs: https://developers.google.com/workspace/drive/api/reference/rest/v3
// Rate limits: 20,000 queries/100 seconds per user; 1,000,000,000 queries/day per project

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleDriveConfig {
  accessToken: string;
  baseUrl?: string;
}

export class GoogleDriveMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: GoogleDriveConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://www.googleapis.com/drive/v3';
  }

  static catalog() {
    return {
      name: 'google-drive',
      displayName: 'Google Drive',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['google', 'drive', 'gdrive', 'files', 'folders', 'documents', 'storage', 'permissions', 'sharing', 'revisions'],
      toolNames: [
        'list_files', 'get_file', 'search_files', 'create_file', 'update_file',
        'copy_file', 'delete_file', 'export_file',
        'list_permissions', 'create_permission', 'delete_permission',
        'list_revisions', 'get_revision',
      ],
      description: 'Manage Google Drive files, folders, permissions, and revisions. List, search, create, update, copy, delete files and control sharing.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_files',
        description: 'List files and folders in Google Drive, optionally filtered by parent folder, MIME type, or Drive query string.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'string',
              description: "Parent folder ID to list contents of (default: 'root' — the user's My Drive root).",
            },
            page_size: {
              type: 'number',
              description: 'Number of files per page (default: 50, max: 1000).',
            },
            page_token: {
              type: 'string',
              description: 'Token for fetching the next page of results from a previous list_files call.',
            },
            order_by: {
              type: 'string',
              description: "Sort order expression, e.g. 'modifiedTime desc', 'name', 'createdTime'.",
            },
            fields: {
              type: 'string',
              description: "Comma-separated file fields to return (default: id,name,mimeType,modifiedTime,size,parents,webViewLink).",
            },
          },
        },
      },
      {
        name: 'get_file',
        description: 'Retrieve metadata for a specific Google Drive file or folder by its file ID.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metadata fields to return (default: id,name,mimeType,modifiedTime,size,parents,webViewLink,owners,shared).',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'search_files',
        description: 'Search Google Drive using Drive query syntax. Supports full-text search, MIME type filters, owner filters, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "Drive query string, e.g. \"name contains 'budget' and mimeType='application/pdf' and trashed=false\".",
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 50, max: 1000).',
            },
            page_token: {
              type: 'string',
              description: 'Token for fetching the next page of results.',
            },
            order_by: {
              type: 'string',
              description: "Sort order, e.g. 'modifiedTime desc'.",
            },
            fields: {
              type: 'string',
              description: 'Comma-separated file fields to return.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_file',
        description: 'Create a new file or folder in Google Drive (metadata only; use upload API for file content).',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new file or folder.',
            },
            mime_type: {
              type: 'string',
              description: "MIME type of the file (e.g. 'application/vnd.google-apps.folder' for folders, 'application/vnd.google-apps.document' for Docs).",
            },
            parent_id: {
              type: 'string',
              description: 'ID of the parent folder (default: root).',
            },
            description: {
              type: 'string',
              description: 'Optional description for the file.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_file',
        description: 'Update the metadata of an existing Google Drive file, such as name, description, or parent folder (move).',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the file.',
            },
            description: {
              type: 'string',
              description: 'New description for the file.',
            },
            add_parents: {
              type: 'string',
              description: 'Comma-separated list of parent folder IDs to add (use with remove_parents to move a file).',
            },
            remove_parents: {
              type: 'string',
              description: 'Comma-separated list of parent folder IDs to remove (use with add_parents to move a file).',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'copy_file',
        description: 'Create a copy of an existing Google Drive file, optionally into a different folder with a new name.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID to copy.',
            },
            name: {
              type: 'string',
              description: "Name for the copy (default: 'Copy of {original name}').",
            },
            parent_id: {
              type: 'string',
              description: 'ID of the destination folder for the copy.',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'delete_file',
        description: 'Permanently delete a Google Drive file or folder by ID. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID to delete permanently.',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'export_file',
        description: 'Export a Google Workspace document (Docs, Sheets, Slides) to a different MIME type and return the content as text.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID of the Workspace document to export.',
            },
            mime_type: {
              type: 'string',
              description: "Export MIME type (default: 'text/plain'). Also supports 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'.",
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'list_permissions',
        description: 'List the sharing permissions on a Google Drive file or folder, showing who has access and at what role.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID.',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of permissions to return per page (default: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Token for fetching the next page of permissions.',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'create_permission',
        description: 'Grant access to a Google Drive file or folder by creating a new permission for a user, group, domain, or anyone.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID to share.',
            },
            role: {
              type: 'string',
              description: "Access role to grant: 'reader', 'commenter', 'writer', 'fileOrganizer', 'organizer', 'owner'.",
            },
            type: {
              type: 'string',
              description: "Permission type: 'user', 'group', 'domain', 'anyone'.",
            },
            email_address: {
              type: 'string',
              description: "Email address of the user or group (required when type is 'user' or 'group').",
            },
            domain: {
              type: 'string',
              description: "Domain name (required when type is 'domain').",
            },
            send_notification_email: {
              type: 'boolean',
              description: 'Whether to send a notification email to the new permission holder (default: true).',
            },
          },
          required: ['file_id', 'role', 'type'],
        },
      },
      {
        name: 'delete_permission',
        description: 'Revoke a specific permission from a Google Drive file or folder, removing that user/group/domain access.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID.',
            },
            permission_id: {
              type: 'string',
              description: 'The permission ID to revoke.',
            },
          },
          required: ['file_id', 'permission_id'],
        },
      },
      {
        name: 'list_revisions',
        description: 'List the revision history of a Google Drive file, showing previous versions and their timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID.',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of revisions to return per page (default: 200).',
            },
            page_token: {
              type: 'string',
              description: 'Token for fetching the next page of revisions.',
            },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'get_revision',
        description: 'Get metadata for a specific revision of a Google Drive file by file ID and revision ID.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID.',
            },
            revision_id: {
              type: 'string',
              description: 'The revision ID to retrieve.',
            },
          },
          required: ['file_id', 'revision_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_files':
          return await this.listFiles(args);
        case 'get_file':
          return await this.getFile(args);
        case 'search_files':
          return await this.searchFiles(args);
        case 'create_file':
          return await this.createFile(args);
        case 'update_file':
          return await this.updateFile(args);
        case 'copy_file':
          return await this.copyFile(args);
        case 'delete_file':
          return await this.deleteFile(args);
        case 'export_file':
          return await this.exportFile(args);
        case 'list_permissions':
          return await this.listPermissions(args);
        case 'create_permission':
          return await this.createPermission(args);
        case 'delete_permission':
          return await this.deletePermission(args);
        case 'list_revisions':
          return await this.listRevisions(args);
        case 'get_revision':
          return await this.getRevision(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async listFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const parentId = (args.folder_id as string) ?? 'root';
    params.set('q', `'${parentId}' in parents and trashed = false`);
    params.set('pageSize', String((args.page_size as number) ?? 50));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.order_by) params.set('orderBy', args.order_by as string);
    params.set('fields', (args.fields as string) ?? 'nextPageToken,files(id,name,mimeType,modifiedTime,size,parents,webViewLink)');

    const response = await this.fetchWithRetry(`${this.baseUrl}/files?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('fields', (args.fields as string) ?? 'id,name,mimeType,modifiedTime,size,parents,webViewLink,owners,shared');

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}?${params}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('q', args.query as string);
    params.set('pageSize', String((args.page_size as number) ?? 50));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.order_by) params.set('orderBy', args.order_by as string);
    params.set('fields', (args.fields as string) ?? 'nextPageToken,files(id,name,mimeType,modifiedTime,size,parents,webViewLink)');

    const response = await this.fetchWithRetry(`${this.baseUrl}/files?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createFile(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      mimeType: args.mime_type ?? 'application/octet-stream',
    };
    if (args.description) body.description = args.description;
    if (args.parent_id) body.parents = [args.parent_id];

    const response = await this.fetchWithRetry(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async updateFile(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description !== undefined) body.description = args.description;

    const params = new URLSearchParams();
    if (args.add_parents) params.set('addParents', args.add_parents as string);
    if (args.remove_parents) params.set('removeParents', args.remove_parents as string);
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}${qs}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async copyFile(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.parent_id) body.parents = [args.parent_id];

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/copy`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, file_id: args.file_id }) }], isError: false };
  }

  private async exportFile(args: Record<string, unknown>): Promise<ToolResult> {
    const mimeType = (args.mime_type as string) ?? 'text/plain';
    const params = new URLSearchParams({ mimeType });

    const response = await this.fetchWithRetry(`${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/export?${params}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async listPermissions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('fields', 'nextPageToken,permissions(id,type,role,emailAddress,displayName,domain,deleted)');
    params.set('pageSize', String((args.page_size as number) ?? 100));
    if (args.page_token) params.set('pageToken', args.page_token as string);

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/permissions?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createPermission(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      role: args.role,
      type: args.type,
    };
    if (args.email_address) body.emailAddress = args.email_address;
    if (args.domain) body.domain = args.domain;

    const params = new URLSearchParams();
    params.set('sendNotificationEmail', String(args.send_notification_email ?? true));
    params.set('fields', 'id,type,role,emailAddress,displayName');

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/permissions?${params}`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deletePermission(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/permissions/${encodeURIComponent(args.permission_id as string)}`,
      {
        method: 'DELETE',
        headers: this.authHeaders,
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, permission_id: args.permission_id }) }], isError: false };
  }

  private async listRevisions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('fields', 'nextPageToken,revisions(id,modifiedTime,keepForever,size,lastModifyingUser)');
    params.set('pageSize', String((args.page_size as number) ?? 200));
    if (args.page_token) params.set('pageToken', args.page_token as string);

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/revisions?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getRevision(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/files/${encodeURIComponent(args.file_id as string)}/revisions/${encodeURIComponent(args.revision_id as string)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
