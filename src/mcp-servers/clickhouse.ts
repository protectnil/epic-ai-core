/**
 * ClickHouse MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ClickHouse/mcp-clickhouse — transport: stdio, HTTP, SSE,
//   auth: CLICKHOUSE_USER / CLICKHOUSE_PASSWORD env vars, published by ClickHouse Inc.
//   Actively maintained (last commit Mar 2026, v0.2.0 released Jan 2026).
//   Vendor MCP tool names: run_select_query, list_databases, list_tables — 3 tools total.
//   Fails criterion 3 (only 3 tools, threshold is 10+).
// Our adapter covers: 14 tools (full read + system introspection surface).
// Recommendation: use-rest-api — vendor MCP fails criterion 3 (3 tools < 10 threshold).
//   Our adapter is a strict superset: run_query + 11 system-introspection tools not in vendor MCP.
//
// Base URL: http://{host}:8123 (plain HTTP) or https://{host}:8443 (TLS)
// Auth: X-ClickHouse-User / X-ClickHouse-Key request headers
// Docs: https://clickhouse.com/docs/interfaces/http
// Rate limits: No documented global limit; governed by ClickHouse server-side quotas and
//   max_concurrent_queries setting (default: 100).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClickHouseConfig {
  host: string;
  user: string;
  password: string;
  /** Default database to query. Can be overridden per-call. Defaults to "default". */
  database?: string;
  /**
   * Override the full base URL including port and protocol.
   * Defaults to http://{host}:8123 for plain HTTP.
   * Use https://{host}:8443 for TLS / ClickHouse Cloud.
   */
  baseUrl?: string;
}

export class ClickHouseMCPServer extends MCPAdapterBase {
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;
  private readonly baseUrl: string;

  constructor(config: ClickHouseConfig) {
    super();
    this.user = config.user;
    this.password = config.password;
    this.database = config.database ?? 'default';
    this.baseUrl = config.baseUrl ?? `http://${config.host}:8123`;
  }

  static catalog() {
    return {
      name: 'clickhouse',
      displayName: 'ClickHouse',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['clickhouse', 'database', 'sql', 'olap', 'analytics', 'query', 'columnar', 'time-series'],
      toolNames: [
        'run_query', 'list_databases', 'list_tables', 'describe_table',
        'show_create_table', 'get_table_stats', 'get_running_queries',
        'kill_query', 'get_query_log', 'get_merges', 'get_mutations',
        'get_replication_queue', 'get_cluster_info', 'ping',
      ],
      description: 'Query and introspect ClickHouse databases via the HTTP interface. Execute SQL, inspect schemas, monitor running queries, and review system health.',
      author: 'protectnil' as const,
    };
  }

