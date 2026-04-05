/**
 * Airtable MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Airtable MCP server was found on GitHub. Multiple community servers
// exist (domdomegg/airtable-mcp-server, rashidazarang/airtable-mcp, felores/airtable-mcp)
// but none are published or maintained by Airtable Inc. We build a full REST wrapper
// covering records, metadata, comments, and webhooks.
//
// Base URL: https://api.airtable.com/v0
// Auth: Bearer personal access token (PAT) — https://airtable.com/create/tokens
// Docs: https://airtable.com/developers/web/api/introduction
// Rate limits: 5 requests/sec per base (all pricing tiers)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AirtableConfig {
  apiKey: string;        // Personal Access Token
  baseUrl?: string;
}

export class AirtableMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AirtableConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.airtable.com';
  }

  static catalog() {
    return {
      name: 'airtable',
      displayName: 'Airtable',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'airtable', 'spreadsheet', 'database', 'base', 'table', 'record',
        'field', 'view', 'filter', 'sort', 'formula', 'no-code', 'low-code',
        'webhook', 'comment', 'attachment', 'linked record',
      ],
      toolNames: [
        'list_bases', 'get_base_schema',
        'list_records', 'get_record', 'create_records', 'update_records', 'upsert_records', 'delete_records',
        'search_records',
        'list_tables', 'create_table', 'update_table',
        'create_field', 'update_field',
        'list_views',
        'list_webhooks', 'create_webhook', 'delete_webhook',
        'list_record_comments', 'create_record_comment',
      ],
      description: 'Airtable spreadsheet-database: read/write records, manage base schema, tables, fields, views, webhooks, and record comments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Bases ──────────────────────────────────────────────────────────────
      {
        name: 'list_bases',
        description: 'List all Airtable bases accessible by the current personal access token with IDs and names',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'string',
              description: 'Pagination cursor from a previous response to fetch the next page of bases',
            },
          },
        },
      },
      {
        name: 'get_base_schema',
        description: 'Get the full schema for an Airtable base — all tables, fields, field types, and views',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app", e.g. appXXXXXXXXXXXXXX)',
            },
          },
          required: ['base_id'],
        },
      },
      // ── Records ────────────────────────────────────────────────────────────
      {
        name: 'list_records',
        description: 'List records from an Airtable table with optional view, filter formula, sort, and field selection',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            view: {
              type: 'string',
              description: 'View ID or name to restrict results to (e.g. "Grid view")',
            },
            filter_by_formula: {
              type: 'string',
              description: 'Airtable formula to filter records (e.g. {Status}="Active")',
            },
            sort: {
              type: 'array',
              description: 'Array of sort objects: [{field: "Name", direction: "asc"}]',
              items: { type: 'object' },
            },
            fields: {
              type: 'array',
              description: 'List of field names or IDs to include in each record (default: all fields)',
              items: { type: 'string' },
            },
            max_records: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100)',
            },
            page_size: {
              type: 'number',
              description: 'Records per page: 1-100 (default: 100)',
            },
            offset: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['base_id', 'table_id'],
        },
      },
      {
        name: 'get_record',
        description: 'Get a single Airtable record by base ID, table ID, and record ID',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            record_id: {
              type: 'string',
              description: 'Airtable record ID (starts with "rec", e.g. recXXXXXXXXXXXXXX)',
            },
          },
          required: ['base_id', 'table_id', 'record_id'],
        },
      },
      {
        name: 'create_records',
        description: 'Create up to 10 new records in an Airtable table in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            records: {
              type: 'array',
              description: 'Array of record objects, each with a fields property: [{fields: {Name: "Alice", Status: "Active"}}]',
              items: { type: 'object' },
            },
          },
          required: ['base_id', 'table_id', 'records'],
        },
      },
      {
        name: 'update_records',
        description: 'Update up to 10 existing Airtable records by record ID — partial update (PATCH semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            records: {
              type: 'array',
              description: 'Array of record update objects: [{id: "recXXX", fields: {Status: "Done"}}]',
              items: { type: 'object' },
            },
          },
          required: ['base_id', 'table_id', 'records'],
        },
      },
      {
        name: 'upsert_records',
        description: 'Upsert records in an Airtable table — update matching records or create new ones if no match found',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            records: {
              type: 'array',
              description: 'Array of record objects with fields to upsert',
              items: { type: 'object' },
            },
            fields_to_merge_on: {
              type: 'array',
              description: 'Field names used as the unique key for matching existing records (e.g. ["Email"])',
              items: { type: 'string' },
            },
          },
          required: ['base_id', 'table_id', 'records', 'fields_to_merge_on'],
        },
      },
      {
        name: 'delete_records',
        description: 'Delete up to 10 records from an Airtable table by record IDs',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            record_ids: {
              type: 'array',
              description: 'Array of record IDs to delete (max: 10)',
              items: { type: 'string' },
            },
          },
          required: ['base_id', 'table_id', 'record_ids'],
        },
      },
      {
        name: 'search_records',
        description: 'Search records in an Airtable table using a filter formula or full-text search across specified fields',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
            table_id: {
              type: 'string',
              description: 'Table ID or name within the base',
            },
            filter_by_formula: {
              type: 'string',
              description: 'Airtable formula for matching records (e.g. SEARCH("alice",{Email}) OR {Status}="Active")',
            },
            fields: {
              type: 'array',
              description: 'Field names to return in results (default: all fields)',
              items: { type: 'string' },
            },
            max_records: {
              type: 'number',
              description: 'Maximum number of matching records to return (default: 100)',
            },
          },
          required: ['base_id', 'table_id', 'filter_by_formula'],
        },
      },
      // ── Tables ─────────────────────────────────────────────────────────────
      {
        name: 'list_tables',
        description: 'List all tables in an Airtable base with their IDs, names, field definitions, and views',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID (starts with "app")',
            },
          },
          required: ['base_id'],
        },
      },
      {
        name: 'create_table',
        description: 'Create a new table in an Airtable base with a name, optional description, and field definitions',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID to create the table in',
            },
            name: {
              type: 'string',
              description: 'Name for the new table',
            },
            description: {
              type: 'string',
              description: 'Optional description for the new table',
            },
            fields: {
              type: 'array',
              description: 'Array of field definition objects: [{name: "Status", type: "singleSelect", options: {choices: [{name: "Active"}]}}]',
              items: { type: 'object' },
            },
          },
          required: ['base_id', 'name', 'fields'],
        },
      },
      {
        name: 'update_table',
        description: 'Update an Airtable table name or description by base ID and table ID',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'Table ID to update',
            },
            name: {
              type: 'string',
              description: 'New table name',
            },
            description: {
              type: 'string',
              description: 'New table description',
            },
          },
          required: ['base_id', 'table_id'],
        },
      },
      // ── Fields ─────────────────────────────────────────────────────────────
      {
        name: 'create_field',
        description: 'Add a new field to an Airtable table with a specified type (singleLineText, number, date, singleSelect, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'Table ID to add the field to',
            },
            name: {
              type: 'string',
              description: 'Name for the new field',
            },
            type: {
              type: 'string',
              description: 'Field type: singleLineText, multilineText, email, url, number, currency, percent, date, dateTime, checkbox, singleSelect, multipleSelects, multipleAttachments, linkedRecord, formula, rollup, count, lookup, rating, duration, autoNumber',
            },
            description: {
              type: 'string',
              description: 'Optional description for the field',
            },
            options: {
              type: 'object',
              description: 'Field-type-specific options (e.g. {choices: [{name: "Option A"}]} for singleSelect)',
            },
          },
          required: ['base_id', 'table_id', 'name', 'type'],
        },
      },
      {
        name: 'update_field',
        description: 'Update a field name, description, or type-specific options in an Airtable table',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'Table ID containing the field',
            },
            field_id: {
              type: 'string',
              description: 'Field ID to update (starts with "fld")',
            },
            name: {
              type: 'string',
              description: 'New field name',
            },
            description: {
              type: 'string',
              description: 'New field description',
            },
            options: {
              type: 'object',
              description: 'Updated field-type-specific options',
            },
          },
          required: ['base_id', 'table_id', 'field_id'],
        },
      },
      // ── Views ──────────────────────────────────────────────────────────────
      {
        name: 'list_views',
        description: 'List all views in an Airtable table — grid, gallery, kanban, calendar, gantt, and form views',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'Table ID to list views for',
            },
          },
          required: ['base_id', 'table_id'],
        },
      },
      // ── Webhooks ───────────────────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'List all webhooks registered for an Airtable base with their event subscriptions and status',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID to list webhooks for',
            },
          },
          required: ['base_id'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Register a webhook for an Airtable base to receive notifications on record changes, table changes, or field changes',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID to attach the webhook to',
            },
            notification_url: {
              type: 'string',
              description: 'HTTPS URL that will receive POST payloads for the subscribed events',
            },
            specification: {
              type: 'object',
              description: 'Webhook specification object with options.filters (dataTypes, recordChangeScope) and event filters',
            },
          },
          required: ['base_id', 'notification_url', 'specification'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete an Airtable webhook by base ID and webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID that owns the webhook',
            },
            webhook_id: {
              type: 'string',
              description: 'Webhook ID to delete',
            },
          },
          required: ['base_id', 'webhook_id'],
        },
      },
      // ── Comments ───────────────────────────────────────────────────────────
      {
        name: 'list_record_comments',
        description: 'List all comments on a specific Airtable record with author and timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'Table ID containing the record',
            },
            record_id: {
              type: 'string',
              description: 'Record ID to list comments for (starts with "rec")',
            },
            offset: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['base_id', 'table_id', 'record_id'],
        },
      },
      {
        name: 'create_record_comment',
        description: 'Add a text comment to an Airtable record, optionally mentioning users with @mention syntax',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'Table ID containing the record',
            },
            record_id: {
              type: 'string',
              description: 'Record ID to add the comment to (starts with "rec")',
            },
            text: {
              type: 'string',
              description: 'Comment text content (supports @mentions with Airtable user IDs)',
            },
          },
          required: ['base_id', 'table_id', 'record_id', 'text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_bases':             return this.listBases(args);
        case 'get_base_schema':        return this.getBaseSchema(args);
        case 'list_records':           return this.listRecords(args);
        case 'get_record':             return this.getRecord(args);
        case 'create_records':         return this.createRecords(args);
        case 'update_records':         return this.updateRecords(args);
        case 'upsert_records':         return this.upsertRecords(args);
        case 'delete_records':         return this.deleteRecords(args);
        case 'search_records':         return this.searchRecords(args);
        case 'list_tables':            return this.listTables(args);
        case 'create_table':           return this.createTable(args);
        case 'update_table':           return this.updateTable(args);
        case 'create_field':           return this.createField(args);
        case 'update_field':           return this.updateField(args);
        case 'list_views':             return this.listViews(args);
        case 'list_webhooks':          return this.listWebhooks(args);
        case 'create_webhook':         return this.createWebhook(args);
        case 'delete_webhook':         return this.deleteWebhook(args);
        case 'list_record_comments':   return this.listRecordComments(args);
        case 'create_record_comment':  return this.createRecordComment(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async del(path: string, params?: Record<string, string>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Bases ──────────────────────────────────────────────────────────────────

  private async listBases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.offset) params.offset = args.offset as string;
    return this.get('/v0/meta/bases', params);
  }

  private async getBaseSchema(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id) return { content: [{ type: 'text', text: 'base_id is required' }], isError: true };
    return this.get(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables`);
  }

  // ── Records ────────────────────────────────────────────────────────────────

  private async listRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id) {
      return { content: [{ type: 'text', text: 'base_id and table_id are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.view)               params.view               = args.view as string;
    if (args.filter_by_formula)  params.filterByFormula    = args.filter_by_formula as string;
    if (args.max_records)        params.maxRecords         = String(args.max_records);
    if (args.page_size)          params.pageSize           = String(args.page_size);
    if (args.offset)             params.offset             = args.offset as string;
    if (Array.isArray(args.fields)) {
      (args.fields as string[]).forEach((f, i) => { params[`fields[${i}]`] = f; });
    }
    if (Array.isArray(args.sort)) {
      (args.sort as Array<{ field: string; direction?: string }>).forEach((s, i) => {
        params[`sort[${i}][field]`] = s.field;
        if (s.direction) params[`sort[${i}][direction]`] = s.direction;
      });
    }
    return this.get(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}`, params);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.record_id) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and record_id are required' }], isError: true };
    }
    return this.get(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}/${encodeURIComponent(args.record_id as string)}`);
  }

  private async createRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.records) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and records are required' }], isError: true };
    }
    return this.post(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}`, {
      records: args.records,
    });
  }

  private async updateRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.records) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and records are required' }], isError: true };
    }
    return this.patch(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}`, {
      records: args.records,
    });
  }

  private async upsertRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.records || !args.fields_to_merge_on) {
      return { content: [{ type: 'text', text: 'base_id, table_id, records, and fields_to_merge_on are required' }], isError: true };
    }
    return this.patch(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}`, {
      records: args.records,
      performUpsert: { fieldsToMergeOn: args.fields_to_merge_on },
    });
  }

  private async deleteRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.record_ids) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and record_ids are required' }], isError: true };
    }
    const ids = args.record_ids as string[];
    const params: Record<string, string> = {};
    ids.forEach((id, i) => { params[`records[${i}]`] = id; });
    return this.del(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}`, params);
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.filter_by_formula) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and filter_by_formula are required' }], isError: true };
    }
    const params: Record<string, string> = {
      filterByFormula: args.filter_by_formula as string,
    };
    if (args.max_records) params.maxRecords = String(args.max_records);
    if (Array.isArray(args.fields)) {
      (args.fields as string[]).forEach((f, i) => { params[`fields[${i}]`] = f; });
    }
    return this.get(`/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}`, params);
  }

  // ── Tables ─────────────────────────────────────────────────────────────────

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id) return { content: [{ type: 'text', text: 'base_id is required' }], isError: true };
    return this.get(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables`);
  }

  private async createTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.name || !args.fields) {
      return { content: [{ type: 'text', text: 'base_id, name, and fields are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, fields: args.fields };
    if (args.description) body.description = args.description;
    return this.post(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables`, body);
  }

  private async updateTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id) {
      return { content: [{ type: 'text', text: 'base_id and table_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name)        body.name        = args.name;
    if (args.description) body.description = args.description;
    return this.patch(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables/${encodeURIComponent(args.table_id as string)}`, body);
  }

  // ── Fields ─────────────────────────────────────────────────────────────────

  private async createField(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.name || !args.type) {
      return { content: [{ type: 'text', text: 'base_id, table_id, name, and type are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, type: args.type };
    if (args.description) body.description = args.description;
    if (args.options)     body.options     = args.options;
    return this.post(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables/${encodeURIComponent(args.table_id as string)}/fields`, body);
  }

  private async updateField(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.field_id) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and field_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.name)        body.name        = args.name;
    if (args.description) body.description = args.description;
    if (args.options)     body.options     = args.options;
    return this.patch(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables/${encodeURIComponent(args.table_id as string)}/fields/${encodeURIComponent(args.field_id as string)}`, body);
  }

  // ── Views ──────────────────────────────────────────────────────────────────

  private async listViews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id) {
      return { content: [{ type: 'text', text: 'base_id and table_id are required' }], isError: true };
    }
    return this.get(`/v0/meta/bases/${encodeURIComponent(args.base_id as string)}/tables/${encodeURIComponent(args.table_id as string)}/views`);
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id) return { content: [{ type: 'text', text: 'base_id is required' }], isError: true };
    return this.get(`/v0/bases/${encodeURIComponent(args.base_id as string)}/webhooks`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.notification_url || !args.specification) {
      return { content: [{ type: 'text', text: 'base_id, notification_url, and specification are required' }], isError: true };
    }
    return this.post(`/v0/bases/${encodeURIComponent(args.base_id as string)}/webhooks`, {
      notificationUrl: args.notification_url,
      specification: args.specification,
    });
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.webhook_id) {
      return { content: [{ type: 'text', text: 'base_id and webhook_id are required' }], isError: true };
    }
    return this.del(`/v0/bases/${encodeURIComponent(args.base_id as string)}/webhooks/${encodeURIComponent(args.webhook_id as string)}`);
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  private async listRecordComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.record_id) {
      return { content: [{ type: 'text', text: 'base_id, table_id, and record_id are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.offset) params.offset = args.offset as string;
    return this.get(
      `/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}/${encodeURIComponent(args.record_id as string)}/comments`,
      params,
    );
  }

  private async createRecordComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.base_id || !args.table_id || !args.record_id || !args.text) {
      return { content: [{ type: 'text', text: 'base_id, table_id, record_id, and text are required' }], isError: true };
    }
    return this.post(
      `/v0/${encodeURIComponent(args.base_id as string)}/${encodeURIComponent(args.table_id as string)}/${encodeURIComponent(args.record_id as string)}/comments`,
      { text: args.text },
    );
  }
}
