/**
 * Snowflake MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Snowflake-Labs/mcp — transport: stdio/streamable-HTTP, auth: key-pair or PAT
// The Snowflake-Labs MCP server is config-driven: tools are dynamically defined per deployment (Cortex Search,
// Cortex Analyst, SQL execution, object management). It does not expose a fixed tool list — tools are
// user-specified in a YAML config. Because the MCP tool set is variable and deployment-specific, a comparison
// with a fixed count is not meaningful. Additionally, Snowflake maintains a second MCP offering:
// the Snowflake-managed MCP server (https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp)
// which is a server-side object supporting Cortex Analyst, Cortex Search, Cortex Agents, and SQL execution tools.
// Our adapter covers: 14 tools. MCP tools: variable (config-driven, no fixed count).
// Recommendation: use-both — vendor MCP is preferred for Cortex AI (Analyst/Search/Agent) workflows;
// this REST adapter covers programmatic SQL execution and schema/warehouse management for non-Cortex use cases.
//
// Integration: use-both
// MCP-sourced tools: Cortex AI workflows (Cortex Analyst, Cortex Search, Cortex Agent, SQL execution via MCP)
// REST-sourced tools (14): execute_statement, get_statement_status, cancel_statement, get_statement_partition,
//   list_databases, list_schemas, list_tables, describe_table, list_warehouses, get_warehouse,
//   suspend_warehouse, resume_warehouse, list_roles, list_columns
//
// Base URL: https://{account}.snowflakecomputing.com/api/v2
// Auth: OAuth Bearer token (OAUTH) or key-pair JWT (KEYPAIR_JWT) — set via X-Snowflake-Authorization-Token-Type header
// Docs: https://docs.snowflake.com/en/developer-guide/sql-api/index
//       https://docs.snowflake.com/en/developer-guide/snowflake-rest-api/snowflake-rest-api
// Rate limits: Snowflake enforces warehouse concurrency limits, not fixed req/min API rate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SnowflakeConfig {
  account: string;
  token: string;
  tokenType?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

/**
 * Sanitize a LIKE pattern: allow alphanumerics, underscores, hyphens, dots,
 * and the SQL wildcard characters % and _. All other characters are stripped.
 */
function sanitizeLike(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9_%.\-]/g, '');
}

/**
 * Sanitize a Snowflake object identifier (database, schema, table, warehouse name).
 * Snowflake unquoted identifiers are alphanumeric + underscore.
 */
function sanitizeIdentifier(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Sanitize a Snowflake statement handle (UUID format).
 * Allow only hex digits and hyphens.
 */
function sanitizeHandle(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Fa-f0-9\-]/g, '');
}

export class SnowflakeMCPServer extends MCPAdapterBase {
  private readonly config: SnowflakeConfig;
  private readonly baseUrl: string;

  constructor(config: SnowflakeConfig) {
    super();
    this.config = config;
    this.baseUrl = `https://${config.account}.snowflakecomputing.com/api/v2`;
  }

