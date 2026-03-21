/**
 * Box MCP Server
 * Adapter for Box Content API v2.0 — file management, folder navigation, and search
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface BoxConfig {
  access_token: string;
}

export class BoxMCPServer {
  private config: BoxConfig;
  private baseUrl = 'https://api.box.com/2.0';
  private uploadUrl = 'https://upload.box.com/api/2.0';

  constructor(config: BoxConfig) {
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
        name: 'list_folder_items',
        description: "List the items (files and subfolders) inside a Box folder.",
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: "Box folder ID ('0' for root)." },
            limit: { type: 'number', description: 'Maximum number of items to return (max 1000).' },
            offset: { type: 'number', description: 'Offset for pagination.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return.' },
            sort: { type: 'string', enum: ['id', 'name', 'date', 'size'], description: 'Sort field.' },
            direction: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort direction.' },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'get_file_info',
        description: 'Retrieve metadata for a specific Box file by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'The Box file ID.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return.' },
          },
          required: ['file_id'],
        },
      },
      {
        name: 'search_content',
        description: 'Search for files and folders in Box using a full-text query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Full-text search query string.' },
            type: {
              type: 'string',
              enum: ['file', 'folder', 'web_link'],
              description: 'Limit results to a specific content type.',
            },
            limit: { type: 'number', description: 'Maximum number of results to return (max 200).' },
            offset: { type: 'number', description: 'Offset for pagination.' },
            ancestor_folder_ids: {
              type: 'string',
              description: 'Comma-separated folder IDs to restrict search scope.',
            },
            file_extensions: {
              type: 'string',
              description: "Comma-separated file extensions to filter, e.g. 'pdf,docx'.",
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder inside an existing Box folder.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the new folder.' },
            parent_id: { type: 'string', description: "ID of the parent folder ('0' for root)." },
          },
          required: ['name', 'parent_id'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a new file to Box from a URL or base64-encoded content.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filename to use in Box.' },
            parent_id: { type: 'string', description: "Destination folder ID ('0' for root)." },
            content_base64: { type: 'string', description: 'Base64-encoded file content.' },
            content_type: { type: 'string', description: "MIME type of the file, e.g. 'application/pdf'." },
          },
          required: ['name', 'parent_id', 'content_base64'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_folder_items': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          if (args.fields) params.set('fields', args.fields as string);
          if (args.sort) params.set('sort', args.sort as string);
          if (args.direction) params.set('direction', args.direction as string);
          const response = await fetch(`${this.baseUrl}/folders/${args.folder_id}/items?${params}`, {
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

        case 'get_file_info': {
          const params = new URLSearchParams();
          if (args.fields) params.set('fields', args.fields as string);
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

        case 'search_content': {
          const params = new URLSearchParams();
          params.set('query', args.query as string);
          if (args.type) params.set('type', args.type as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          if (args.ancestor_folder_ids) params.set('ancestor_folder_ids', args.ancestor_folder_ids as string);
          if (args.file_extensions) params.set('file_extensions', args.file_extensions as string);
          const response = await fetch(`${this.baseUrl}/search?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_folder': {
          const body = {
            name: args.name,
            parent: { id: args.parent_id },
          };
          const response = await fetch(`${this.baseUrl}/folders`, {
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

        case 'upload_file': {
          const fileBuffer = Buffer.from(args.content_base64 as string, 'base64');
          const boundary = `----BoxUploadBoundary${Date.now()}`;
          const attributesJson = JSON.stringify({ name: args.name, parent: { id: args.parent_id } });
          const attributesPart = `--${boundary}\r\nContent-Disposition: form-data; name="attributes"\r\nContent-Type: application/json\r\n\r\n${attributesJson}\r\n`;
          const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${args.name}"\r\nContent-Type: ${(args.content_type as string) ?? 'application/octet-stream'}\r\n\r\n`;
          const closing = `\r\n--${boundary}--\r\n`;
          const bodyBuffer = Buffer.concat([
            Buffer.from(attributesPart),
            Buffer.from(filePart),
            fileBuffer,
            Buffer.from(closing),
          ]);
          const response = await fetch(`${this.uploadUrl}/files/content`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.config.access_token}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: bodyBuffer,
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
