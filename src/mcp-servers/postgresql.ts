/**
 * PostgreSQL MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/modelcontextprotocol/servers-archived/tree/main/src/postgres
// The original Anthropic/MCP PostgreSQL server is now archived (no commits in 6+ months).
// Active alternatives: pgEdge (github.com/pgEdge/pgedge-postgres-mcp), AWS Aurora MCP (awslabs.github.io/mcp).
// Our adapter covers: 12 tools (schema inspection + query execution via HTTP proxy).
// Recommendation: For direct DB connections, evaluate pgEdge MCP. Use this adapter for proxy-based air-gapped deployments.
//
// Base URL: User-supplied proxyUrl (e.g. https://your-db-proxy.internal)
// Auth: API key via X-API-Key header sent to the proxy
// Docs: https://www.postgresql.org/docs/current/ | information_schema reference: https://www.postgresql.org/docs/current/information-schema.html
// Rate limits: Determined by proxy configuration; proxy enforces timeoutMs per query

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

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

export class PostgreSQLMCPServer extends MCPAdapterBase {
  private readonly proxyUrl: string;
  private readonly apiKey: string;
  private readonly connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
  };

  constructor(config: PostgreSQLConfig) {
    super();
    this.proxyUrl = config.proxyUrl;
    this.apiKey = config.apiKey;
    this.connection = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ?? false,
    };
  }

  static catalog() {
    return {
      name: 'postgresql',
      displayName: 'PostgreSQL',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['postgresql', 'postgres', 'sql', 'database', 'db', 'query', 'schema', 'table', 'index', 'relational'],
      toolNames: [
        'execute_query',
        'list_schemas', 'list_tables', 'describe_table',
        'list_indexes', 'list_views', 'list_functions',
        'get_table_stats', 'get_database_stats',
        'explain_query', 'list_active_connections', 'list_locks',
      ],
      description: 'PostgreSQL database: execute SQL queries, inspect schemas and tables, list indexes and views, analyze query plans, and monitor active connections and locks.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'execute_query',
        description: 'Execute a SQL query against the PostgreSQL database with optional parameterized values and timeout',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute (required)',
            },
            params: {
              type: 'array',
              items: {},
              description: 'Parameterized query values in positional order ($1, $2, ...)',
            },
            timeout_ms: {
              type: 'number',
              description: 'Query timeout in milliseconds (default: 30000)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_schemas',
        description: 'List all schemas in the PostgreSQL database with optional system schema exclusion',
        inputSchema: {
          type: 'object',
          properties: {
            exclude_system: {
              type: 'boolean',
              description: 'Exclude system schemas (pg_* and information_schema) from results (default: true)',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables and views in a PostgreSQL schema with their type and row estimate',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Schema name to list tables from (default: public)',
            },
            include_views: {
              type: 'boolean',
              description: 'Include views in the results (default: true)',
            },
          },
          required: [],
        },
      },
      {
        name: 'describe_table',
        description: 'Get column definitions, data types, constraints, and nullability for a PostgreSQL table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to describe (required)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'list_indexes',
        description: 'List all indexes on a PostgreSQL table with index type, columns, and uniqueness',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to list indexes for (required)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'list_views',
        description: 'List all views in a PostgreSQL schema with their definition SQL',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Schema name to list views from (default: public)',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_functions',
        description: 'List all user-defined functions and stored procedures in a PostgreSQL schema',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Schema name to list functions from (default: public)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_table_stats',
        description: 'Get row count and size statistics (table, index, total) for a PostgreSQL table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to get stats for (required)',
            },
            schema: {
              type: 'string',
              description: 'Schema name (default: public)',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'get_database_stats',
        description: 'Get database-level statistics: total size, active connections, transaction counts, and cache hit ratio',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'explain_query',
        description: 'Run EXPLAIN ANALYZE on a SQL query to get the query execution plan with timing and row estimates',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to analyze (required)',
            },
            params: {
              type: 'array',
              items: {},
              description: 'Parameterized query values in positional order ($1, $2, ...)',
            },
            analyze: {
              type: 'boolean',
              description: 'Run EXPLAIN ANALYZE with actual execution (default: true). Set false for EXPLAIN only.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_active_connections',
        description: 'List active PostgreSQL connections with PID, state, query, duration, and client address',
        inputSchema: {
          type: 'object',
          properties: {
            include_idle: {
              type: 'boolean',
              description: 'Include idle connections in the results (default: false)',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_locks',
        description: 'List current PostgreSQL lock conflicts and waiting queries with holder and waiter details',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'execute_query': return await this.executeQuery(args);
        case 'list_schemas': return await this.listSchemas(args);
        case 'list_tables': return await this.listTables(args);
        case 'describe_table': return await this.describeTable(args);
        case 'list_indexes': return await this.listIndexes(args);
        case 'list_views': return await this.listViews(args);
        case 'list_functions': return await this.listFunctions(args);
        case 'get_table_stats': return await this.getTableStats(args);
        case 'get_database_stats': return await this.getDatabaseStats();
        case 'explain_query': return await this.explainQuery(args);
        case 'list_active_connections': return await this.listActiveConnections(args);
        case 'list_locks': return await this.listLocks();
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private async runQuery(sql: string, params: unknown[] = [], timeoutMs = 30_000): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.proxyUrl}/query`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        connection: this.connection,
        sql,
        params,
        timeoutMs,
      }),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }

    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: !response.ok,
    };
  }

  // ── Query Execution ───────────────────────────────────────────────────────

  private async executeQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const sql = String(args.query);
    const params = (args.params as unknown[]) ?? [];
    const timeoutMs = (args.timeout_ms as number) ?? 30_000;
    return this.runQuery(sql, params, timeoutMs);
  }

  // ── Schema Inspection ─────────────────────────────────────────────────────

  private async listSchemas(args: Record<string, unknown>): Promise<ToolResult> {
    const excludeSystem = args.exclude_system !== false;
    const sql = excludeSystem
      ? `SELECT schema_name, schema_owner
         FROM information_schema.schemata
         WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'
         ORDER BY schema_name`
      : `SELECT schema_name, schema_owner
         FROM information_schema.schemata
         ORDER BY schema_name`;
    return this.runQuery(sql);
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    const schema = (args.schema as string) ?? 'public';
    const includeViews = args.include_views !== false;
    const typeFilter = includeViews
      ? `table_type IN ('BASE TABLE', 'VIEW')`
      : `table_type = 'BASE TABLE'`;
    const sql = `
      SELECT
        t.table_name,
        t.table_type,
        COALESCE(s.n_live_tup, 0) AS estimated_row_count
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s
        ON s.schemaname = t.table_schema AND s.relname = t.table_name
      WHERE t.table_schema = $1
        AND ${typeFilter}
      ORDER BY t.table_name
    `;
    return this.runQuery(sql, [schema]);
  }

  private async describeTable(args: Record<string, unknown>): Promise<ToolResult> {
    const schema = (args.schema as string) ?? 'public';
    const sql = `
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.is_nullable,
        c.column_default,
        string_agg(DISTINCT tc.constraint_type, ', ') AS constraint_types
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_schema = kcu.table_schema
        AND c.table_name = kcu.table_name
        AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE c.table_schema = $1
        AND c.table_name = $2
      GROUP BY c.column_name, c.data_type, c.character_maximum_length,
               c.numeric_precision, c.numeric_scale, c.is_nullable,
               c.column_default, c.ordinal_position
      ORDER BY c.ordinal_position
    `;
    return this.runQuery(sql, [schema, args.table]);
  }

  private async listIndexes(args: Record<string, unknown>): Promise<ToolResult> {
    const schema = (args.schema as string) ?? 'public';
    const sql = `
      SELECT
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        am.amname AS index_type,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON am.oid = i.relam
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace ns ON ns.oid = t.relnamespace
      WHERE ns.nspname = $1
        AND t.relname = $2
        AND t.relkind = 'r'
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
      ORDER BY ix.indisprimary DESC, i.relname
    `;
    return this.runQuery(sql, [schema, args.table]);
  }

  private async listViews(args: Record<string, unknown>): Promise<ToolResult> {
    const schema = (args.schema as string) ?? 'public';
    const sql = `
      SELECT
        table_name AS view_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = $1
      ORDER BY table_name
    `;
    return this.runQuery(sql, [schema]);
  }

  private async listFunctions(args: Record<string, unknown>): Promise<ToolResult> {
    const schema = (args.schema as string) ?? 'public';
    const sql = `
      SELECT
        routine_name AS function_name,
        routine_type,
        data_type AS return_type,
        external_language AS language
      FROM information_schema.routines
      WHERE routine_schema = $1
      ORDER BY routine_name
    `;
    return this.runQuery(sql, [schema]);
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  private async getTableStats(args: Record<string, unknown>): Promise<ToolResult> {
    const schema = (args.schema as string) ?? 'public';
    const sql = `
      SELECT
        schemaname,
        relname AS table_name,
        n_live_tup AS estimated_row_count,
        n_dead_tup AS dead_tuples,
        last_autovacuum,
        last_autoanalyze,
        pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))) AS total_size,
        pg_size_pretty(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))) AS table_size,
        pg_size_pretty(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(relname))) AS index_size
      FROM pg_stat_user_tables
      WHERE schemaname = $1
        AND relname = $2
    `;
    return this.runQuery(sql, [schema, args.table]);
  }

  private async getDatabaseStats(): Promise<ToolResult> {
    const sql = `
      SELECT
        pg_database.datname AS database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) AS database_size,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
        blks_hit::float / NULLIF(blks_hit + blks_read, 0) * 100 AS cache_hit_ratio_pct,
        xact_commit AS committed_transactions,
        xact_rollback AS rolled_back_transactions,
        deadlocks
      FROM pg_stat_database
      JOIN pg_database ON pg_database.datname = pg_stat_database.datname
      WHERE pg_stat_database.datname = current_database()
    `;
    return this.runQuery(sql);
  }

  // ── Query Analysis ────────────────────────────────────────────────────────

  private async explainQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const analyze = args.analyze !== false;
    const params = (args.params as unknown[]) ?? [];
    const keyword = analyze ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)' : 'EXPLAIN (FORMAT JSON)';
    const sql = `${keyword} ${args.query as string}`;
    return this.runQuery(sql, params);
  }

  // ── Monitoring ────────────────────────────────────────────────────────────

  private async listActiveConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const includeIdle = args.include_idle === true;
    const stateFilter = includeIdle ? '' : `AND state != 'idle'`;
    const sql = `
      SELECT
        pid,
        usename AS username,
        application_name,
        client_addr,
        state,
        wait_event_type,
        wait_event,
        now() - query_start AS query_duration,
        left(query, 200) AS query_preview
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        ${stateFilter}
      ORDER BY query_duration DESC NULLS LAST
    `;
    return this.runQuery(sql);
  }

  private async listLocks(): Promise<ToolResult> {
    const sql = `
      SELECT
        blocked.pid AS blocked_pid,
        blocked.usename AS blocked_user,
        blocking.pid AS blocking_pid,
        blocking.usename AS blocking_user,
        blocked.wait_event_type,
        blocked.wait_event,
        now() - blocked.query_start AS blocked_duration,
        left(blocked.query, 200) AS blocked_query,
        left(blocking.query, 200) AS blocking_query
      FROM pg_stat_activity blocked
      JOIN pg_stat_activity blocking
        ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
      WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0
      ORDER BY blocked_duration DESC NULLS LAST
    `;
    return this.runQuery(sql);
  }
}
