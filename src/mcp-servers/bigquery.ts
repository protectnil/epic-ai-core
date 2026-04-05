/**
 * Google BigQuery MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://bigquery.googleapis.com/mcp — transport: streamable-HTTP (HTTPS),
//   auth: OAuth2 (IAM — does NOT accept API keys). Published by Google. Actively maintained.
//   Google MCP tools (5): list_dataset_ids, list_table_ids, get_dataset_info, get_table_info, execute_sql.
//   Recommendation: use-rest-api — Google MCP covers only 5 read/query tools. Our adapter covers
//   19 tools including create/delete datasets, create/delete tables, insert_rows, streaming inserts,
//   job management (create_query_job, get_query_results, list_jobs, cancel_job), list_routines,
//   get_routine, and list_projects. The Google MCP is a strict subset. Use our REST adapter for
//   full API surface. Air-gapped deployments: use this adapter directly.
//
// Base URL: https://bigquery.googleapis.com/bigquery/v2
// Auth: Bearer token (OAuth2 access token or service account token via google-auth-library or
//       Application Default Credentials). Pass as Authorization: Bearer {token}.
// Docs: https://cloud.google.com/bigquery/docs/reference/rest
//       https://cloud.google.com/bigquery/docs/reference/mcp (official Google MCP reference)
// Rate limits: 300 concurrent API requests per project; query jobs subject to concurrent slot limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BigQueryConfig {
  /** OAuth2 access token or service account bearer token */
  token: string;
  /** Default Google Cloud project ID */
  projectId: string;
  /** Optional base URL override (default: https://bigquery.googleapis.com/bigquery/v2) */
  baseUrl?: string;
}

