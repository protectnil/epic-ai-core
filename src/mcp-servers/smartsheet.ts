/**
 * Smartsheet MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/smartsheet-platform/smar-mcp — transport: stdio, auth: Bearer access token
// Published by smartsheet-platform (official Smartsheet GitHub org). Last commit: 2025-06-18. Actively maintained.
// Vendor MCP covers: ~12 tools (get_sheet, get_sheet_version, get_cell_history, update_rows, add_rows,
//   delete_rows, create_sheet, create_row_discussion, get_sheet_location, get_sheet_updates,
//   get_comments, update_cell).
// Our adapter covers: 22 tools (sheets, rows, columns, workspaces, reports, sharing, search, webhooks).
//
// Integration: use-both
// MCP-sourced tools (5 unique to MCP): [get_sheet_version, get_cell_history, get_sheet_updates,
//   get_comments, create_row_discussion]
// REST-sourced tools (17 unique to our adapter): [list_sheets, update_sheet, delete_sheet, get_columns,
//   add_column, search_sheets, get_current_user, list_workspaces, get_workspace,
//   create_sheet_in_workspace, list_reports, get_report, share_sheet, list_sheet_shares,
//   list_webhooks, create_webhook, delete_webhook]
// Shared tools (3, routed through MCP by default): [get_sheet, add_rows, update_rows, delete_rows, create_sheet]
// Combined coverage: ~27 distinct capabilities (MCP: 12 + REST: 22 - shared: ~7)
//
// Base URL: https://api.smartsheet.com/2.0 (US); EU: https://api.smartsheet.eu/2.0; AU: https://api.smartsheet.au/2.0
// Auth: Bearer access token in Authorization header — generate at app.smartsheet.com/b/account (Personal Settings > API Access)
// Docs: https://developers.smartsheet.com/api/smartsheet/openapi
// Rate limits: 300 req/min per access token for most endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SmartsheetConfig {
  accessToken: string;
  baseUrl?: string;
}

export class SmartsheetMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SmartsheetConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.smartsheet.com/2.0';
  }

  static catalog() {
    return {
      name: 'smartsheet',
      displayName: 'Smartsheet',
      version: '1.0.0',
      category: 'collaboration',
      keywords: ['smartsheet', 'sheet', 'row', 'column', 'cell', 'workspace', 'report', 'dashboard', 'gantt', 'project management', 'spreadsheet', 'sharing'],
      toolNames: [
        'list_sheets', 'get_sheet', 'create_sheet', 'update_sheet', 'delete_sheet',
        'add_rows', 'update_rows', 'delete_rows', 'get_columns', 'add_column',
        'search_sheets', 'get_current_user', 'list_workspaces', 'get_workspace',
        'create_sheet_in_workspace', 'list_reports', 'get_report',
        'share_sheet', 'list_sheet_shares', 'list_webhooks', 'create_webhook', 'delete_webhook',
      ],
      description: 'Smartsheet collaboration: manage sheets, rows, columns, workspaces, reports, sharing permissions, and webhooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sheets',
        description: 'List all sheets accessible to the authenticated user with pagination and optional include fields',
        inputSchema: {
          type: 'object',
          properties: {
            include: {
              type: 'string',
              description: 'Comma-separated optional fields: attachments, discussions, source, sourceTemplates',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_sheet',
        description: 'Get a sheet by its ID, including all rows, columns, and cells with optional field includes and filters',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The numeric ID of the sheet to retrieve',
            },
            include: {
              type: 'string',
              description: 'Comma-separated optional fields: attachments, crossSheetReferences, discussions, filters, format, ganttConfig, objectValue, ownerInfo, rowPermalink, source',
            },
            rowNumbers: {
              type: 'string',
              description: 'Comma-separated list of row numbers to include (1-based)',
            },
            columnIds: {
              type: 'string',
              description: 'Comma-separated list of column IDs to include',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'create_sheet',
        description: 'Create a new sheet at the top level (Home) with specified columns',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the new sheet',
            },
            columns: {
              type: 'array',
              description: 'Array of column definition objects. Each must have title and type (TEXT_NUMBER, DATE, CONTACT_LIST, CHECKBOX, PICKLIST, DURATION, PREDECESSOR, ABSTRACT_DATETIME).',
              items: { type: 'object' },
            },
          },
          required: ['name', 'columns'],
        },
      },
      {
        name: 'update_sheet',
        description: 'Update sheet metadata: rename, change ownership, or update user settings',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet to update',
            },
            name: {
              type: 'string',
              description: 'New name for the sheet',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'delete_sheet',
        description: 'Permanently delete a sheet. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet to delete',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'add_rows',
        description: 'Add one or more rows to a sheet with cell values and optional positioning (toTop, toBottom, parentId, siblingId)',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet to add rows to',
            },
            rows: {
              type: 'array',
              description: 'Array of row objects. Each row has cells (array of {columnId, value}) and optional positioning: toTop, toBottom, parentId, siblingId, above.',
              items: { type: 'object' },
            },
          },
          required: ['sheetId', 'rows'],
        },
      },
      {
        name: 'update_rows',
        description: 'Update one or more existing rows in a sheet by row ID with new cell values',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet containing the rows',
            },
            rows: {
              type: 'array',
              description: 'Array of row objects. Each row must have id and cells (array of {columnId, value}).',
              items: { type: 'object' },
            },
          },
          required: ['sheetId', 'rows'],
        },
      },
      {
        name: 'delete_rows',
        description: 'Delete one or more rows from a sheet by their row IDs',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet containing the rows',
            },
            rowIds: {
              type: 'array',
              description: 'Array of row ID strings to delete',
              items: { type: 'string' },
            },
          },
          required: ['sheetId', 'rowIds'],
        },
      },
      {
        name: 'get_columns',
        description: 'Get all columns defined in a sheet including column IDs, types, and options',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet',
            },
            include: {
              type: 'string',
              description: 'Optional: "filters" to include column filter definitions',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'add_column',
        description: 'Add a new column to an existing sheet with specified type and options',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet',
            },
            title: {
              type: 'string',
              description: 'Name of the new column',
            },
            type: {
              type: 'string',
              description: 'Column type: TEXT_NUMBER, DATE, CONTACT_LIST, CHECKBOX, PICKLIST, DURATION, PREDECESSOR, ABSTRACT_DATETIME',
            },
            index: {
              type: 'number',
              description: 'Zero-based position for the column (default: appended at end)',
            },
            options: {
              type: 'array',
              description: 'For PICKLIST columns, array of option strings',
              items: { type: 'string' },
            },
          },
          required: ['sheetId', 'title', 'type'],
        },
      },
      {
        name: 'search_sheets',
        description: 'Search across all sheets (or a specific sheet) for text in cell values, comments, and attachment names',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for',
            },
            scopes: {
              type: 'string',
              description: 'Comma-separated scopes: attachmentName, cellData, commentBody, formulaKeyword, rowData, sheetName, summaryFields',
            },
            sheetId: {
              type: 'string',
              description: 'If provided, restricts the search to a specific sheet',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile of the currently authenticated Smartsheet user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_workspaces',
        description: 'List all workspaces accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            include: {
              type: 'string',
              description: 'Optional: "source" to include source information',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get a workspace by its ID including sheets, reports, dashboards, and folders it contains',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The ID of the workspace',
            },
            include: {
              type: 'string',
              description: 'Optional: "ownerInfo" to include owner details',
            },
            loadAll: {
              type: 'boolean',
              description: 'If true, loads all sub-items within the workspace (default: false)',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'create_sheet_in_workspace',
        description: 'Create a new sheet directly inside a specific workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The ID of the workspace to create the sheet in',
            },
            name: {
              type: 'string',
              description: 'Name of the new sheet',
            },
            columns: {
              type: 'array',
              description: 'Array of column definition objects. Each must have title and type.',
              items: { type: 'object' },
            },
          },
          required: ['workspaceId', 'name', 'columns'],
        },
      },
      {
        name: 'list_reports',
        description: 'List all reports accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_report',
        description: 'Get a report by its ID including its rows, columns, and cells aggregated from source sheets',
        inputSchema: {
          type: 'object',
          properties: {
            reportId: {
              type: 'string',
              description: 'The ID of the report',
            },
            page: {
              type: 'number',
              description: 'Page number for report row pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of rows per page (default: 100, max: 10000)',
            },
          },
          required: ['reportId'],
        },
      },
      {
        name: 'share_sheet',
        description: 'Share a sheet with users or groups at a specified access level',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet to share',
            },
            shares: {
              type: 'array',
              description: 'Array of share objects. Each has email (or groupId) and accessLevel: VIEWER, EDITOR, EDITOR_SHARE, ADMIN, OWNER',
              items: { type: 'object' },
            },
            sendEmail: {
              type: 'boolean',
              description: 'Send email notification to new collaborators (default: false)',
            },
          },
          required: ['sheetId', 'shares'],
        },
      },
      {
        name: 'list_sheet_shares',
        description: 'List all sharing permissions (collaborators) for a specific sheet',
        inputSchema: {
          type: 'object',
          properties: {
            sheetId: {
              type: 'string',
              description: 'The ID of the sheet',
            },
            include: {
              type: 'string',
              description: 'Optional: "workspaceShares" to include workspace-level shares',
            },
          },
          required: ['sheetId'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks registered for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a webhook to receive event notifications for a sheet or workspace',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Friendly name for the webhook',
            },
            callbackUrl: {
              type: 'string',
              description: 'HTTPS URL to receive POST notifications',
            },
            scope: {
              type: 'string',
              description: 'Scope type: sheet (default)',
            },
            scopeObjectId: {
              type: 'string',
              description: 'ID of the scope object (e.g. sheet ID)',
            },
            events: {
              type: 'array',
              description: 'Array of event strings to subscribe to, e.g. ["*.*"] for all events, or ["sheet.updated", "row.created"]',
              items: { type: 'string' },
            },
            version: {
              type: 'number',
              description: 'Webhook payload version (default: 1)',
            },
          },
          required: ['name', 'callbackUrl', 'scopeObjectId', 'events'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhookId: {
              type: 'string',
              description: 'The ID of the webhook to delete',
            },
          },
          required: ['webhookId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_sheets':
          return this.listSheets(args);
        case 'get_sheet':
          return this.getSheet(args);
        case 'create_sheet':
          return this.createSheet(args);
        case 'update_sheet':
          return this.updateSheet(args);
        case 'delete_sheet':
          return this.deleteSheet(args);
        case 'add_rows':
          return this.addRows(args);
        case 'update_rows':
          return this.updateRows(args);
        case 'delete_rows':
          return this.deleteRows(args);
        case 'get_columns':
          return this.getColumns(args);
        case 'add_column':
          return this.addColumn(args);
        case 'search_sheets':
          return this.searchSheets(args);
        case 'get_current_user':
          return this.getCurrentUser();
        case 'list_workspaces':
          return this.listWorkspaces(args);
        case 'get_workspace':
          return this.getWorkspace(args);
        case 'create_sheet_in_workspace':
          return this.createSheetInWorkspace(args);
        case 'list_reports':
          return this.listReports(args);
        case 'get_report':
          return this.getReport(args);
        case 'share_sheet':
          return this.shareSheet(args);
        case 'list_sheet_shares':
          return this.listSheetShares(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
        case 'create_webhook':
          return this.createWebhook(args);
        case 'delete_webhook':
          return this.deleteWebhook(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async ssGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length) {
      url += '?' + new URLSearchParams(params).toString();
    }
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ssPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ssPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ssDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSheets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.include) params.include = args.include as string;
    if (args.page) params.page = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.ssGet('/sheets', params);
  }

  private async getSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    if (!id) return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.include) params.include = args.include as string;
    if (args.rowNumbers) params.rowNumbers = args.rowNumbers as string;
    if (args.columnIds) params.columnIds = args.columnIds as string;
    return this.ssGet(`/sheets/${encodeURIComponent(id)}`, params);
  }

  private async createSheet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.columns) return { content: [{ type: 'text', text: 'name and columns are required' }], isError: true };
    return this.ssPost('/sheets', { name: args.name, columns: args.columns });
  }

  private async updateSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    if (!id) return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    return this.ssPut(`/sheets/${encodeURIComponent(id)}`, body);
  }

  private async deleteSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    if (!id) return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
    return this.ssDelete(`/sheets/${encodeURIComponent(id)}`);
  }

  private async addRows(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    const rows = args.rows as unknown[];
    if (!id || !Array.isArray(rows) || rows.length === 0) {
      return { content: [{ type: 'text', text: 'sheetId and rows (non-empty array) are required' }], isError: true };
    }
    return this.ssPost(`/sheets/${encodeURIComponent(id)}/rows`, rows);
  }

  private async updateRows(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    const rows = args.rows as unknown[];
    if (!id || !Array.isArray(rows) || rows.length === 0) {
      return { content: [{ type: 'text', text: 'sheetId and rows (non-empty array) are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/sheets/${encodeURIComponent(id)}/rows`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(rows),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteRows(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    const rowIds = args.rowIds as string[];
    if (!id || !Array.isArray(rowIds) || rowIds.length === 0) {
      return { content: [{ type: 'text', text: 'sheetId and rowIds (non-empty array) are required' }], isError: true };
    }
    const idList = rowIds.join(',');
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/sheets/${encodeURIComponent(id)}/rows?ids=${encodeURIComponent(idList)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getColumns(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    if (!id) return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.include) params.include = args.include as string;
    return this.ssGet(`/sheets/${encodeURIComponent(id)}/columns`, params);
  }

  private async addColumn(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    if (!id || !args.title || !args.type) {
      return { content: [{ type: 'text', text: 'sheetId, title, and type are required' }], isError: true };
    }
    const col: Record<string, unknown> = { title: args.title, type: args.type };
    if (args.index !== undefined) col.index = args.index;
    if (args.options) col.options = args.options;
    return this.ssPost(`/sheets/${encodeURIComponent(id)}/columns`, [col]);
  }

  private async searchSheets(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { query };
    if (args.scopes) params.scopes = args.scopes as string;
    if (args.sheetId) {
      return this.ssGet(`/sheets/${encodeURIComponent(args.sheetId as string)}/search`, params);
    }
    return this.ssGet('/search', params);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.ssGet('/users/me');
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.include) params.include = args.include as string;
    if (args.page) params.page = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.ssGet('/workspaces', params);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.workspaceId as string;
    if (!id) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.include) params.include = args.include as string;
    if (args.loadAll === true) params.loadAll = 'true';
    return this.ssGet(`/workspaces/${encodeURIComponent(id)}`, params);
  }

  private async createSheetInWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const wid = args.workspaceId as string;
    if (!wid || !args.name || !args.columns) {
      return { content: [{ type: 'text', text: 'workspaceId, name, and columns are required' }], isError: true };
    }
    return this.ssPost(`/workspaces/${encodeURIComponent(wid)}/sheets`, { name: args.name, columns: args.columns });
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.ssGet('/reports', params);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.reportId as string;
    if (!id) return { content: [{ type: 'text', text: 'reportId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.ssGet(`/reports/${encodeURIComponent(id)}`, params);
  }

  private async shareSheet(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    const shares = args.shares as unknown[];
    if (!id || !Array.isArray(shares) || shares.length === 0) {
      return { content: [{ type: 'text', text: 'sheetId and shares (non-empty array) are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.sendEmail === true) params.sendEmail = 'true';
    let url = `${this.baseUrl}/sheets/${encodeURIComponent(id)}/shares`;
    if (Object.keys(params).length) url += '?' + new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(shares),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Smartsheet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSheetShares(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.sheetId as string;
    if (!id) return { content: [{ type: 'text', text: 'sheetId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.include) params.include = args.include as string;
    return this.ssGet(`/sheets/${encodeURIComponent(id)}/shares`, params);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.pageSize) params.pageSize = String(args.pageSize);
    return this.ssGet('/webhooks', params);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.callbackUrl || !args.scopeObjectId || !args.events) {
      return { content: [{ type: 'text', text: 'name, callbackUrl, scopeObjectId, and events are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      callbackUrl: args.callbackUrl,
      scope: (args.scope as string) || 'sheet',
      scopeObjectId: args.scopeObjectId,
      events: args.events,
      version: (args.version as number) || 1,
    };
    return this.ssPost('/webhooks', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webhookId as string;
    if (!id) return { content: [{ type: 'text', text: 'webhookId is required' }], isError: true };
    return this.ssDelete(`/webhooks/${encodeURIComponent(id)}`);
  }
}
