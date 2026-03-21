/** PostgreSQL MCP Server
 * PostgreSQL database query and schema inspection via HTTP proxy
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PostgreSQLConfig {
  proxyUrl: string;
  apiKey: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class PostgreSQLMCPServer {
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    this.config = config;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'execute_query',
        description: 'Execute a SQL query against the PostgreSQL database',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute' },
            params: { type: 'array', description: 'Parameterized query values', items: {} },
            timeoutMs: { type: 'number', description: 'Query timeout in milliseconds' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the database',
        inputSchema: {
          type: 'object',
          properties: {
            schema: { type: 'string', description: 'Schema name (default: public)' },
          },
        },
      },
      {
        name: 'describe_table',
        description: 'Get column definitions and constraints for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            schema: { type: 'string', description: 'Schema name (default: public)' },
          },
          required: ['table'],
        },
      },
      {
        name: 'list_schemas',
        description: 'List all schemas in the database',
        inputSchema: {
          type: 'object',
          properties: {
            excludeSystem: { type: 'boolean', description: 'Exclude pg_* and information_schema (default true)' },
          },
        },
      },
      {
        name: 'get_table_stats',
        description: 'Get row count and size statistics for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            schema: { type: 'string', description: 'Schema name (default: public)' },
          },
          required: ['table'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    };

    const connection = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ?? false,
    };

    try {
      let sql: string;
      let params: unknown[] = [];

      switch (name) {
        case 'execute_query': {
          sql = String(args.query);
          params = (args.params as unknown[]) ?? [];
          break;
        }
        case 'list_tables': {
          const schema = args.schema ?? 'public';
          sql = `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`;
          params = [schema];
          break;
        }
        case 'describe_table': {
          const schema = args.schema ?? 'public';
          sql = `
            SELECT
              c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default,
              c.character_maximum_length,
              c.numeric_precision,
              tc.constraint_type
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu
              ON c.table_schema = kcu.table_schema
              AND c.table_name = kcu.table_name
              AND c.column_name = kcu.column_name
            LEFT JOIN information_schema.table_constraints tc
              ON kcu.constraint_name = tc.constraint_name
              AND kcu.table_schema = tc.table_schema
            WHERE c.table_schema = $1 AND c.table_name = $2
            ORDER BY c.ordinal_position
          `;
          params = [schema, args.table];
          break;
        }
        case 'list_schemas': {
          const excludeSystem = args.excludeSystem !== false;
          sql = excludeSystem
            ? `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema' ORDER BY schema_name`
            : `SELECT schema_name FROM information_schema.schemata ORDER BY schema_name`;
          break;
        }
        case 'get_table_stats': {
          const schema = args.schema ?? 'public';
          sql = `
            SELECT
              schemaname,
              tablename,
              n_live_tup AS row_count,
              pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) AS total_size,
              pg_size_pretty(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) AS table_size,
              pg_size_pretty(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) AS index_size
            FROM pg_stat_user_tables
            WHERE schemaname = $1 AND tablename = $2
          `;
          params = [schema, args.table];
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(`${this.config.proxyUrl}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ connection, sql, params, timeoutMs: args.timeoutMs ?? 30000 }),
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
