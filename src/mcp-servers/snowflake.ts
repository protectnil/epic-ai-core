/** Snowflake MCP Server
 * Snowflake Data Cloud query and metadata operations
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SnowflakeConfig {
  account: string;
  token: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

export class SnowflakeMCPServer {
  private config: SnowflakeConfig;
  private baseUrl: string;

  constructor(config: SnowflakeConfig) {
    this.config = config;
    this.baseUrl = `https://${config.account}.snowflakecomputing.com/api/v2`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'execute_statement',
        description: 'Execute a SQL statement in Snowflake',
        inputSchema: {
          type: 'object',
          properties: {
            statement: { type: 'string', description: 'SQL statement to execute' },
            timeout: { type: 'number', description: 'Execution timeout in seconds' },
            warehouse: { type: 'string', description: 'Warehouse to use' },
            database: { type: 'string', description: 'Database context' },
            schema: { type: 'string', description: 'Schema context' },
            role: { type: 'string', description: 'Role to use' },
          },
          required: ['statement'],
        },
      },
      {
        name: 'get_statement_status',
        description: 'Get the status of an asynchronous statement execution',
        inputSchema: {
          type: 'object',
          properties: {
            statementHandle: { type: 'string', description: 'Statement handle from execute_statement' },
          },
          required: ['statementHandle'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases accessible to the current role',
        inputSchema: {
          type: 'object',
          properties: {
            like: { type: 'string', description: 'Filter databases by name pattern' },
          },
        },
      },
      {
        name: 'list_schemas',
        description: 'List schemas within a database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            like: { type: 'string', description: 'Filter schemas by name pattern' },
          },
          required: ['database'],
        },
      },
      {
        name: 'list_tables',
        description: 'List tables within a database and schema',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            like: { type: 'string', description: 'Filter tables by name pattern' },
          },
          required: ['database', 'schema'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'X-Snowflake-Authorization-Token-Type': 'OAUTH',
      'Accept': 'application/json',
    };

    try {
      let url: string;
      let method: string;
      let body: unknown;

      switch (name) {
        case 'execute_statement': {
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = {
            statement: args.statement,
            timeout: args.timeout ?? 60,
            warehouse: args.warehouse ?? this.config.warehouse,
            database: args.database ?? this.config.database,
            schema: args.schema ?? this.config.schema,
            role: args.role ?? this.config.role,
          };
          break;
        }
        case 'get_statement_status': {
          url = `${this.baseUrl}/statements/${args.statementHandle}`;
          method = 'GET';
          break;
        }
        case 'list_databases': {
          const statement = args.like
            ? `SHOW DATABASES LIKE '${args.like}'`
            : 'SHOW DATABASES';
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = { statement, timeout: 30 };
          break;
        }
        case 'list_schemas': {
          const statement = args.like
            ? `SHOW SCHEMAS LIKE '${args.like}' IN DATABASE "${args.database}"`
            : `SHOW SCHEMAS IN DATABASE "${args.database}"`;
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = { statement, timeout: 30, database: args.database };
          break;
        }
        case 'list_tables': {
          const statement = args.like
            ? `SHOW TABLES LIKE '${args.like}' IN SCHEMA "${args.database}"."${args.schema}"`
            : `SHOW TABLES IN SCHEMA "${args.database}"."${args.schema}"`;
          url = `${this.baseUrl}/statements`;
          method = 'POST';
          body = { statement, timeout: 30, database: args.database, schema: args.schema };
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