export class BigQueryMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(config: BigQueryConfig) {
    super();
    this.token = config.token;
    this.projectId = config.projectId;
    this.baseUrl = config.baseUrl || 'https://bigquery.googleapis.com/bigquery/v2';
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private resolveProject(args: Record<string, unknown>): string {
    return String(args.projectId ?? this.projectId);
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'run_query',
        description: 'Run a synchronous BigQuery SQL query and return results. Supports standard SQL and legacy SQL with configurable timeout and row limit.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query string to execute' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            useLegacySql: { type: 'boolean', description: 'Use legacy SQL dialect (default: false — uses standard SQL)' },
            maxResults: { type: 'number', description: 'Maximum rows to return (default: 1000, max: 100000)' },
            timeoutMs: { type: 'number', description: 'Query timeout in milliseconds (default: 30000)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_query_job',
        description: 'Start an asynchronous BigQuery query job. Returns a job ID for polling with get_job. Use for long-running queries.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query string to execute' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            useLegacySql: { type: 'boolean', description: 'Use legacy SQL dialect (default: false)' },
            destinationDatasetId: { type: 'string', description: 'Dataset ID for query results destination table (optional)' },
            destinationTableId: { type: 'string', description: 'Table ID for query results destination table (optional)' },
            writeDisposition: {
              type: 'string',
              description: 'Write disposition if destination table exists: WRITE_TRUNCATE, WRITE_APPEND, WRITE_EMPTY (default: WRITE_EMPTY)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_query_results',
        description: 'Retrieve results from a completed BigQuery query job by job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID from create_query_job' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            maxResults: { type: 'number', description: 'Maximum rows to return (default: 1000)' },
            pageToken: { type: 'string', description: 'Page token for pagination from previous response (optional)' },
            timeoutMs: { type: 'number', description: 'How long to wait for job to complete in ms (default: 10000)' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all datasets in a Google Cloud project with optional label filter.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            filter: { type: 'string', description: 'Label filter expression, e.g. "labels.env:prod" (optional)' },
            maxResults: { type: 'number', description: 'Maximum datasets to return (default: 100)' },
            pageToken: { type: 'string', description: 'Page token for pagination (optional)' },
            all: { type: 'boolean', description: 'Include hidden datasets (default: false)' },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata for a specific BigQuery dataset including location, labels, access controls, and default table expiry.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'create_dataset',
        description: 'Create a new BigQuery dataset in the specified project with optional location, labels, and default table expiry.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID to create (letters, numbers, underscores)' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            location: { type: 'string', description: 'Dataset location, e.g. "US", "EU", "us-central1" (default: US)' },
            description: { type: 'string', description: 'Dataset description (optional)' },
            defaultTableExpirationMs: { type: 'number', description: 'Default table expiration in milliseconds (optional)' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'delete_dataset',
        description: 'Delete a BigQuery dataset. By default fails if the dataset contains tables — use deleteContents to force delete.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID to delete' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            deleteContents: { type: 'boolean', description: 'Delete all tables in the dataset before deleting dataset (default: false)' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables and views within a BigQuery dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            maxResults: { type: 'number', description: 'Maximum tables to return (default: 100)' },
            pageToken: { type: 'string', description: 'Page token for pagination (optional)' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'get_table',
        description: 'Get full metadata and schema for a specific BigQuery table or view, including column names, types, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            tableId: { type: 'string', description: 'Table ID' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
          },
          required: ['datasetId', 'tableId'],
        },
      },
      {
        name: 'create_table',
        description: 'Create a new BigQuery table with a specified schema. Supports regular tables and partitioned tables.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            tableId: { type: 'string', description: 'Table ID to create' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            schema: {
              type: 'object',
              description: 'Table schema as BigQuery schema object: { fields: [{ name, type, mode, description }] }',
            },
            description: { type: 'string', description: 'Table description (optional)' },
            expirationMs: { type: 'number', description: 'Table expiration time in milliseconds from epoch (optional)' },
          },
          required: ['datasetId', 'tableId'],
        },
      },
      {
        name: 'delete_table',
        description: 'Delete a BigQuery table by dataset and table ID. This operation is permanent.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            tableId: { type: 'string', description: 'Table ID to delete' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
          },
          required: ['datasetId', 'tableId'],
        },
      },
      {
        name: 'insert_rows',
        description: 'Stream insert rows into a BigQuery table using the tabledata insertAll API (streaming inserts).',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            tableId: { type: 'string', description: 'Table ID to insert rows into' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            rows: {
              type: 'array',
              description: 'Array of row objects to insert. Each object should match the table schema.',
            },
            skipInvalidRows: { type: 'boolean', description: 'Skip rows with schema errors instead of failing (default: false)' },
          },
          required: ['datasetId', 'tableId', 'rows'],
        },
      },
      {
        name: 'read_table_rows',
        description: 'Read rows from a BigQuery table directly without a SQL query. Useful for small tables and sampling.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            tableId: { type: 'string', description: 'Table ID to read from' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            maxResults: { type: 'number', description: 'Maximum rows to return (default: 100)' },
            pageToken: { type: 'string', description: 'Page token for pagination (optional)' },
            startIndex: { type: 'string', description: 'Zero-based row index to start reading from (optional)' },
          },
          required: ['datasetId', 'tableId'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List BigQuery jobs for a project, filterable by state (done, pending, running) and user. Includes query, load, copy, and extract jobs.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            stateFilter: { type: 'string', description: 'Filter by job state: done, pending, running (optional)' },
            maxResults: { type: 'number', description: 'Maximum jobs to return (default: 50)' },
            pageToken: { type: 'string', description: 'Page token for pagination (optional)' },
            allUsers: { type: 'boolean', description: 'Include jobs from all users in the project (default: false)' },
            projection: { type: 'string', description: 'Response detail level: full or minimal (default: full)' },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get status and configuration details for a specific BigQuery job by job ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            location: { type: 'string', description: 'Job location if not in the default region (optional)' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Request cancellation of a running BigQuery job. The job may still complete before cancellation takes effect.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to cancel' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            location: { type: 'string', description: 'Job location if not in the default region (optional)' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_routines',
        description: 'List stored procedures, user-defined functions (UDFs), and table-valued functions in a dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
            maxResults: { type: 'number', description: 'Maximum routines to return (default: 100)' },
            pageToken: { type: 'string', description: 'Page token for pagination (optional)' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'get_routine',
        description: 'Get definition and metadata for a specific BigQuery routine (stored procedure or UDF) by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            routineId: { type: 'string', description: 'Routine ID' },
            projectId: { type: 'string', description: 'Project ID override (default: configured project)' },
          },
          required: ['datasetId', 'routineId'],
        },
      },
      {
        name: 'list_projects',
        description: 'List Google Cloud projects accessible with the current credentials that have BigQuery enabled.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum projects to return (default: 100)' },
            pageToken: { type: 'string', description: 'Page token for pagination (optional)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'run_query': return this.runQuery(args);
        case 'create_query_job': return this.createQueryJob(args);
        case 'get_query_results': return this.getQueryResults(args);
        case 'list_datasets': return this.listDatasets(args);
        case 'get_dataset': return this.getDataset(args);
        case 'create_dataset': return this.createDataset(args);
        case 'delete_dataset': return this.deleteDataset(args);
        case 'list_tables': return this.listTables(args);
        case 'get_table': return this.getTable(args);
        case 'create_table': return this.createTable(args);
        case 'delete_table': return this.deleteTable(args);
        case 'insert_rows': return this.insertRows(args);
        case 'read_table_rows': return this.readTableRows(args);
        case 'list_jobs': return this.listJobs(args);
        case 'get_job': return this.getJob(args);
        case 'cancel_job': return this.cancelJob(args);
        case 'list_routines': return this.listRoutines(args);
        case 'get_routine': return this.getRoutine(args);
        case 'list_projects': return this.listProjects(args);
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
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const body = {
      query: args.query,
      useLegacySql: args.useLegacySql ?? false,
      maxResults: (args.maxResults as number) ?? 1000,
      timeoutMs: (args.timeoutMs as number) ?? 30000,
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${projectId}/queries`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async createQueryJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const configuration: Record<string, unknown> = {
      query: {
        query: args.query,
        useLegacySql: args.useLegacySql ?? false,
      },
    };
    if (args.destinationDatasetId && args.destinationTableId) {
      (configuration.query as Record<string, unknown>).destinationTable = {
        projectId,
        datasetId: args.destinationDatasetId,
        tableId: args.destinationTableId,
      };
      (configuration.query as Record<string, unknown>).writeDisposition = args.writeDisposition ?? 'WRITE_EMPTY';
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${projectId}/jobs`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ configuration }),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async getQueryResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    params.set('maxResults', String((args.maxResults as number) ?? 1000));
    params.set('timeoutMs', String((args.timeoutMs as number) ?? 10000));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/queries/${encodeURIComponent(String(args.job_id))}?${params.toString()}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    if (args.all) params.set('all', 'true');
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${projectId}/datasets?${params.toString()}`, {
      method: 'GET', headers: this.authHeaders,
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async createDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const body: Record<string, unknown> = {
      datasetReference: { projectId, datasetId: args.datasetId },
      location: (args.location as string) ?? 'US',
    };
    if (args.description) body.description = args.description;
    if (args.defaultTableExpirationMs) body.defaultTableExpirationMs = String(args.defaultTableExpirationMs);
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${projectId}/datasets`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async deleteDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.deleteContents) params.set('deleteContents', 'true');
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}?${params.toString()}`,
      { method: 'DELETE', headers: this.authHeaders },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, datasetId: args.datasetId }) }], isError: false };
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/tables?${params.toString()}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async getTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId || !args.tableId) return { content: [{ type: 'text', text: 'datasetId and tableId are required' }], isError: true };
    const projectId = this.resolveProject(args);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/tables/${encodeURIComponent(String(args.tableId))}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async createTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId || !args.tableId) return { content: [{ type: 'text', text: 'datasetId and tableId are required' }], isError: true };
    const projectId = this.resolveProject(args);
    const body: Record<string, unknown> = {
      tableReference: { projectId, datasetId: args.datasetId, tableId: args.tableId },
    };
    if (args.schema) body.schema = args.schema;
    if (args.description) body.description = args.description;
    if (args.expirationMs) body.expirationTime = String(args.expirationMs);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/tables`,
      { method: 'POST', headers: this.authHeaders, body: JSON.stringify(body) },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async deleteTable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId || !args.tableId) return { content: [{ type: 'text', text: 'datasetId and tableId are required' }], isError: true };
    const projectId = this.resolveProject(args);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/tables/${encodeURIComponent(String(args.tableId))}`,
      { method: 'DELETE', headers: this.authHeaders },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, tableId: args.tableId }) }], isError: false };
  }

  private async insertRows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId || !args.tableId || !args.rows) {
      return { content: [{ type: 'text', text: 'datasetId, tableId, and rows are required' }], isError: true };
    }
    const projectId = this.resolveProject(args);
    const rows = (args.rows as unknown[]).map((row, i) => ({ insertId: String(i), json: row }));
    const body: Record<string, unknown> = { rows };
    if (args.skipInvalidRows) body.skipInvalidRows = args.skipInvalidRows;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/tables/${encodeURIComponent(String(args.tableId))}/insertAll`,
      { method: 'POST', headers: this.authHeaders, body: JSON.stringify(body) },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async readTableRows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId || !args.tableId) return { content: [{ type: 'text', text: 'datasetId and tableId are required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    params.set('maxResults', String((args.maxResults as number) ?? 100));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    if (args.startIndex) params.set('startIndex', String(args.startIndex));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/tables/${encodeURIComponent(String(args.tableId))}/data?${params.toString()}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.stateFilter) params.set('stateFilter', String(args.stateFilter));
    params.set('maxResults', String((args.maxResults as number) ?? 50));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    if (args.allUsers) params.set('allUsers', 'true');
    if (args.projection) params.set('projection', String(args.projection));
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${projectId}/jobs?${params.toString()}`, {
      method: 'GET', headers: this.authHeaders,
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.location) params.set('location', String(args.location));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/jobs/${encodeURIComponent(String(args.job_id))}${qs}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async cancelJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.location) params.set('location', String(args.location));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/jobs/${encodeURIComponent(String(args.job_id))}/cancel${qs}`,
      { method: 'POST', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async listRoutines(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId) return { content: [{ type: 'text', text: 'datasetId is required' }], isError: true };
    const projectId = this.resolveProject(args);
    const params = new URLSearchParams();
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/routines?${params.toString()}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async getRoutine(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasetId || !args.routineId) return { content: [{ type: 'text', text: 'datasetId and routineId are required' }], isError: true };
    const projectId = this.resolveProject(args);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/projects/${projectId}/datasets/${encodeURIComponent(String(args.datasetId))}/routines/${encodeURIComponent(String(args.routineId))}`,
      { method: 'GET', headers: this.authHeaders },
    );
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.pageToken) params.set('pageToken', String(args.pageToken));
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects?${params.toString()}`, {
      method: 'GET', headers: this.authHeaders,
    });
    const data = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: !response.ok };
  }

  static catalog() {
    return {
      name: 'bigquery',
      displayName: 'Google BigQuery',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['bigquery', 'google-cloud', 'gcp', 'sql', 'analytics', 'data-warehouse', 'datasets', 'tables', 'jobs', 'streaming-inserts', 'routines'],
      toolNames: [
        'run_query', 'create_query_job', 'get_query_results',
        'list_datasets', 'get_dataset', 'create_dataset', 'delete_dataset',
        'list_tables', 'get_table', 'create_table', 'delete_table',
        'insert_rows', 'read_table_rows',
        'list_jobs', 'get_job', 'cancel_job',
        'list_routines', 'get_routine',
        'list_projects',
      ],
      description: 'Google BigQuery data warehouse: SQL queries, dataset and table management, job tracking, streaming inserts, and routine management.',
      author: 'protectnil' as const,
    };
  }
}
