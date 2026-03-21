/**
 * Google Drive MCP Server
 * Adapter for Google Drive API v3 — file management, search, and permissions
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface GoogleDriveConfig {
  access_token: string;
}

export class GoogleDriveMCPServer {
  private config: GoogleDriveConfig;
  private baseUrl = 'https://www.googleapis.com/drive/v3';

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_files',
        description: 'List files and folders in Google Drive, optionally filtered by folder.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: "Parent folder ID (default: 'root')." },
            page_size: { type: 'number', description: 'Number of files per page (max 1000).' },
            page_token: { type: 'string', description: 'Token for fetching the next page of results.' },
            order_by: { type: 'string', description: "Sort order, e.g. 'modifiedTime desc'." },
            fields: { type: 'string', description: 'Comma-separated list of file fields to return.' },
          },
          required: [],
        },
      },
      {
        name: 'get_file',
        description: 'Retrieve metadata for a Google Drive file by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'The Google Drive file ID.' },
            fields: { type: 'string', description: 'Comma-separated list of metadata fields to return.' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'create_file',
        description: 'Create a new file or folder in Google Drive (metadata only; no content upload).',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the file or folder.' },
            mime_type: { type: 'string', description: "MIME type, e.g. 'application/vnd.google-apps.folder'." },
            parent_id: { type: 'string', description: 'ID of the parent folder.' },
            description: { type: 'string', description: 'Optional file description.' },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files in Google Drive using a Drive query string.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "Drive query string, e.g. \"name contains 'report' and mimeType='application/pdf'\".",
            },
            page_size: { type: 'number', description: 'Number of results per page (max 1000).' },
            page_token: { type: 'string', description: 'Token for fetching the next page.' },
            fields: { type: 'string', description: 'Comma-separated list of file fields to return.' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_file_permissions',
        description: "List the permissions (sharing settings) on a Google Drive file.",
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'The Google Drive file ID.' },
            fields: { type: 'string', description: 'Comma-separated list of permission fields to return.' },
          },
          required: ['file_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_files': {
          const params = new URLSearchParams();
          const parentId = (args.folder_id as string) ?? 'root';
          params.set('q', `'${parentId}' in parents and trashed = false`);
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.page_token) params.set('pageToken', args.page_token as string);
          if (args.order_by) params.set('orderBy', args.order_by as string);
          params.set('fields', (args.fields as string) ?? 'nextPageToken,files(id,name,mimeType,modifiedTime,size,parents)');
          const response = await fetch(`${this.baseUrl}/files?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_file': {
          const params = new URLSearchParams();
          params.set('fields', (args.fields as string) ?? 'id,name,mimeType,modifiedTime,size,parents,webViewLink,owners');
          const response = await fetch(`${this.baseUrl}/files/${args.file_id}?${params}`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_file': {
          const body: Record<string, unknown> = {
            name: args.name,
            mimeType: args.mime_type ?? 'application/octet-stream',
            description: args.description,
            parents: args.parent_id ? [args.parent_id] : undefined,
          };
          const response = await fetch(`${this.baseUrl}/files`, {
            method: 'POST',
            headers: this.authHeaders,
            body: JSON.stringify(body),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_files': {
          const params = new URLSearchParams();
          params.set('q', args.query as string);
          if (args.page_size) params.set('pageSize', String(args.page_size));
          if (args.page_token) params.set('pageToken', args.page_token as string);
          params.set('fields', (args.fields as string) ?? 'nextPageToken,files(id,name,mimeType,modifiedTime,size,parents)');
          const response = await fetch(`${this.baseUrl}/files?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_file_permissions': {
          const params = new URLSearchParams();
          params.set('fields', (args.fields as string) ?? 'permissions(id,type,role,emailAddress,displayName)');
          const response = await fetch(`${this.baseUrl}/files/${args.file_id}/permissions?${params}`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
}
