/**
 * Databricks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/databrickslabs/mcp — transport: stdio, maintained by Databricks Labs (active as of 2025-06).
// That server exposes Unity Catalog metadata (Genie spaces, UC functions, vector search) — NOT cluster/job/SQL/DBFS operations.
// Our adapter covers REST API operations (clusters, jobs, SQL, warehouses, secrets, DBFS, notebooks) which the Labs MCP does not expose.
// Our adapter covers: 21 tools. Vendor MCP covers: Unity Catalog + Genie tools (different domain).
// Recommendation: use-both — databrickslabs/mcp handles UC/Genie; this adapter handles cluster/job/SQL/DBFS lifecycle management.
// Integration: use-both
// MCP-sourced tools: Unity Catalog metadata, Genie space queries, vector search (use databrickslabs/mcp for these)
// REST-sourced tools (21): list_clusters, get_cluster, start_cluster, terminate_cluster, list_jobs, get_job, run_job,
//   list_job_runs, get_job_run, cancel_job_run, execute_sql, get_sql_statement_result, list_warehouses, get_warehouse,
//   list_secrets_scopes, list_secrets, list_instance_pools, get_instance_pool, dbfs_list, dbfs_get_status, list_notebooks
//
// Base URL: https://{workspace-host}  (e.g. https://dbc-a1b2345c-d6e7.cloud.databricks.com)
// Auth: Bearer token — personal access token (PAT) or short-lived OAuth2 access token
// Docs: https://docs.databricks.com/api/workspace/introduction
// Rate limits: DBFS API 30 req/s | Jobs API /list /get /create 20 req/s | Secrets API 1,100 req/min |
//   Workspace API /list 60 req/s | Permissions API GET 100 req/s. Returns HTTP 429 on excess.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DatabricksConfig {
  /** Workspace host URL, e.g. "https://dbc-a1b2345c-d6e7.cloud.databricks.com" */
  host: string;
  /** Personal access token (PAT) or short-lived OAuth2 access token */
  token: string;
}

export class DatabricksMCPServer extends MCPAdapterBase {
  private readonly host: string;
  private readonly token: string;

  constructor(config: DatabricksConfig) {
    super();
    this.host = config.host.replace(/\/$/, '');
    this.token = config.token;
  }