  private async executeQuery(
    query: string,
    database?: string,
    format: string = 'JSONCompact',
  ): Promise<Response> {
    const db = database ?? this.database;
    const url = `${this.baseUrl}/?database=${encodeURIComponent(db)}&default_format=${encodeURIComponent(format)}`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'X-ClickHouse-User': this.user,
        'X-ClickHouse-Key': this.password,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: query,
    });
  }

  private async jsonQuery(query: string, database?: string): Promise<ToolResult> {
    const response = await this.executeQuery(query, database);
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Query failed: HTTP ${response.status} — ${errorText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ClickHouse returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'run_query',
        description: 'Execute a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN, EXISTS, WITH) against ClickHouse and return results in JSONCompact format.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute. Must be a read-only query (SELECT, SHOW, DESCRIBE, EXPLAIN, EXISTS, WITH).',
            },
            database: {
              type: 'string',
              description: 'Database to run the query against. Overrides the configured default.',
            },
            max_rows: {
              type: 'number',
              description: 'Append LIMIT if query has none (max rows to return, default: 1000).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases in the ClickHouse instance.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in a database with engine type, column count, approximate row count, and disk size.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Database name to list tables from. Defaults to the configured default database.',
            },
          },
        },
      },
      {
        name: 'describe_table',
        description: 'Return the schema (column names, types, defaults, compression codecs) for a specific table.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to describe.',
            },
            database: {
              type: 'string',
              description: 'Database that contains the table. Defaults to the configured default database.',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'show_create_table',
        description: 'Return the CREATE TABLE DDL statement including engine, partition key, order key, and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name.',
            },
            database: {
              type: 'string',
              description: 'Database that contains the table. Defaults to the configured default database.',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'get_table_stats',
        description: 'Return row count, compressed size, and uncompressed size for a table from system.parts.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name.',
            },
            database: {
              type: 'string',
              description: 'Database that contains the table. Defaults to the configured default database.',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'get_running_queries',
        description: 'List currently running queries from system.processes including elapsed time, memory usage, and query text.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of running queries to return (default: 50).',
            },
          },
        },
      },
      {
        name: 'kill_query',
        description: 'Kill a running query by its query_id using KILL QUERY. Use with caution — terminates the query immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            query_id: {
              type: 'string',
              description: 'The query_id of the running query to kill, from get_running_queries.',
            },
            sync: {
              type: 'boolean',
              description: 'Wait for the query to be fully killed before returning (default: false).',
            },
          },
          required: ['query_id'],
        },
      },
      {
        name: 'get_query_log',
        description: 'Retrieve recent query history from system.query_log with status, duration, memory usage, and query text.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Filter by the database the queries ran against (optional).',
            },
            user: {
              type: 'string',
              description: 'Filter by ClickHouse user name (optional).',
            },
            status: {
              type: 'string',
              description: 'Filter by query status: QueryStart, QueryFinish, ExceptionBeforeStart, ExceptionWhileProcessing (optional).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 100).',
            },
            minutes_back: {
              type: 'number',
              description: 'Look back this many minutes from now (default: 60).',
            },
          },
        },
      },
      {
        name: 'get_merges',
        description: 'List active background merge operations from system.merges, including progress, size, and estimated completion.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Filter by database name (optional).',
            },
            table: {
              type: 'string',
              description: 'Filter by table name (optional).',
            },
          },
        },
      },
      {
        name: 'get_mutations',
        description: 'List pending or recently completed mutations from system.mutations — ALTER UPDATE/DELETE operations that run asynchronously.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Filter by database name (optional).',
            },
            table: {
              type: 'string',
              description: 'Filter by table name (optional).',
            },
            is_done: {
              type: 'boolean',
              description: 'Filter by completion status: true = completed, false = pending (default: returns all).',
            },
          },
        },
      },
      {
        name: 'get_replication_queue',
        description: 'List pending replication tasks from system.replication_queue for ReplicatedMergeTree tables.',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Filter by database name (optional).',
            },
            table: {
              type: 'string',
              description: 'Filter by table name (optional).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of queue entries to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'get_cluster_info',
        description: 'Return cluster topology from system.clusters: shard and replica configuration, hostnames, and ports.',
        inputSchema: {
          type: 'object',
          properties: {
            cluster: {
              type: 'string',
              description: 'Filter by cluster name (optional, returns all clusters if omitted).',
            },
          },
        },
      },
      {
        name: 'ping',
        description: 'Check if the ClickHouse server is reachable and responding to HTTP requests.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'run_query':
          return this.runQuery(args);
        case 'list_databases':
          return this.listDatabases();
        case 'list_tables':
          return this.listTables(args);
        case 'describe_table':
          return this.describeTable(args);
        case 'show_create_table':
          return this.showCreateTable(args);
        case 'get_table_stats':
          return this.getTableStats(args);
        case 'get_running_queries':
          return this.getRunningQueries(args);
        case 'kill_query':
          return this.killQuery(args);
        case 'get_query_log':
          return this.getQueryLog(args);
        case 'get_merges':
          return this.getMerges(args);
        case 'get_mutations':
          return this.getMutations(args);
        case 'get_replication_queue':
          return this.getReplicationQueue(args);
        case 'get_cluster_info':
          return this.getClusterInfo(args);
        case 'ping':
          return this.ping();
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

  private async runQuery(args: Record<string, unknown>): Promise<ToolResult> {
    let query = (args.query as string)?.trim();
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }

    const upperQuery = query.toUpperCase().replace(/\s+/g, ' ').trimStart();
    const allowedPrefixes = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC ', 'EXPLAIN', 'EXISTS', 'WITH'];
    if (!allowedPrefixes.some(prefix => upperQuery.startsWith(prefix))) {
      return { content: [{ type: 'text', text: 'Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN, EXISTS, WITH) are permitted' }], isError: true };
    }

    const maxRows = (args.max_rows as number) ?? 1000;
    if (!/\bLIMIT\b/i.test(query)) {
      query = `${query} LIMIT ${maxRows}`;
    }

    return this.jsonQuery(query, args.database as string | undefined);
  }

  private async listDatabases(): Promise<ToolResult> {
    return this.jsonQuery('SHOW DATABASES');
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    const database = (args.database as string) ?? this.database;
    const query = `
      SELECT
        name,
        engine,
        total_columns,
        formatReadableSize(total_bytes) AS size_on_disk,
        formatReadableQuantity(total_rows) AS row_count_approx
      FROM system.tables
      WHERE database = '${database.replace(/'/g, "\\'")}'
      ORDER BY name
    `;
    return this.jsonQuery(query);
  }

  private async describeTable(args: Record<string, unknown>): Promise<ToolResult> {
    const table = args.table as string;
    if (!table) {
      return { content: [{ type: 'text', text: 'table is required' }], isError: true };
    }
    const database = (args.database as string) ?? this.database;
    const query = `DESCRIBE TABLE \`${database.replace(/`/g, '')}\`.\`${table.replace(/`/g, '')}\``;
    return this.jsonQuery(query);
  }

  private async showCreateTable(args: Record<string, unknown>): Promise<ToolResult> {
    const table = args.table as string;
    if (!table) {
      return { content: [{ type: 'text', text: 'table is required' }], isError: true };
    }
    const database = (args.database as string) ?? this.database;
    const query = `SHOW CREATE TABLE \`${database.replace(/`/g, '')}\`.\`${table.replace(/`/g, '')}\``;

    const response = await this.executeQuery(query, undefined, 'TabSeparated');
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to show create table: HTTP ${response.status} — ${errorText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async getTableStats(args: Record<string, unknown>): Promise<ToolResult> {
    const table = args.table as string;
    if (!table) {
      return { content: [{ type: 'text', text: 'table is required' }], isError: true };
    }
    const database = (args.database as string) ?? this.database;
    const query = `
      SELECT
        database,
        table,
        formatReadableQuantity(sum(rows)) AS total_rows,
        formatReadableSize(sum(bytes_on_disk)) AS compressed_size,
        formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
        count() AS part_count
      FROM system.parts
      WHERE active = 1
        AND database = '${database.replace(/'/g, "\\'")}'
        AND table = '${table.replace(/'/g, "\\'")}'
      GROUP BY database, table
    `;
    return this.jsonQuery(query);
  }

  private async getRunningQueries(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const query = `
      SELECT
        query_id,
        user,
        elapsed,
        formatReadableSize(memory_usage) AS memory_usage,
        read_rows,
        read_bytes,
        total_rows_approx,
        query
      FROM system.processes
      ORDER BY elapsed DESC
      LIMIT ${limit}
    `;
    return this.jsonQuery(query);
  }

  private async killQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const queryId = args.query_id as string;
    if (!queryId) {
      return { content: [{ type: 'text', text: 'query_id is required' }], isError: true };
    }
    const sync = args.sync === true ? ' SYNC' : '';
    const query = `KILL QUERY WHERE query_id = '${queryId.replace(/'/g, "\\'")}'${sync}`;

    const response = await this.executeQuery(query, undefined, 'TabSeparated');
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Failed to kill query: HTTP ${response.status} — ${errorText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || `Kill query issued for query_id: ${queryId}` }], isError: false };
  }

  private async getQueryLog(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const minutesBack = (args.minutes_back as number) ?? 60;
    const conditions: string[] = [
      `event_time >= now() - INTERVAL ${minutesBack} MINUTE`,
    ];
    if (args.status) {
      conditions.push(`type = '${(args.status as string).replace(/'/g, "\\'")}'`);
    } else {
      conditions.push(`(type = 'QueryFinish' OR type = 'ExceptionWhileProcessing')`);
    }
    if (args.database) conditions.push(`databases[1] = '${(args.database as string).replace(/'/g, "\\'")}'`);
    if (args.user) conditions.push(`user = '${(args.user as string).replace(/'/g, "\\'")}'`);

    const query = `
      SELECT
        event_time,
        query_id,
        user,
        type,
        query_duration_ms,
        formatReadableSize(memory_usage) AS memory_usage,
        read_rows,
        result_rows,
        exception,
        query
      FROM system.query_log
      WHERE ${conditions.join(' AND ')}
      ORDER BY event_time DESC
      LIMIT ${limit}
    `;
    return this.jsonQuery(query);
  }

  private async getMerges(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: string[] = [];
    if (args.database) conditions.push(`database = '${(args.database as string).replace(/'/g, "\\'")}'`);
    if (args.table) conditions.push(`table = '${(args.table as string).replace(/'/g, "\\'")}'`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT
        database,
        table,
        elapsed,
        progress,
        num_parts,
        result_part_name,
        formatReadableSize(total_size_bytes_compressed) AS total_compressed,
        formatReadableSize(bytes_read_uncompressed) AS bytes_read,
        rows_read,
        rows_written,
        merge_type,
        merge_algorithm
      FROM system.merges
      ${where}
      ORDER BY elapsed DESC
    `;
    return this.jsonQuery(query);
  }

  private async getMutations(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: string[] = [];
    if (args.database) conditions.push(`database = '${(args.database as string).replace(/'/g, "\\'")}'`);
    if (args.table) conditions.push(`table = '${(args.table as string).replace(/'/g, "\\'")}'`);
    if (args.is_done === true) conditions.push(`is_done = 1`);
    if (args.is_done === false) conditions.push(`is_done = 0`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT
        database,
        table,
        mutation_id,
        command,
        create_time,
        block_numbers.partition_id AS partitions,
        parts_to_do,
        is_done,
        latest_failed_part,
        latest_fail_time,
        latest_fail_reason
      FROM system.mutations
      ${where}
      ORDER BY create_time DESC
      LIMIT 100
    `;
    return this.jsonQuery(query);
  }

  private async getReplicationQueue(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const conditions: string[] = [];
    if (args.database) conditions.push(`database = '${(args.database as string).replace(/'/g, "\\'")}'`);
    if (args.table) conditions.push(`table = '${(args.table as string).replace(/'/g, "\\'")}'`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT
        database,
        table,
        replica_name,
        position,
        node_name,
        type,
        create_time,
        num_tries,
        last_exception,
        last_attempt_time,
        num_postponed,
        postpone_reason,
        source_replica,
        new_part_name
      FROM system.replication_queue
      ${where}
      ORDER BY create_time ASC
      LIMIT ${limit}
    `;
    return this.jsonQuery(query);
  }

  private async getClusterInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: string[] = [];
    if (args.cluster) conditions.push(`cluster = '${(args.cluster as string).replace(/'/g, "\\'")}'`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT
        cluster,
        shard_num,
        shard_weight,
        replica_num,
        host_name,
        host_address,
        port,
        is_local,
        user,
        default_database,
        errors_count,
        slowdowns_count,
        estimated_recovery_time
      FROM system.clusters
      ${where}
      ORDER BY cluster, shard_num, replica_num
    `;
    return this.jsonQuery(query);
  }

  private async ping(): Promise<ToolResult> {
    const url = `${this.baseUrl}/ping`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        'X-ClickHouse-User': this.user,
        'X-ClickHouse-Key': this.password,
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Ping failed: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text.trim() || 'OK' }], isError: false };
  }
}
