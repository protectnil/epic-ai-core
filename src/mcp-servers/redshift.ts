/**
 * AWS Redshift MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/awslabs/mcp/tree/main/src/redshift-mcp-server — transport: stdio, auth: AWS IAM
// AWS Labs Python-based MCP server (awslabs.redshift-mcp-server on PyPI). Actively maintained as of 2026.
// Vendor MCP covers: 6 tools (list_clusters, list_databases, list_schemas, list_tables, list_columns, execute_query)
// Our adapter covers: 11 tools (full Redshift Data API surface)
// Recommendation: use-both — each side has unique tools the other lacks.
//
// Integration: use-both
// MCP-sourced tools (2): [list_clusters, list_columns]
//   list_clusters — discovers all clusters/workgroups; no Data API equivalent
//   list_columns  — lists table columns; our adapter uses describe_table instead
// REST-sourced tools (9): [list_databases, list_schemas, list_tables, describe_table,
//   execute_statement, batch_execute_statement, describe_statement, get_statement_result,
//   get_statement_result_v2, list_statements, cancel_statement]
//   NOTE: list_databases/list_schemas/list_tables are shared (MCP + REST); REST adapter covers them.
//   MCP execute_query maps to execute_statement + describe_statement + get_statement_result combined.
// Combined coverage: ~13 logical operations (MCP: 6 + REST: 11 — shared: 4)
//
// Base URL: https://redshift-data.{region}.amazonaws.com
// Auth: AWS Signature Version 4 (SigV4). The adapter accepts a signRequest callback
//       so callers supply their own SigV4 signer (e.g. @aws-sdk/signature-v4, aws4).
//       All requests POST to the regional endpoint with X-Amz-Target header.
// Docs: https://docs.aws.amazon.com/redshift-data/latest/APIReference/Welcome.html
// Rate limits: Not publicly documented; subject to AWS service limits per account/region.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RedshiftConfig {
  /** AWS region, e.g. "us-east-1" */
  region: string;
  /**
   * Caller-supplied SigV4 signer. Returns headers needed for a signed request.
   * target: X-Amz-Target action string (e.g. "RedshiftData.ExecuteStatement")
   * body: JSON-serialized request body string
   */
  signRequest: (target: string, body: string) => Promise<Record<string, string>>;
}

export class RedshiftMCPServer extends MCPAdapterBase {
  private readonly endpoint: string;
  private readonly signRequest: RedshiftConfig['signRequest'];

  constructor(config: RedshiftConfig) {
    super();
    this.endpoint = `https://redshift-data.${config.region}.amazonaws.com`;
    this.signRequest = config.signRequest;
  }

