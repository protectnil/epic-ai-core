/** Supabase MCP Server
 * Supabase PostgreSQL REST API operations
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SupabaseConfig {
  project: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export class SupabaseMCPServer {
  private config: SupabaseConfig;
  private baseUrl: string;

  constructor(config: SupabaseConfig) {
    this.config = config;
    this.baseUrl = `https://${config.project}.supabase.co/rest/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'select',
        description: 'Query rows from a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            select: { type: 'string', description: 'Columns to select (default: *)' },
            filters: { type: 'object', description: 'Key-value filter pairs appended as query params' },
            order: { type: 'string', description: 'Order expression (e.g. created_at.desc)' },
            limit: { type: 'number', description: 'Maximum rows to return' },
            offset: { type: 'number', description: 'Row offset for pagination' },
            useServiceRole: { type: 'boolean', description: 'Use service role key (bypasses RLS)' },
          },
          required: ['table'],
        },
      },
      {
        name: 'insert',
        description: 'Insert one or more rows into a table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            rows: { type: 'array', description: 'Array of row objects to insert', items: { type: 'object' } },
            onConflict: { type: 'string', description: 'Conflict resolution: ignore or update' },
            useServiceRole: { type: 'boolean', description: 'Use service role key' },
          },
          required: ['table', 'rows'],
        },
      },
      {
        name: 'update',
        description: 'Update rows matching filter conditions',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            updates: { type: 'object', description: 'Fields to update' },
            filters: { type: 'object', description: 'Key-value filter pairs to match rows' },
            useServiceRole: { type: 'boolean', description: 'Use service role key' },
          },
          required: ['table', 'updates', 'filters'],
        },
      },
      {
        name: 'delete',
        description: 'Delete rows matching filter conditions',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            filters: { type: 'object', description: 'Key-value filter pairs to match rows' },
            useServiceRole: { type: 'boolean', description: 'Use service role key' },
          },
          required: ['table', 'filters'],
        },
      },
      {
        name: 'rpc',
        description: 'Call a Supabase database function (RPC)',
        inputSchema: {
          type: 'object',
          properties: {
            fn: { type: 'string', description: 'Function name' },
            params: { type: 'object', description: 'Function parameters' },
            useServiceRole: { type: 'boolean', description: 'Use service role key' },
          },
          required: ['fn'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.useServiceRole && this.config.serviceRoleKey
      ? this.config.serviceRoleKey
      : this.config.anonKey;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    try {
      let url: string;
      let method: string;
      let body: unknown;

      switch (name) {
        case 'select': {
          const params = new URLSearchParams();
          params.set('select', String(args.select ?? '*'));
          if (args.order) params.set('order', String(args.order));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          if (args.filters && typeof args.filters === 'object') {
            for (const [k, v] of Object.entries(args.filters as Record<string, unknown>)) {
              params.set(k, `eq.${v}`);
            }
          }
          url = `${this.baseUrl}/${args.table}?${params}`;
          method = 'GET';
          break;
        }
        case 'insert': {
          url = `${this.baseUrl}/${args.table}`;
          method = 'POST';
          body = args.rows;
          if (args.onConflict) {
            headers['Prefer'] = args.onConflict === 'update'
              ? 'return=representation,resolution=merge-duplicates'
              : 'return=representation,resolution=ignore-duplicates';
          }
          break;
        }
        case 'update': {
          const params = new URLSearchParams();
          if (args.filters && typeof args.filters === 'object') {
            for (const [k, v] of Object.entries(args.filters as Record<string, unknown>)) {
              params.set(k, `eq.${v}`);
            }
          }
          url = `${this.baseUrl}/${args.table}?${params}`;
          method = 'PATCH';
          body = args.updates;
          break;
        }
        case 'delete': {
          const params = new URLSearchParams();
          if (args.filters && typeof args.filters === 'object') {
            for (const [k, v] of Object.entries(args.filters as Record<string, unknown>)) {
              params.set(k, `eq.${v}`);
            }
          }
          url = `${this.baseUrl}/${args.table}?${params}`;
          method = 'DELETE';
          break;
        }
        case 'rpc': {
          url = `${this.baseUrl}/rpc/${args.fn}`;
          method = 'POST';
          body = args.params ?? {};
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(url!, {
        method: method!,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
