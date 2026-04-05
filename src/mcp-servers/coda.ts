/**
 * Coda MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// Multiple community MCP servers exist (orellazri/coda-mcp, bluestemso/coda-io-mcp,
// TJC-LP/coda-mcp-server, nkpar/coda-mcp) but none are published by Coda officially.
// Our adapter covers: 25 tools (docs, pages, tables, rows, columns, formulas, controls, account, automations).
// Recommendation: use-rest-api — no official Coda MCP server exists.
//
// Base URL: https://coda.io/apis/v1
// Auth: Bearer API token in Authorization header (generated from Coda account settings)
// Docs: https://coda.io/developers/apis/v1
// Rate limits: Read — 100 req/6s; Write (POST/PUT/PATCH) — 10 req/6s;
//              Write doc content — 5 req/10s.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodaConfig {
  apiToken: string;
  baseUrl?: string;
}

export class CodaMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: CodaConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://coda.io/apis/v1';
  }

  static catalog() {
    return {
      name: 'coda',
      displayName: 'Coda',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'coda', 'doc', 'document', 'table', 'row', 'column', 'page',
        'database', 'workflow', 'formula', 'control', 'workspace',
        'collaboration', 'knowledge-base',
      ],
      toolNames: [
        'list_docs', 'get_doc', 'create_doc', 'delete_doc',
        'list_pages', 'get_page', 'create_page', 'update_page',
        'list_tables', 'get_table',
        'list_columns', 'get_column',
        'list_rows', 'get_row', 'upsert_rows', 'update_row', 'delete_row', 'delete_rows', 'push_button',
        'list_formulas', 'get_formula',
        'list_controls', 'get_control',
        'get_user_info', 'trigger_automation',
      ],
      description: 'Coda doc and database management: read/write docs, pages, tables, rows, columns, formulas, and controls via the Coda API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_docs',
        description: 'List Coda docs accessible by the API token with optional folder, workspace, and search query filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of docs to return (max 25, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response nextPageToken field',
            },
            query: {
              type: 'string',
              description: 'Search query to filter docs by title',
            },
            folder_id: {
              type: 'string',
              description: 'Filter docs by folder ID',
            },
            workspace_id: {
              type: 'string',
              description: 'Filter docs by workspace ID',
            },
            is_owner: {
              type: 'boolean',
              description: 'Return only docs owned by the API token user (default: false)',
            },
          },
        },
      },
      {
        name: 'get_doc',
        description: 'Retrieve metadata for a specific Coda doc by document ID including title, owner, and stats',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID (from the doc URL, e.g. AbCdEfGh)',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'create_doc',
        description: 'Create a new Coda doc with optional title, source doc copy, and folder destination',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title for the new doc (default: "Untitled")',
            },
            source_doc: {
              type: 'string',
              description: 'Document ID to copy as the basis for the new doc',
            },
            folder_id: {
              type: 'string',
              description: 'Folder ID to create the doc in',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for the doc (IANA tz name, e.g. America/New_York)',
            },
          },
        },
      },
      {
        name: 'delete_doc',
        description: 'Delete a Coda doc permanently by document ID',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID to delete',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'list_pages',
        description: 'List all pages and sub-pages in a Coda doc with their IDs, names, and hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID to list pages from',
            },
            limit: {
              type: 'number',
              description: 'Number of pages to return (max 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'get_page',
        description: 'Retrieve details of a specific page in a Coda doc by page ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID containing the page',
            },
            page_id_or_name: {
              type: 'string',
              description: 'Page ID or URL-encoded page name',
            },
          },
          required: ['doc_id', 'page_id_or_name'],
        },
      },
      {
        name: 'create_page',
        description: 'Create a new page in a Coda doc with optional parent page, subtitle, and icon',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID to create the page in',
            },
            name: {
              type: 'string',
              description: 'Name (title) of the new page',
            },
            parent_page_id: {
              type: 'string',
              description: 'Parent page ID to nest this page under (omit for top-level)',
            },
            subtitle: {
              type: 'string',
              description: 'Subtitle text displayed below the page title',
            },
            page_content: {
              type: 'string',
              description: 'Initial page content as a JSON object matching Coda canvas content format',
            },
          },
          required: ['doc_id', 'name'],
        },
      },
      {
        name: 'update_page',
        description: 'Update a page name, subtitle, or icon in a Coda doc',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID containing the page',
            },
            page_id_or_name: {
              type: 'string',
              description: 'Page ID or URL-encoded page name to update',
            },
            name: {
              type: 'string',
              description: 'New name for the page',
            },
            subtitle: {
              type: 'string',
              description: 'New subtitle for the page',
            },
          },
          required: ['doc_id', 'page_id_or_name'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables and views in a Coda doc with their IDs, names, and row counts',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID to list tables from',
            },
            limit: {
              type: 'number',
              description: 'Number of tables to return (max 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            table_types: {
              type: 'string',
              description: 'Filter by type: table or view (default: returns both)',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'get_table',
        description: 'Retrieve metadata for a specific table or view in a Coda doc by table ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
          },
          required: ['doc_id', 'table_id_or_name'],
        },
      },
      {
        name: 'list_columns',
        description: 'List all columns in a Coda table with their IDs, names, and types',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            limit: {
              type: 'number',
              description: 'Number of columns to return (max 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['doc_id', 'table_id_or_name'],
        },
      },
      {
        name: 'get_column',
        description: 'Retrieve details of a specific column in a Coda table by column ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            column_id_or_name: {
              type: 'string',
              description: 'Column ID or URL-encoded column name',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'column_id_or_name'],
        },
      },
      {
        name: 'list_rows',
        description: 'List rows in a Coda table with optional column filter, value format, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            limit: {
              type: 'number',
              description: 'Number of rows to return (max 500, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            query: {
              type: 'string',
              description: 'Filter rows using a column:value query (e.g. "Status:Active")',
            },
            value_format: {
              type: 'string',
              description: 'Format for returned values: simple (default), simpleWithArrays, rich',
            },
            sort_by: {
              type: 'string',
              description: 'Sort rows by: natural (default) or createdAt',
            },
          },
          required: ['doc_id', 'table_id_or_name'],
        },
      },
      {
        name: 'get_row',
        description: 'Retrieve a specific row from a Coda table by row ID or display value',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            row_id_or_name: {
              type: 'string',
              description: 'Row ID or URL-encoded row display value',
            },
            value_format: {
              type: 'string',
              description: 'Format for returned values: simple (default), simpleWithArrays, rich',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'row_id_or_name'],
        },
      },
      {
        name: 'upsert_rows',
        description: 'Insert or update rows in a Coda table; rows matching keyColumns are updated, others are inserted',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            rows: {
              type: 'string',
              description: 'JSON array of row objects, each with a cells array of {column, value} pairs',
            },
            key_columns: {
              type: 'string',
              description: 'JSON array of column IDs/names to use as upsert keys (match determines update vs insert)',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'rows'],
        },
      },
      {
        name: 'update_row',
        description: 'Update cells in a specific row in a Coda table by row ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            row_id_or_name: {
              type: 'string',
              description: 'Row ID or URL-encoded row display value',
            },
            row: {
              type: 'string',
              description: 'JSON object with a cells array of {column, value} pairs to update',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'row_id_or_name', 'row'],
        },
      },
      {
        name: 'delete_rows',
        description: 'Delete multiple rows from a Coda table matching specified row IDs in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            row_ids: {
              type: 'string',
              description: 'JSON array of row IDs to delete (e.g. ["i-abc123", "i-def456"])',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'row_ids'],
        },
      },
      {
        name: 'push_button',
        description: 'Push a button in a specific row of a Coda table to trigger its automation or formula action',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            row_id_or_name: {
              type: 'string',
              description: 'Row ID or URL-encoded row display value',
            },
            column_id_or_name: {
              type: 'string',
              description: 'Column ID or URL-encoded column name of the button column',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'row_id_or_name', 'column_id_or_name'],
        },
      },
      {
        name: 'delete_row',
        description: 'Delete a specific row from a Coda table by row ID',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            table_id_or_name: {
              type: 'string',
              description: 'Table ID or URL-encoded table name',
            },
            row_id: {
              type: 'string',
              description: 'Row ID to delete',
            },
          },
          required: ['doc_id', 'table_id_or_name', 'row_id'],
        },
      },
      {
        name: 'list_formulas',
        description: 'List named formulas in a Coda doc with their IDs and current values',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID to list formulas from',
            },
            limit: {
              type: 'number',
              description: 'Number of formulas to return (max 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'list_controls',
        description: 'List interactive controls (buttons, sliders, date pickers) in a Coda doc',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID to list controls from',
            },
            limit: {
              type: 'number',
              description: 'Number of controls to return (max 200, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['doc_id'],
        },
      },
      {
        name: 'get_formula',
        description: 'Retrieve details and current value of a specific named formula in a Coda doc by formula ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            formula_id_or_name: {
              type: 'string',
              description: 'Formula ID or URL-encoded formula name',
            },
          },
          required: ['doc_id', 'formula_id_or_name'],
        },
      },
      {
        name: 'get_control',
        description: 'Retrieve details of a specific interactive control (button, slider, date picker) in a Coda doc',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID',
            },
            control_id_or_name: {
              type: 'string',
              description: 'Control ID or URL-encoded control name',
            },
          },
          required: ['doc_id', 'control_id_or_name'],
        },
      },
      {
        name: 'get_user_info',
        description: 'Retrieve info about the API token owner including name, email, and workspace memberships',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'trigger_automation',
        description: 'Trigger a Coda automation rule (webhook-triggered) in a doc by rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            doc_id: {
              type: 'string',
              description: 'Coda document ID containing the automation',
            },
            rule_id: {
              type: 'string',
              description: 'Automation rule ID to trigger',
            },
            payload: {
              type: 'string',
              description: 'Optional JSON object to pass as payload to the automation',
            },
          },
          required: ['doc_id', 'rule_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_docs': return this.listDocs(args);
        case 'get_doc': return this.getDoc(args);
        case 'create_doc': return this.createDoc(args);
        case 'delete_doc': return this.deleteDoc(args);
        case 'list_pages': return this.listPages(args);
        case 'get_page': return this.getPage(args);
        case 'create_page': return this.createPage(args);
        case 'update_page': return this.updatePage(args);
        case 'list_tables': return this.listTables(args);
        case 'get_table': return this.getTable(args);
        case 'list_columns': return this.listColumns(args);
        case 'get_column': return this.getColumn(args);
        case 'list_rows': return this.listRows(args);
        case 'get_row': return this.getRow(args);
        case 'upsert_rows': return this.upsertRows(args);
        case 'update_row': return this.updateRow(args);
        case 'delete_row': return this.deleteRow(args);
        case 'delete_rows': return this.deleteRows(args);
        case 'push_button': return this.pushButton(args);
        case 'list_formulas': return this.listFormulas(args);
        case 'get_formula': return this.getFormula(args);
        case 'list_controls': return this.listControls(args);
        case 'get_control': return this.getControl(args);
        case 'get_user_info': return this.getUserInfo(args);
        case 'trigger_automation': return this.triggerAutomation(args);
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

  private async codaGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async codaPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async codaPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async codaDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDocs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.page_token) params.pageToken = args.page_token as string;
    if (args.query) params.query = args.query as string;
    if (args.folder_id) params.folderId = args.folder_id as string;
    if (args.workspace_id) params.workspaceId = args.workspace_id as string;
    if (typeof args.is_owner === 'boolean') params.isOwner = String(args.is_owner);
    return this.codaGet('/docs', params);
  }

  private async getDoc(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}`);
  }

  private async createDoc(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.source_doc) body.sourceDoc = args.source_doc;
    if (args.folder_id) body.folderId = args.folder_id;
    if (args.timezone) body.timezone = args.timezone;
    return this.codaPost('/docs', body);
  }

  private async deleteDoc(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    return this.codaDelete(`/docs/${encodeURIComponent(args.doc_id as string)}`);
  }

  private async listPages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 25) };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/pages`, params);
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.page_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and page_id_or_name are required' }], isError: true };
    }
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/pages/${encodeURIComponent(args.page_id_or_name as string)}`);
  }

  private async createPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.name) {
      return { content: [{ type: 'text', text: 'doc_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name };
    if (args.parent_page_id) body.parentPageId = args.parent_page_id;
    if (args.subtitle) body.subtitle = args.subtitle;
    if (args.page_content) {
      try { body.pageContent = JSON.parse(args.page_content as string); } catch { /* skip */ }
    }
    return this.codaPost(`/docs/${encodeURIComponent(args.doc_id as string)}/pages`, body);
  }

  private async updatePage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.page_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and page_id_or_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.subtitle) body.subtitle = args.subtitle;
    return this.codaPut(`/docs/${encodeURIComponent(args.doc_id as string)}/pages/${encodeURIComponent(args.page_id_or_name as string)}`, body);
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 25) };
    if (args.page_token) params.pageToken = args.page_token as string;
    if (args.table_types) params.tableTypes = args.table_types as string;
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/tables`, params);
  }

  private async getTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and table_id_or_name are required' }], isError: true };
    }
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}`);
  }

  private async listColumns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and table_id_or_name are required' }], isError: true };
    }
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 25) };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/columns`, params);
  }

  private async listRows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and table_id_or_name are required' }], isError: true };
    }
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
      valueFormat: (args.value_format as string) ?? 'simple',
    };
    if (args.page_token) params.pageToken = args.page_token as string;
    if (args.query) params.query = args.query as string;
    if (args.sort_by) params.sortBy = args.sort_by as string;
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows`, params);
  }

  private async getRow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.row_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, and row_id_or_name are required' }], isError: true };
    }
    const params: Record<string, string> = {
      valueFormat: (args.value_format as string) ?? 'simple',
    };
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows/${encodeURIComponent(args.row_id_or_name as string)}`, params);
  }

  private async upsertRows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.rows) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, and rows are required' }], isError: true };
    }
    let rowsArr: unknown;
    try { rowsArr = JSON.parse(args.rows as string); } catch {
      return { content: [{ type: 'text', text: 'rows must be valid JSON' }], isError: true };
    }
    const body: Record<string, unknown> = { rows: rowsArr };
    if (args.key_columns) {
      try { body.keyColumns = JSON.parse(args.key_columns as string); } catch { /* skip */ }
    }
    return this.codaPost(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows`, body);
  }

  private async deleteRow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.row_id) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, and row_id are required' }], isError: true };
    }
    return this.codaDelete(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows/${encodeURIComponent(args.row_id as string)}`);
  }

  private async listFormulas(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 25) };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/formulas`, params);
  }

  private async listControls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id) return { content: [{ type: 'text', text: 'doc_id is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 25) };
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/controls`, params);
  }

  private async getColumn(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.column_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, and column_id_or_name are required' }], isError: true };
    }
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/columns/${encodeURIComponent(args.column_id_or_name as string)}`);
  }

  private async updateRow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.row_id_or_name || !args.row) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, row_id_or_name, and row are required' }], isError: true };
    }
    let rowObj: unknown;
    try { rowObj = JSON.parse(args.row as string); } catch {
      return { content: [{ type: 'text', text: 'row must be valid JSON' }], isError: true };
    }
    return this.codaPut(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows/${encodeURIComponent(args.row_id_or_name as string)}`, { row: rowObj });
  }

  private async deleteRows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.row_ids) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, and row_ids are required' }], isError: true };
    }
    let rowIdsArr: unknown;
    try { rowIdsArr = JSON.parse(args.row_ids as string); } catch {
      return { content: [{ type: 'text', text: 'row_ids must be valid JSON array' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ rowIds: rowIdsArr }),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async pushButton(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.table_id_or_name || !args.row_id_or_name || !args.column_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id, table_id_or_name, row_id_or_name, and column_id_or_name are required' }], isError: true };
    }
    return this.codaPost(`/docs/${encodeURIComponent(args.doc_id as string)}/tables/${encodeURIComponent(args.table_id_or_name as string)}/rows/${encodeURIComponent(args.row_id_or_name as string)}/buttons/${encodeURIComponent(args.column_id_or_name as string)}`, {});
  }

  private async getFormula(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.formula_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and formula_id_or_name are required' }], isError: true };
    }
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/formulas/${encodeURIComponent(args.formula_id_or_name as string)}`);
  }

  private async getControl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.control_id_or_name) {
      return { content: [{ type: 'text', text: 'doc_id and control_id_or_name are required' }], isError: true };
    }
    return this.codaGet(`/docs/${encodeURIComponent(args.doc_id as string)}/controls/${encodeURIComponent(args.control_id_or_name as string)}`);
  }

  private async getUserInfo(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.codaGet('/whoami');
  }

  private async triggerAutomation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.doc_id || !args.rule_id) {
      return { content: [{ type: 'text', text: 'doc_id and rule_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.payload) {
      try { body.payload = JSON.parse(args.payload as string); } catch { /* skip */ }
    }
    return this.codaPost(`/docs/${encodeURIComponent(args.doc_id as string)}/hooks/automation/${encodeURIComponent(args.rule_id as string)}`, body);
  }
}