  static catalog() {
    return {
      name: 'redshift',
      displayName: 'AWS Redshift',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'redshift', 'aws', 'data-warehouse', 'sql', 'analytics', 'serverless',
        'database', 'query', 'schema', 'table', 'cluster', 'workgroup',
      ],
      toolNames: [
        'list_databases', 'list_schemas', 'list_tables', 'describe_table',
        'execute_statement', 'batch_execute_statement', 'describe_statement',
        'get_statement_result', 'get_statement_result_v2',
        'list_statements', 'cancel_statement',
        'list_columns',
      ],
      description: 'AWS Redshift Data API: execute SQL, inspect schemas and tables, manage statement lifecycle on provisioned clusters and Redshift Serverless workgroups.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_databases',
        description: 'List all databases in a Redshift provisioned cluster or serverless workgroup',
        inputSchema: {
          type: 'object',
          properties: {
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier. Provide this OR WorkgroupName, not both.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name. Provide this OR ClusterIdentifier, not both.',
            },
            Database: {
              type: 'string',
              description: 'Database to connect to when listing (required for Serverless).',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret containing database credentials.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials (provisioned clusters only).',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of databases to return (default: 20, max: 60).',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'list_schemas',
        description: 'List schemas in a Redshift database, with optional SQL LIKE pattern filter',
        inputSchema: {
          type: 'object',
          properties: {
            Database: {
              type: 'string',
              description: 'Name of the database whose schemas to list.',
            },
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            SchemaPattern: {
              type: 'string',
              description: 'SQL LIKE pattern to filter schema names (e.g. public, sales%).',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of schemas to return (default: 20, max: 60).',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['Database'],
        },
      },
      {
        name: 'list_tables',
        description: 'List tables in a Redshift database and optional schema with SQL LIKE pattern filter',
        inputSchema: {
          type: 'object',
          properties: {
            Database: {
              type: 'string',
              description: 'Name of the database.',
            },
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            SchemaPattern: {
              type: 'string',
              description: 'SQL LIKE pattern to filter by schema name.',
            },
            TablePattern: {
              type: 'string',
              description: 'SQL LIKE pattern to filter by table name.',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of tables to return (default: 20, max: 60).',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['Database'],
        },
      },
      {
        name: 'describe_table',
        description: 'Retrieve detailed column metadata for a specific table in a Redshift database',
        inputSchema: {
          type: 'object',
          properties: {
            Database: {
              type: 'string',
              description: 'Name of the database.',
            },
            Table: {
              type: 'string',
              description: 'Name of the table to describe.',
            },
            Schema: {
              type: 'string',
              description: 'Schema containing the table (default: public).',
            },
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of columns to return.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['Database'],
        },
      },
      {
        name: 'list_columns',
        description: 'List all columns in a specific Redshift table including name, data type, and nullable flag',
        inputSchema: {
          type: 'object',
          properties: {
            Database: {
              type: 'string',
              description: 'Name of the database containing the table.',
            },
            Table: {
              type: 'string',
              description: 'Name of the table whose columns to list.',
            },
            Schema: {
              type: 'string',
              description: 'Schema containing the table (default: public).',
            },
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of columns to return.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['Database', 'Table'],
        },
      },
      {
        name: 'execute_statement',
        description: 'Execute a single SQL statement (DML or DDL) against Redshift. Returns a statement ID — use describe_statement to poll status, get_statement_result to fetch rows.',
        inputSchema: {
          type: 'object',
          properties: {
            Database: {
              type: 'string',
              description: 'Database to run the statement against.',
            },
            Sql: {
              type: 'string',
              description: 'SQL statement to execute (single statement only).',
            },
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret for credentials.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            StatementName: {
              type: 'string',
              description: 'Optional human-readable label for the statement.',
            },
            WithEvent: {
              type: 'boolean',
              description: 'If true, emit an EventBridge event when the statement finishes.',
            },
            ClientToken: {
              type: 'string',
              description: 'Idempotency token to prevent duplicate submissions.',
            },
          },
          required: ['Database', 'Sql'],
        },
      },
      {
        name: 'batch_execute_statement',
        description: 'Execute multiple SQL statements as a single transaction. Statements run serially in order; all succeed or all roll back.',
        inputSchema: {
          type: 'object',
          properties: {
            Database: {
              type: 'string',
              description: 'Database to run the batch against.',
            },
            Sqls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of SQL statements to execute in order within a single transaction.',
            },
            ClusterIdentifier: {
              type: 'string',
              description: 'Provisioned cluster identifier.',
            },
            WorkgroupName: {
              type: 'string',
              description: 'Serverless workgroup name.',
            },
            SecretArn: {
              type: 'string',
              description: 'ARN of the Secrets Manager secret.',
            },
            DbUser: {
              type: 'string',
              description: 'Database user name for temporary credentials.',
            },
            StatementName: {
              type: 'string',
              description: 'Optional label for the batch statement.',
            },
            WithEvent: {
              type: 'boolean',
              description: 'If true, emit an EventBridge event on completion.',
            },
            ClientToken: {
              type: 'string',
              description: 'Idempotency token.',
            },
          },
          required: ['Database', 'Sqls'],
        },
      },
      {
        name: 'describe_statement',
        description: 'Retrieve the execution status and metadata of a previously submitted SQL statement by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            Id: {
              type: 'string',
              description: 'Statement ID returned by execute_statement or batch_execute_statement.',
            },
          },
          required: ['Id'],
        },
      },
      {
        name: 'get_statement_result',
        description: 'Fetch result rows of a completed SQL statement execution. Returns column metadata and row data.',
        inputSchema: {
          type: 'object',
          properties: {
            Id: {
              type: 'string',
              description: 'Statement ID of the completed execution.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token to retrieve the next page of results.',
            },
          },
          required: ['Id'],
        },
      },
      {
        name: 'get_statement_result_v2',
        description: 'Fetch result rows of a completed SQL statement in CSV format (V2 API). More efficient for large result sets.',
        inputSchema: {
          type: 'object',
          properties: {
            Id: {
              type: 'string',
              description: 'Statement ID of the completed execution.',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token to retrieve the next page of results.',
            },
          },
          required: ['Id'],
        },
      },
      {
        name: 'list_statements',
        description: 'List previously executed SQL statements with optional filters by status, name, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            Status: {
              type: 'string',
              description: 'Filter by status: SUBMITTED, PICKED, STARTED, FINISHED, ABORTED, FAILED, ALL (default: ALL)',
            },
            StatementName: {
              type: 'string',
              description: 'Filter by statement label (exact match).',
            },
            MaxResults: {
              type: 'number',
              description: 'Maximum number of statements to return (default: 100, max: 100).',
            },
            NextToken: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
            RoleLevel: {
              type: 'boolean',
              description: 'If true, list statements for all users with the same IAM role.',
            },
          },
        },
      },
      {
        name: 'cancel_statement',
        description: 'Cancel a running or queued Redshift Data API SQL statement by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            Id: {
              type: 'string',
              description: 'Statement ID to cancel.',
            },
          },
          required: ['Id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_databases':
          return await this.post('RedshiftData.ListDatabases', this.buildCommonBody(args, []));
        case 'list_schemas':
          return await this.post('RedshiftData.ListSchemas', this.buildCommonBody(args, ['Database', 'SchemaPattern']));
        case 'list_tables':
          return await this.post('RedshiftData.ListTables', this.buildCommonBody(args, ['Database', 'SchemaPattern', 'TablePattern']));
        case 'describe_table':
          return await this.post('RedshiftData.DescribeTable', this.buildCommonBody(args, ['Database', 'Table', 'Schema']));
        case 'list_columns':
          // list_columns uses DescribeTable — returns column-level metadata for a table
          return await this.post('RedshiftData.DescribeTable', this.buildCommonBody(args, ['Database', 'Table', 'Schema']));
        case 'execute_statement':
          return await this.post('RedshiftData.ExecuteStatement', this.buildStatementBody(args));
        case 'batch_execute_statement':
          return await this.post('RedshiftData.BatchExecuteStatement', this.buildBatchBody(args));
        case 'describe_statement': {
          if (!args.Id) return { content: [{ type: 'text', text: 'Id is required' }], isError: true };
          return await this.post('RedshiftData.DescribeStatement', { Id: args.Id });
        }
        case 'get_statement_result':
          return await this.post('RedshiftData.GetStatementResult', this.buildPaginatedBody(args));
        case 'get_statement_result_v2':
          return await this.post('RedshiftData.GetStatementResultV2', this.buildPaginatedBody(args));
        case 'list_statements':
          return await this.post('RedshiftData.ListStatements', this.buildListStatementsBody(args));
        case 'cancel_statement': {
          if (!args.Id) return { content: [{ type: 'text', text: 'Id is required' }], isError: true };
          return await this.post('RedshiftData.CancelStatement', { Id: args.Id });
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

  private async post(target: string, body: Record<string, unknown>): Promise<ToolResult> {
    const bodyStr = JSON.stringify(body);
    const sigHeaders = await this.signRequest(target, bodyStr);

    const response = await this.fetchWithRetry(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': target,
        Accept: 'application/json',
        ...sigHeaders,
      },
      body: bodyStr,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Redshift Data API error: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Redshift returned non-JSON response (HTTP ${response.status})`); }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  /** Build body including common cluster/workgroup/credentials fields plus any extras */
  private buildCommonBody(args: Record<string, unknown>, extras: string[]): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    const common = ['ClusterIdentifier', 'WorkgroupName', 'Database', 'SecretArn', 'DbUser', 'MaxResults', 'NextToken'];
    for (const key of [...common, ...extras]) {
      if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
        body[key] = args[key];
      }
    }
    return body;
  }

  private buildStatementBody(args: Record<string, unknown>): Record<string, unknown> {
    const body = this.buildCommonBody(args, ['Sql', 'StatementName', 'ClientToken']);
    if (typeof args.WithEvent === 'boolean') body.WithEvent = args.WithEvent;
    return body;
  }

  private buildBatchBody(args: Record<string, unknown>): Record<string, unknown> {
    const body = this.buildCommonBody(args, ['Sqls', 'StatementName', 'ClientToken']);
    if (typeof args.WithEvent === 'boolean') body.WithEvent = args.WithEvent;
    return body;
  }

  private buildPaginatedBody(args: Record<string, unknown>): Record<string, unknown> {
    if (!args.Id) throw new Error('Id is required');
    const body: Record<string, unknown> = { Id: args.Id };
    if (args.NextToken) body.NextToken = args.NextToken;
    return body;
  }

  private buildListStatementsBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.Status) body.Status = args.Status;
    if (args.StatementName) body.StatementName = args.StatementName;
    if (args.MaxResults) body.MaxResults = args.MaxResults;
    if (args.NextToken) body.NextToken = args.NextToken;
    if (typeof args.RoleLevel === 'boolean') body.RoleLevel = args.RoleLevel;
    return body;
  }
}
