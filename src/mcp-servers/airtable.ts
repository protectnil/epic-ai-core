/** Airtable MCP Server
 * Provides access to Airtable bases, records, and tables via the Airtable REST API
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface AirtableConfig {
  pat: string;
  baseUrl?: string;
}

export class AirtableMCPServer {
  private readonly pat: string;
  private readonly baseUrl: string;

  constructor(config: AirtableConfig) {
    this.pat = config.pat;
    this.baseUrl = config.baseUrl || 'https://api.airtable.com/v0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_records',
        description: 'List records from an Airtable table with optional filtering and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'The Airtable base ID (e.g. appXXXXXXXXXXXXXX)',
            },
            table_id: {
              type: 'string',
              description: 'The table ID or table name',
            },
            filter_by_formula: {
              type: 'string',
              description: 'Airtable formula to filter records (e.g. {Status}="Active")',
            },
            max_records: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
          required: ['base_id', 'table_id'],
        },
      },
      {
        name: 'get_record',
        description: 'Retrieve a single record from an Airtable table by record ID',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'The Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'The table ID or table name',
            },
            record_id: {
              type: 'string',
              description: 'The record ID (e.g. recXXXXXXXXXXXXXX)',
            },
          },
          required: ['base_id', 'table_id', 'record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new record in an Airtable table',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'The Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'The table ID or table name',
            },
            fields: {
              type: 'object',
              description: 'Field names and values for the new record',
              additionalProperties: true,
            },
          },
          required: ['base_id', 'table_id', 'fields'],
        },
      },
      {
        name: 'update_record',
        description: 'Update fields on an existing Airtable record (PATCH — only specified fields are updated)',
        inputSchema: {
          type: 'object',
          properties: {
            base_id: {
              type: 'string',
              description: 'The Airtable base ID',
            },
            table_id: {
              type: 'string',
              description: 'The table ID or table name',
            },
            record_id: {
              type: 'string',
              description: 'The record ID to update',
            },
            fields: {
              type: 'object',
              description: 'Field names and updated values',
              additionalProperties: true,
            },
          },
          required: ['base_id', 'table_id', 'record_id', 'fields'],
        },
      },
      {
        name: 'list_bases',
        description: 'List all Airtable bases accessible to the authenticated token',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.pat}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_records': {
          const baseId = args.base_id as string;
          const tableId = args.table_id as string;
          if (!baseId || !tableId) {
            return { content: [{ type: 'text', text: 'base_id and table_id are required' }], isError: true };
          }
          const params = new URLSearchParams();
          if (args.filter_by_formula) params.set('filterByFormula', args.filter_by_formula as string);
          if (args.max_records) params.set('maxRecords', String(args.max_records));
          if (args.offset) params.set('offset', args.offset as string);
          const qs = params.toString();
          const url = `${this.baseUrl}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list records: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airtable returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_record': {
          const baseId = args.base_id as string;
          const tableId = args.table_id as string;
          const recordId = args.record_id as string;
          if (!baseId || !tableId || !recordId) {
            return { content: [{ type: 'text', text: 'base_id, table_id, and record_id are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(recordId)}`,
            { method: 'GET', headers }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get record: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airtable returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_record': {
          const baseId = args.base_id as string;
          const tableId = args.table_id as string;
          const fields = args.fields as Record<string, unknown>;
          if (!baseId || !tableId || !fields) {
            return { content: [{ type: 'text', text: 'base_id, table_id, and fields are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`,
            { method: 'POST', headers, body: JSON.stringify({ fields }) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create record: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airtable returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'update_record': {
          const baseId = args.base_id as string;
          const tableId = args.table_id as string;
          const recordId = args.record_id as string;
          const fields = args.fields as Record<string, unknown>;
          if (!baseId || !tableId || !recordId || !fields) {
            return { content: [{ type: 'text', text: 'base_id, table_id, record_id, and fields are required' }], isError: true };
          }
          const response = await fetch(
            `${this.baseUrl}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(recordId)}`,
            { method: 'PATCH', headers, body: JSON.stringify({ fields }) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to update record: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airtable returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_bases': {
          let url = 'https://api.airtable.com/v0/meta/bases';
          if (args.offset) url += `?offset=${encodeURIComponent(args.offset as string)}`;
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list bases: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Airtable returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
}