  static catalog() {
    return {
      name: 'databricks',
      displayName: 'Databricks',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'databricks', 'spark', 'cluster', 'job', 'notebook', 'sql', 'warehouse',
        'delta', 'unity catalog', 'mlflow', 'secret', 'dbfs', 'instance pool',
        'library', 'pipeline', 'repo',
      ],
      toolNames: [
        'list_clusters', 'get_cluster', 'start_cluster', 'terminate_cluster',
        'list_jobs', 'get_job', 'run_job', 'list_job_runs', 'get_job_run', 'cancel_job_run',
        'execute_sql', 'get_sql_statement_result',
        'list_warehouses', 'get_warehouse',
        'list_secrets_scopes', 'list_secrets',
        'list_instance_pools', 'get_instance_pool',
        'dbfs_list', 'dbfs_get_status',
        'list_notebooks',
      ],
      description: 'Databricks workspace: manage clusters, jobs, SQL warehouses, notebooks, secrets, DBFS, and instance pools.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clusters',
        description: 'List all clusters in the workspace with optional filter by state (RUNNING, TERMINATED, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            filter_by_state: {
              type: 'string',
              description: 'Filter clusters by state: PENDING, RUNNING, RESTARTING, RESIZING, WAITING, TERMINATING, TERMINATED, ERROR, UNKNOWN',
            },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Retrieve full configuration and current state of a specific Databricks cluster by cluster ID',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Cluster ID (e.g. "1234-567890-abc123")',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'start_cluster',
        description: 'Start a terminated Databricks cluster; returns immediately — poll get_cluster for RUNNING state',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Cluster ID to start',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'terminate_cluster',
        description: 'Terminate a running Databricks cluster to stop billing; data on attached storage is preserved',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'Cluster ID to terminate',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all Databricks jobs in the workspace with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (max 25, default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter jobs by exact name match',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve full configuration for a specific Databricks job by its numeric job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Numeric job ID',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'run_job',
        description: 'Trigger an existing Databricks job to run immediately with optional notebook or Python parameters',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Numeric ID of the job to run',
            },
            notebook_params: {
              type: 'object',
              description: 'Key-value map of parameters to pass to notebook tasks',
            },
            python_params: {
              type: 'array',
              description: 'List of string parameters to pass to Python script tasks',
              items: { type: 'string' },
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_job_runs',
        description: 'List runs for a specific job ordered by start time descending with optional completion filter',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'Numeric job ID whose runs to list',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of runs to return (max 25, default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            completed_only: {
              type: 'boolean',
              description: 'If true, only return completed runs (default: false)',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'get_job_run',
        description: 'Retrieve the status, output, and task details of a specific Databricks job run by run ID',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'Numeric job run ID to retrieve',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'cancel_job_run',
        description: 'Cancel an active Databricks job run that is in PENDING or RUNNING state',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'Numeric run ID to cancel',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'execute_sql',
        description: 'Execute a SQL statement on a SQL warehouse and return inline results or a statement ID for polling',
        inputSchema: {
          type: 'object',
          properties: {
            warehouse_id: {
              type: 'string',
              description: 'ID of the SQL warehouse to execute against',
            },
            statement: {
              type: 'string',
              description: 'SQL statement to execute',
            },
            catalog: {
              type: 'string',
              description: 'Unity Catalog catalog to set as the session default',
            },
            schema: {
              type: 'string',
              description: 'Schema to set as the session default',
            },
            wait_timeout: {
              type: 'string',
              description: 'Max inline wait time (e.g. "30s", "0s" for async). Max "50s" (default: "30s")',
            },
          },
          required: ['warehouse_id', 'statement'],
        },
      },
      {
        name: 'get_sql_statement_result',
        description: 'Poll and fetch results of a previously submitted SQL statement execution by statement ID',
        inputSchema: {
          type: 'object',
          properties: {
            statement_id: {
              type: 'string',
              description: 'Statement ID returned by execute_sql',
            },
          },
          required: ['statement_id'],
        },
      },
      {
        name: 'list_warehouses',
        description: 'List all SQL warehouses (formerly SQL endpoints) in the workspace with state and size',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_warehouse',
        description: 'Get configuration and current state of a specific SQL warehouse by its warehouse ID',
        inputSchema: {
          type: 'object',
          properties: {
            warehouse_id: {
              type: 'string',
              description: 'SQL warehouse ID',
            },
          },
          required: ['warehouse_id'],
        },
      },
      {
        name: 'list_secrets_scopes',
        description: 'List all secret scopes in the Databricks workspace (does not return secret values)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_secrets',
        description: 'List secret keys (not values) within a named secret scope for inventory or audit',
        inputSchema: {
          type: 'object',
          properties: {
            scope: {
              type: 'string',
              description: 'Name of the secret scope to list keys from',
            },
          },
          required: ['scope'],
        },
      },
      {
        name: 'list_instance_pools',
        description: 'List all instance pools in the workspace with their state and node type configuration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_instance_pool',
        description: 'Retrieve full configuration and statistics for a specific instance pool by pool ID',
        inputSchema: {
          type: 'object',
          properties: {
            instance_pool_id: {
              type: 'string',
              description: 'Instance pool ID to retrieve',
            },
          },
          required: ['instance_pool_id'],
        },
      },
      {
        name: 'dbfs_list',
        description: 'List files and directories in the Databricks File System (DBFS) at the given path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'DBFS path to list (e.g. "/mnt/data" or "dbfs:/user/hive/warehouse")',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'dbfs_get_status',
        description: 'Get metadata (size, modification time, type) for a specific file or directory in DBFS',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'DBFS path to stat',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_notebooks',
        description: 'List notebooks and directories in the Databricks workspace at a given path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Workspace path to list (e.g. "/Users/user@example.com" or "/Shared"). Default: "/"',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_clusters':
          return await this.listClusters(args);
        case 'get_cluster':
          return await this.getCluster(args);
        case 'start_cluster':
          return await this.startCluster(args);
        case 'terminate_cluster':
          return await this.terminateCluster(args);
        case 'list_jobs':
          return await this.listJobs(args);
        case 'get_job':
          return await this.getJob(args);
        case 'run_job':
          return await this.runJob(args);
        case 'list_job_runs':
          return await this.listJobRuns(args);
        case 'get_job_run':
          return await this.getJobRun(args);
        case 'cancel_job_run':
          return await this.cancelJobRun(args);
        case 'execute_sql':
          return await this.executeSql(args);
        case 'get_sql_statement_result':
          return await this.getSqlStatementResult(args);
        case 'list_warehouses':
          return await this.listWarehouses();
        case 'get_warehouse':
          return await this.getWarehouse(args);
        case 'list_secrets_scopes':
          return await this.listSecretScopes();
        case 'list_secrets':
          return await this.listSecrets(args);
        case 'list_instance_pools':
          return await this.listInstancePools();
        case 'get_instance_pool':
          return await this.getInstancePool(args);
        case 'dbfs_list':
          return await this.dbfsList(args);
        case 'dbfs_get_status':
          return await this.dbfsGetStatus(args);
        case 'list_notebooks':
          return await this.listNotebooks(args);
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

  // ── Auth helper ───────────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  // ── Response helper ───────────────────────────────────────────────────────────


  private async jsonOrError(res: Response, context: string): Promise<unknown> {
    if (!res.ok) {
      throw new Error(`${context}: HTTP ${res.status} ${res.statusText}`);
    }
    try {
      return await res.json();
    } catch {
      throw new Error(`Databricks returned non-JSON response for ${context} (HTTP ${res.status})`);
    }
  }

  // ── Tool implementations ──────────────────────────────────────────────────────

  private async listClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const res = await this.fetchWithRetry(`${this.host}/api/2.0/clusters/list`, { headers: this.headers });
    const data = await this.jsonOrError(res, 'list_clusters');

    if (args.filter_by_state) {
      const state = args.filter_by_state as string;
      const parsed = data as { clusters?: Array<{ state?: string }> };
      if (Array.isArray(parsed.clusters)) {
        const filtered = parsed.clusters.filter((c) => c.state === state);
        return { content: [{ type: 'text', text: this.truncate({ clusters: filtered }) }], isError: false };
      }
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const cluster_id = args.cluster_id as string;
    if (!cluster_id) throw new Error('cluster_id is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/clusters/get?cluster_id=${encodeURIComponent(cluster_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_cluster')) }], isError: false };
  }

  private async startCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const cluster_id = args.cluster_id as string;
    if (!cluster_id) throw new Error('cluster_id is required');
    const res = await this.fetchWithRetry(`${this.host}/api/2.0/clusters/start`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ cluster_id }),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'start_cluster')) }], isError: false };
  }

  private async terminateCluster(args: Record<string, unknown>): Promise<ToolResult> {
    const cluster_id = args.cluster_id as string;
    if (!cluster_id) throw new Error('cluster_id is required');
    const res = await this.fetchWithRetry(`${this.host}/api/2.0/clusters/delete`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ cluster_id }),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'terminate_cluster')) }], isError: false };
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 20));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.name) params.set('name', args.name as string);
    const res = await this.fetchWithRetry(`${this.host}/api/2.1/jobs/list?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_jobs')) }], isError: false };
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) throw new Error('job_id is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.1/jobs/get?job_id=${encodeURIComponent(String(job_id))}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_job')) }], isError: false };
  }

  private async runJob(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) throw new Error('job_id is required');
    const body: Record<string, unknown> = { job_id };
    if (args.notebook_params) body.notebook_params = args.notebook_params;
    if (args.python_params) body.python_params = args.python_params;
    const res = await this.fetchWithRetry(`${this.host}/api/2.1/jobs/run-now`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'run_job')) }], isError: false };
  }

  private async listJobRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) throw new Error('job_id is required');
    const params = new URLSearchParams();
    params.set('job_id', String(job_id));
    params.set('limit', String((args.limit as number) ?? 20));
    if (args.offset) params.set('offset', String(args.offset as number));
    if (typeof args.completed_only === 'boolean') params.set('completed_only', String(args.completed_only));
    const res = await this.fetchWithRetry(`${this.host}/api/2.1/jobs/runs/list?${params}`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_job_runs')) }], isError: false };
  }

  private async getJobRun(args: Record<string, unknown>): Promise<ToolResult> {
    const run_id = args.run_id as number;
    if (!run_id) throw new Error('run_id is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.1/jobs/runs/get?run_id=${encodeURIComponent(String(run_id))}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_job_run')) }], isError: false };
  }

  private async cancelJobRun(args: Record<string, unknown>): Promise<ToolResult> {
    const run_id = args.run_id as number;
    if (!run_id) throw new Error('run_id is required');
    const res = await this.fetchWithRetry(`${this.host}/api/2.1/jobs/runs/cancel`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ run_id }),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'cancel_job_run')) }], isError: false };
  }

  private async executeSql(args: Record<string, unknown>): Promise<ToolResult> {
    const warehouse_id = args.warehouse_id as string;
    const statement = args.statement as string;
    if (!warehouse_id) throw new Error('warehouse_id is required');
    if (!statement) throw new Error('statement is required');

    const body: Record<string, unknown> = {
      warehouse_id,
      statement,
      wait_timeout: (args.wait_timeout as string) ?? '30s',
      disposition: 'INLINE',
      format: 'JSON_ARRAY',
    };
    if (args.catalog) body.catalog = args.catalog;
    if (args.schema) body.schema = args.schema;

    const res = await this.fetchWithRetry(`${this.host}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'execute_sql')) }], isError: false };
  }

  private async getSqlStatementResult(args: Record<string, unknown>): Promise<ToolResult> {
    const statement_id = args.statement_id as string;
    if (!statement_id) throw new Error('statement_id is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/sql/statements/${encodeURIComponent(statement_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_sql_statement_result')) }], isError: false };
  }

  private async listWarehouses(): Promise<ToolResult> {
    const res = await this.fetchWithRetry(`${this.host}/api/2.0/sql/warehouses`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_warehouses')) }], isError: false };
  }

  private async getWarehouse(args: Record<string, unknown>): Promise<ToolResult> {
    const warehouse_id = args.warehouse_id as string;
    if (!warehouse_id) throw new Error('warehouse_id is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/sql/warehouses/${encodeURIComponent(warehouse_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_warehouse')) }], isError: false };
  }

  private async listSecretScopes(): Promise<ToolResult> {
    const res = await this.fetchWithRetry(`${this.host}/api/2.0/secrets/scopes/list`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_secrets_scopes')) }], isError: false };
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const scope = args.scope as string;
    if (!scope) throw new Error('scope is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/secrets/list?scope=${encodeURIComponent(scope)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_secrets')) }], isError: false };
  }

  private async listInstancePools(): Promise<ToolResult> {
    const res = await this.fetchWithRetry(`${this.host}/api/2.0/instance-pools/list`, { headers: this.headers });
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_instance_pools')) }], isError: false };
  }

  private async getInstancePool(args: Record<string, unknown>): Promise<ToolResult> {
    const instance_pool_id = args.instance_pool_id as string;
    if (!instance_pool_id) throw new Error('instance_pool_id is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/instance-pools/get?instance_pool_id=${encodeURIComponent(instance_pool_id)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'get_instance_pool')) }], isError: false };
  }

  private async dbfsList(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.path as string;
    if (!path) throw new Error('path is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/dbfs/list?path=${encodeURIComponent(path)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'dbfs_list')) }], isError: false };
  }

  private async dbfsGetStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.path as string;
    if (!path) throw new Error('path is required');
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/dbfs/get-status?path=${encodeURIComponent(path)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'dbfs_get_status')) }], isError: false };
  }

  private async listNotebooks(args: Record<string, unknown>): Promise<ToolResult> {
    const path = (args.path as string) ?? '/';
    const res = await this.fetchWithRetry(
      `${this.host}/api/2.0/workspace/list?path=${encodeURIComponent(path)}`,
      { headers: this.headers },
    );
    return { content: [{ type: 'text', text: this.truncate(await this.jsonOrError(res, 'list_notebooks')) }], isError: false };
  }
}
