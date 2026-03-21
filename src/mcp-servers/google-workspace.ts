/**
 * Google Workspace MCP Server
 * Google Drive, Docs, and Sheets API adapter for file and document management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface GoogleWorkspaceConfig {
  accessToken: string;
}

export class GoogleWorkspaceMCPServer {
  private readonly baseUrl = 'https://www.googleapis.com';
  private readonly headers: Record<string, string>;

  constructor(config: GoogleWorkspaceConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_files',
        description: 'List files and folders in Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of files to return (default: 20)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
            orderBy: {
              type: 'string',
              description: 'Sort order (e.g., "modifiedTime desc", "name")',
            },
            q: {
              type: 'string',
              description: 'Drive query string filter (e.g., "mimeType=\'application/pdf\'")',
            },
          },
        },
      },
      {
        name: 'get_file',
        description: 'Get metadata for a specific Google Drive file',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'The Google Drive file ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: "id,name,mimeType,size,modifiedTime,webViewLink")',
            },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new Google Docs document',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Document title',
            },
            content: {
              type: 'string',
              description: 'Initial text content for the document body',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_spreadsheet_values',
        description: 'Read cell values from a Google Sheets spreadsheet',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheetId: {
              type: 'string',
              description: 'The Google Sheets spreadsheet ID',
            },
            range: {
              type: 'string',
              description: 'A1 notation range to read (e.g., "Sheet1!A1:D10")',
            },
            majorDimension: {
              type: 'string',
              description: 'Primary dimension: ROWS or COLUMNS (default: ROWS)',
            },
          },
          required: ['spreadsheetId', 'range'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files in Google Drive using Drive query syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Drive search query (e.g., "fullText contains \'budget\' and mimeType=\'application/vnd.google-apps.spreadsheet\'")',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results to return (default: 20)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_files':
          return await this.listFiles(
            args.pageSize as number | undefined,
            args.pageToken as string | undefined,
            args.orderBy as string | undefined,
            args.q as string | undefined
          );
        case 'get_file':
          return await this.getFile(
            args.fileId as string,
            args.fields as string | undefined
          );
        case 'create_document':
          return await this.createDocument(
            args.title as string,
            args.content as string | undefined
          );
        case 'get_spreadsheet_values':
          return await this.getSpreadsheetValues(
            args.spreadsheetId as string,
            args.range as string,
            args.majorDimension as string | undefined
          );
        case 'search_files':
          return await this.searchFiles(
            args.query as string,
            args.pageSize as number | undefined,
            args.pageToken as string | undefined
          );
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listFiles(
    pageSize?: number,
    pageToken?: string,
    orderBy?: string,
    q?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('pageSize', String(pageSize ?? 20));
    params.append('fields', 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)');
    if (pageToken) params.append('pageToken', pageToken);
    if (orderBy) params.append('orderBy', orderBy);
    if (q) params.append('q', q);

    const response = await fetch(
      `${this.baseUrl}/drive/v3/files?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Drive returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getFile(fileId: string, fields?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('fields', fields ?? 'id,name,mimeType,size,modifiedTime,webViewLink,owners,permissions');

    const response = await fetch(
      `${this.baseUrl}/drive/v3/files/${fileId}?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Drive returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createDocument(title: string, content?: string): Promise<ToolResult> {
    const createResponse = await fetch(
      `${this.baseUrl}/docs/v1/documents`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ title }),
      }
    );
    if (!createResponse.ok) throw new Error(`Google Docs API error: ${createResponse.status} ${createResponse.statusText}`);
    let doc: Record<string, unknown>;
    try { doc = await createResponse.json() as Record<string, unknown>; } catch { throw new Error(`Google Docs returned non-JSON response (HTTP ${createResponse.status})`); }

    if (content && doc.documentId) {
      const batchResponse = await fetch(
        `${this.baseUrl}/docs/v1/documents/${doc.documentId}:batchUpdate`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            requests: [{ insertText: { location: { index: 1 }, text: content } }],
          }),
        }
      );
      if (!batchResponse.ok) throw new Error(`Google Docs batchUpdate error: ${batchResponse.status} ${batchResponse.statusText}`);
    }

    return { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }], isError: false };
  }

  private async getSpreadsheetValues(
    spreadsheetId: string,
    range: string,
    majorDimension?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('majorDimension', majorDimension ?? 'ROWS');

    const response = await fetch(
      `${this.baseUrl}/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Sheets returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchFiles(
    query: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('pageSize', String(pageSize ?? 20));
    params.append('fields', 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)');
    if (pageToken) params.append('pageToken', pageToken);

    const response = await fetch(
      `${this.baseUrl}/drive/v3/files?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Drive returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