  static catalog() {
    return {
      name: 'snowflake',
      displayName: 'Snowflake',
      version: '1.0.0',
      category: 'data',
      keywords: ['snowflake', 'sql', 'database', 'warehouse', 'query', 'data warehouse', 'schema', 'table', 'analytics', 'cloud database'],
      toolNames: [
        'execute_statement', 'get_statement_status', 'cancel_statement', 'get_statement_partition',
        'list_databases', 'list_schemas', 'list_tables', 'describe_table',
        'list_warehouses', 'get_warehouse', 'suspend_warehouse', 'resume_warehouse',
        'list_roles', 'list_columns',
      ],
      description: 'Snowflake cloud data warehouse: execute SQL, manage warehouses, explore databases, schemas, tables, and columns.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'execute_statement',
        description: 'Execute a SQL statement in Snowflake and return results synchronously or asynchronously via statement handle',
        inputSchema: {
          type: 'object',
          properties: {
            statement: {
              type: 'string',
              description: 'SQL statement to execute (SELECT, INSERT, UPDATE, DELETE, DDL, etc.)',
            },
            timeout: {
              type: 'number',
              description: 'Execution timeout in seconds (default: 60)',
            },
            warehouse: {
              type: 'string',
              description: 'Warehouse to use for this statement (overrides default)',
            },
            database: {
              type: 'string',
              description: 'Database context for this statement',
            },
            schema: {
              type: 'string',
              description: 'Schema context for this statement',
            },
            role: {
              type: 'string',
              description: 'Role to use for this statement',
            },
            async: {
              type: 'boolean',
              description: 'Execute asynchronously and return a statement handle (default: false)',
            },
          },
          required: ['statement'],
        },
      },
      {
        name: 'get_statement_status',
        description: 'Get the execution status and results of an asynchronous statement by its handle',
        inputSchema: {
          type: 'object',
          properties: {
            statementHandle: {
              type: 'string',
              description: 'Statement handle UUID returned by execute_statement with async: true',
            },
          },
          required: ['statementHandle'],
        },
      },
      {
        name: 'cancel_statement',
        description: 'Cancel a running or queued asynchronous statement execution by its handle',
        inputSchema: {
          type: 'object',
          properties: {
            statementHandle: {
              type: 'string',
              description: 'Statement handle UUID of the statement to cancel',
            },
          },
          required: ['statementHandle'],
        },
      },
      {
        name: 'get_statement_partition',
        description: 'Retrieve a specific result partition for a large statement result set that was split across multiple partitions',
        inputSchema: {
          type: 'object',
          properties: {
            statementHandle: {
              type: 'string',
              description: 'Statement handle UUID of the completed statement',
            },
            partition: {
              type: 'number',
              description: 'Zero-based partition index to retrieve',
            },
          },
          required: ['statementHandle', 'partition'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases accessible to the current role with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            like: {
              type: 'string',
              description: 'Filter databases by name pattern (supports SQL LIKE wildcards % and _)',
            },
          },
        },
      },
      {
        name: 'list_schemas',
        description: 'List schemas within a database with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name to list schemas from',
            },
            like: {
              type: 'string',
              description: 'Filter schemas by name pattern (supports SQL LIKE wildcards)',
            },
          },
          required: ['database'],
        },
      },
      {
        name: 'list_tables',
        description: 'List tables within a database schema with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name',
            },
            schema: {
              type: 'string',
              description: 'Schema name',
            },
            like: {
              type: 'string',
              description: 'Filter tables by name pattern (supports SQL LIKE wildcards)',
            },
          },
          required: ['database', 'schema'],
        },
      },
      {
        name: 'describe_table',
        description: 'Describe the columns and data types of a table or view',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name',
            },
            schema: {
              type: 'string',
              description: 'Schema name',
            },
            table: {
              type: 'string',
              description: 'Table or view name',
            },
          },
          required: ['database', 'schema', 'table'],
        },
      },
      {
        name: 'list_warehouses',
        description: 'List all virtual warehouses accessible to the current role with status and sizing info',
        inputSchema: {
          type: 'object',
          properties: {
            like: {
              type: 'string',
              description: 'Filter warehouses by name pattern (supports SQL LIKE wildcards)',
            },
          },
        },
      },
      {
        name: 'get_warehouse',
        description: 'Get detailed information about a specific warehouse including status, size, and auto-suspend settings',
        inputSchema: {
          type: 'object',
          properties: {
            warehouseName: {
              type: 'string',
              description: 'Name of the warehouse to describe',
            },
          },
          required: ['warehouseName'],
        },
      },
      {
        name: 'suspend_warehouse',
        description: 'Suspend a virtual warehouse to stop compute costs. Warehouse must be in STARTED/RUNNING state.',
        inputSchema: {
          type: 'object',
          properties: {
            warehouseName: {
              type: 'string',
              description: 'Name of the warehouse to suspend',
            },
          },
          required: ['warehouseName'],
        },
      },
      {
        name: 'resume_warehouse',
        description: 'Resume a suspended virtual warehouse to bring it back to RUNNING state',
        inputSchema: {
          type: 'object',
          properties: {
            warehouseName: {
              type: 'string',
              description: 'Name of the warehouse to resume',
            },
          },
          required: ['warehouseName'],
        },
      },
      {
        name: 'list_roles',
        description: 'List all roles accessible to the current user with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            like: {
              type: 'string',
              description: 'Filter roles by name pattern (supports SQL LIKE wildcards)',
            },
          },
        },
      },
      {
        name: 'list_columns',
        description: 'List columns in a specific table or view with data types and nullability',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name',
            },
            schema: {
              type: 'string',
              description: 'Schema name',
            },
            table: {
              type: 'string',
              description: 'Table or view name',
            },
            like: {
              type: 'string',
              description: 'Filter columns by name pattern (supports SQL LIKE wildcards)',
            },
          },
          required: ['database', 'schema', 'table'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'execute_statement':
          return this.executeStatement(args);
        case 'get_statement_status':
          return this.getStatementStatus(args);
        case 'cancel_statement':
          return this.cancelStatement(args);
        case 'get_statement_partition':
          return this.getStatementPartition(args);
        case 'list_databases':
          return this.listDatabases(args);
        case 'list_schemas':
          return this.listSchemas(args);
        case 'list_tables':
          return this.listTables(args);
        case 'describe_table':
          return this.describeTable(args);
        case 'list_warehouses':
          return this.listWarehouses(args);
        case 'get_warehouse':
          return this.getWarehouse(args);
        case 'suspend_warehouse':
          return this.suspendWarehouse(args);
        case 'resume_warehouse':
          return this.resumeWarehouse(args);
        case 'list_roles':
          return this.listRoles(args);
        case 'list_columns':
          return this.listColumns(args);
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
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'X-Snowflake-Authorization-Token-Type': (this.config.tokenType as string) || 'OAUTH',
      Accept: 'application/json',
    };
  }

  private async sqlPost(body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/statements`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async executeStatement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.statement) return { content: [{ type: 'text', text: 'statement is required' }], isError: true };
    const body: Record<string, unknown> = {
      statement: args.statement,
      timeout: (args.timeout as number) ?? 60,
      warehouse: (args.warehouse as string) ?? this.config.warehouse,
      database: (args.database as string) ?? this.config.database,
      schema: (args.schema as string) ?? this.config.schema,
      role: (args.role as string) ?? this.config.role,
    };
    if (args.async === true) body.async = true;
    return this.sqlPost(body);
  }

  private async getStatementStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const handle = sanitizeHandle(args.statementHandle);
    if (!handle) return { content: [{ type: 'text', text: 'statementHandle is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/statements/${handle}`, {
      method: 'GET',
      headers: this.headers,
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async cancelStatement(args: Record<string, unknown>): Promise<ToolResult> {
    const handle = sanitizeHandle(args.statementHandle);
    if (!handle) return { content: [{ type: 'text', text: 'statementHandle is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/statements/${handle}/cancel`, {
      method: 'POST',
      headers: this.headers,
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async getStatementPartition(args: Record<string, unknown>): Promise<ToolResult> {
    const handle = sanitizeHandle(args.statementHandle);
    const partition = args.partition as number;
    if (!handle) return { content: [{ type: 'text', text: 'statementHandle is required' }], isError: true };
    if (partition === undefined || partition === null) return { content: [{ type: 'text', text: 'partition is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/statements/${handle}?partition=${partition}`, {
      method: 'GET',
      headers: this.headers,
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    const like = sanitizeLike(args.like);
    const statement = like ? `SHOW DATABASES LIKE '${like}'` : 'SHOW DATABASES';
    return this.sqlPost({ statement, timeout: 30 });
  }

  private async listSchemas(args: Record<string, unknown>): Promise<ToolResult> {
    const db = sanitizeIdentifier(args.database);
    if (!db) return { content: [{ type: 'text', text: 'database is required' }], isError: true };
    const like = sanitizeLike(args.like);
    const statement = like
      ? `SHOW SCHEMAS LIKE '${like}' IN DATABASE "${db}"`
      : `SHOW SCHEMAS IN DATABASE "${db}"`;
    return this.sqlPost({ statement, timeout: 30, database: db });
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    const db = sanitizeIdentifier(args.database);
    const sc = sanitizeIdentifier(args.schema);
    if (!db || !sc) return { content: [{ type: 'text', text: 'database and schema are required' }], isError: true };
    const like = sanitizeLike(args.like);
    const statement = like
      ? `SHOW TABLES LIKE '${like}' IN SCHEMA "${db}"."${sc}"`
      : `SHOW TABLES IN SCHEMA "${db}"."${sc}"`;
    return this.sqlPost({ statement, timeout: 30, database: db, schema: sc });
  }

  private async describeTable(args: Record<string, unknown>): Promise<ToolResult> {
    const db = sanitizeIdentifier(args.database);
    const sc = sanitizeIdentifier(args.schema);
    const tbl = sanitizeIdentifier(args.table);
    if (!db || !sc || !tbl) return { content: [{ type: 'text', text: 'database, schema, and table are required' }], isError: true };
    return this.sqlPost({
      statement: `DESCRIBE TABLE "${db}"."${sc}"."${tbl}"`,
      timeout: 30,
      database: db,
      schema: sc,
    });
  }

  private async listWarehouses(args: Record<string, unknown>): Promise<ToolResult> {
    const like = sanitizeLike(args.like);
    const statement = like ? `SHOW WAREHOUSES LIKE '${like}'` : 'SHOW WAREHOUSES';
    return this.sqlPost({ statement, timeout: 30 });
  }

  private async getWarehouse(args: Record<string, unknown>): Promise<ToolResult> {
    const name = sanitizeIdentifier(args.warehouseName);
    if (!name) return { content: [{ type: 'text', text: 'warehouseName is required' }], isError: true };
    return this.sqlPost({ statement: `SHOW WAREHOUSES LIKE '${name}'`, timeout: 30 });
  }

  private async suspendWarehouse(args: Record<string, unknown>): Promise<ToolResult> {
    const name = sanitizeIdentifier(args.warehouseName);
    if (!name) return { content: [{ type: 'text', text: 'warehouseName is required' }], isError: true };
    return this.sqlPost({ statement: `ALTER WAREHOUSE "${name}" SUSPEND`, timeout: 30 });
  }

  private async resumeWarehouse(args: Record<string, unknown>): Promise<ToolResult> {
    const name = sanitizeIdentifier(args.warehouseName);
    if (!name) return { content: [{ type: 'text', text: 'warehouseName is required' }], isError: true };
    return this.sqlPost({ statement: `ALTER WAREHOUSE "${name}" RESUME`, timeout: 30 });
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const like = sanitizeLike(args.like);
    const statement = like ? `SHOW ROLES LIKE '${like}'` : 'SHOW ROLES';
    return this.sqlPost({ statement, timeout: 30 });
  }

  private async listColumns(args: Record<string, unknown>): Promise<ToolResult> {
    const db = sanitizeIdentifier(args.database);
    const sc = sanitizeIdentifier(args.schema);
    const tbl = sanitizeIdentifier(args.table);
    if (!db || !sc || !tbl) return { content: [{ type: 'text', text: 'database, schema, and table are required' }], isError: true };
    const like = sanitizeLike(args.like);
    const statement = like
      ? `SHOW COLUMNS LIKE '${like}' IN TABLE "${db}"."${sc}"."${tbl}"`
      : `SHOW COLUMNS IN TABLE "${db}"."${sc}"."${tbl}"`;
    return this.sqlPost({ statement, timeout: 30, database: db, schema: sc });
  }
}
