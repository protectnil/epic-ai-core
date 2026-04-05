/**
 * CockroachDB MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://cockroachlabs.cloud/mcp — transport: streamable-HTTP, auth: OAuth2.1 / service account API key
// Published by Cockroach Labs (official). Announced 2026-03-25. Actively maintained.
// Our adapter covers: 15 tools (CockroachDB Cloud Management API — cluster, database, SQL user, backup, region ops).
// Vendor MCP covers: SQL-level tools only (list_databases, select_query, get_table_schema, create_table, insert_rows).
//
// OVERLAP ANALYSIS:
//   Shared: none — the vendor MCP operates against the SQL wire protocol (direct cluster access),
//           while our adapter operates against the Cloud Management REST API (cluster lifecycle).
//   MCP-only: list_databases (SQL), select_query, get_table_schema, create_table, insert_rows, etc.
//   Our-only: list_clusters, get_cluster, create_cluster, update_cluster, delete_cluster,
//             list_databases (Cloud API), create_database, delete_database, list_sql_users,
//             create_sql_user, delete_sql_user, update_sql_user_password, list_backups,
//             get_backup, list_regions.
// Recommendation: use-both — vendor MCP handles SQL-level database interactions; this adapter
// handles Cloud API cluster lifecycle management. Non-overlapping domains, both required.
//
// Integration: use-both
// MCP-sourced tools: SQL operations (list_databases via SQL, select_query, get_table_schema, create_table, insert_rows)
// REST-sourced tools (15): list_clusters, get_cluster, create_cluster, update_cluster, delete_cluster,
//   list_databases, create_database, delete_database, list_sql_users, create_sql_user, delete_sql_user,
//   update_sql_user_password, list_backups, get_backup, list_regions
// Combined coverage: Cloud Management (this adapter) + SQL operations (vendor MCP)
//
// Base URL: https://cockroachlabs.cloud/api/v1
// Auth: Bearer API key in Authorization header (service account key from Cloud Console)
// Docs: https://www.cockroachlabs.com/docs/cockroachcloud/cloud-api
//       https://www.cockroachlabs.com/docs/api/cloud/v1.html
// Rate limits: 10 requests/second per user. Exceeding limit returns HTTP 429 with Retry-After header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CockroachDBConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CockroachDBMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CockroachDBConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://cockroachlabs.cloud/api/v1';
  }

  static catalog() {
    return {
      name: 'cockroachdb',
      displayName: 'CockroachDB',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'cockroachdb', 'cockroach', 'crdb', 'distributed', 'sql', 'database',
        'cluster', 'cloud', 'postgres', 'postgresql', 'serverless', 'resilient',
        'backup', 'restore', 'migration',
      ],
      toolNames: [
        'list_clusters', 'get_cluster', 'create_cluster', 'update_cluster', 'delete_cluster',
        'list_databases', 'create_database', 'delete_database',
        'list_sql_users', 'create_sql_user', 'delete_sql_user', 'update_sql_user_password',
        'list_backups', 'get_backup', 'list_regions',
      ],
      description: 'CockroachDB Cloud management: provision clusters, manage databases, SQL users, backups, and regions via the Cloud API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clusters',
        description: 'List all CockroachDB Cloud clusters in the organization with optional show-inactive filter',
        inputSchema: {
          type: 'object',
          properties: {
            show_inactive: {
              type: 'boolean',
              description: 'Include inactive/deleted clusters in results (default: false)',
            },
            pagination_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pagination_limit: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Retrieve details for a specific CockroachDB Cloud cluster by cluster ID including status, plan, and hardware spec',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID (UUID format)',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'create_cluster',
        description: 'Create a new CockroachDB Cloud cluster with specified plan, provider, and region configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the cluster (lowercase, hyphens allowed)',
            },
            provider: {
              type: 'string',
              description: 'Cloud provider: GCP, AWS, or AZURE',
            },
            plan: {
              type: 'string',
              description: 'Cluster plan: BASIC (serverless) or STANDARD or ADVANCED',
            },
            regions: {
              type: 'string',
              description: 'JSON array of region objects with name and node_count fields (e.g. [{"name":"us-east-1","node_count":3}])',
            },
            cockroach_version: {
              type: 'string',
              description: 'CockroachDB version to use (e.g. v23.2, omit for latest)',
            },
          },
          required: ['name', 'provider', 'plan', 'regions'],
        },
      },
      {
        name: 'update_cluster',
        description: 'Update a CockroachDB Cloud cluster hardware specification, storage, or maintenance window',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID to update',
            },
            dedicated: {
              type: 'string',
              description: 'JSON object for dedicated cluster spec overrides (hardware, storage, disk_iops)',
            },
            maintenance_window: {
              type: 'string',
              description: 'JSON object with day_of_week (1-7) and start_hour (0-23) fields for maintenance window',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'delete_cluster',
        description: 'Delete a CockroachDB Cloud cluster permanently — this is irreversible and removes all data',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID to delete',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases in a CockroachDB Cloud cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            pagination_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pagination_limit: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'create_database',
        description: 'Create a new database in a CockroachDB Cloud cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID to create the database in',
            },
            name: {
              type: 'string',
              description: 'Name for the new database',
            },
          },
          required: ['cluster_id', 'name'],
        },
      },
      {
        name: 'delete_database',
        description: 'Delete a database from a CockroachDB Cloud cluster by name',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            database_name: {
              type: 'string',
              description: 'Name of the database to delete',
            },
          },
          required: ['cluster_id', 'database_name'],
        },
      },
      {
        name: 'list_sql_users',
        description: 'List all SQL users in a CockroachDB Cloud cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            pagination_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pagination_limit: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'create_sql_user',
        description: 'Create a new SQL user in a CockroachDB Cloud cluster with a password',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            name: {
              type: 'string',
              description: 'SQL username (lowercase, letters/numbers/underscores)',
            },
            password: {
              type: 'string',
              description: 'Password for the new SQL user',
            },
          },
          required: ['cluster_id', 'name', 'password'],
        },
      },
      {
        name: 'delete_sql_user',
        description: 'Delete a SQL user from a CockroachDB Cloud cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            username: {
              type: 'string',
              description: 'SQL username to delete',
            },
          },
          required: ['cluster_id', 'username'],
        },
      },
      {
        name: 'update_sql_user_password',
        description: 'Reset the password for an existing SQL user in a CockroachDB Cloud cluster',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            username: {
              type: 'string',
              description: 'SQL username to update',
            },
            password: {
              type: 'string',
              description: 'New password for the SQL user',
            },
          },
          required: ['cluster_id', 'username', 'password'],
        },
      },
      {
        name: 'list_backups',
        description: 'List backups for a CockroachDB Cloud cluster including scheduled and manual backups',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            pagination_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            pagination_limit: {
              type: 'number',
              description: 'Number of results per page (default: 50)',
            },
          },
          required: ['cluster_id'],
        },
      },
      {
        name: 'get_backup',
        description: 'Get details for a specific backup of a CockroachDB Cloud cluster by backup ID',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: {
              type: 'string',
              description: 'CockroachDB Cloud cluster ID',
            },
            backup_id: {
              type: 'string',
              description: 'Backup ID to retrieve details for',
            },
          },
          required: ['cluster_id', 'backup_id'],
        },
      },
      {
        name: 'list_regions',
        description: 'List all available cloud provider regions for CockroachDB Cloud cluster deployment',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              description: 'Filter regions by cloud provider: GCP, AWS, or AZURE (omit for all providers)',
            },
            serverless: {
              type: 'boolean',
              description: 'Return only serverless-eligible regions (default: false)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_clusters': return this.listClusters(args);
        case 'get_cluster': return this.getCluster(args);
        case 'create_cluster': return this.createCluster(args);
        case 'update_cluster': return this.updateCluster(args);
        case 'delete_cluster': return this.deleteCluster(args);
        case 'list_databases': return this.listDatabases(args);
        case 'create_database': return this.createDatabase(args);
        case 'delete_database': return this.deleteDatabase(args);
        case 'list_sql_users': return this.listSqlUsers(args);
        case 'create_sql_user': return this.createSqlUser(args);
        case 'delete_sql_user': return this.deleteSqlUser(args);
        case 'update_sql_user_password': return this.updateSqlUserPassword(args);
        case 'list_backups': return this.listBackups(args);
        case 'get_backup': return this.getBackup(args);
        case 'list_regions': return this.listRegions(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async crdbGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async crdbPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async crdbPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async crdbDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listClusters(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.show_inactive === 'boolean') params.show_inactive = String(args.show_inactive);
    if (args.pagination_page) params['pagination.page'] = String(args.pagination_page);
    if (args.pagination_limit) params['pagination.limit'] = String(args.pagination_limit);
    return this.crdbGet('/clusters', params);
  }

  private async getCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    return this.crdbGet(`/clusters/${encodeURIComponent(args.cluster_id as string)}`);
  }

  private async createCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.provider || !args.plan || !args.regions) {
      return { content: [{ type: 'text', text: 'name, provider, plan, and regions are required' }], isError: true };
    }
    let regionsArr: unknown;
    try { regionsArr = JSON.parse(args.regions as string); } catch {
      return { content: [{ type: 'text', text: 'regions must be valid JSON' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      provider: args.provider,
      spec: {
        plan: args.plan,
        regions: regionsArr,
      },
    };
    if (args.cockroach_version) body.cockroach_version = args.cockroach_version;
    return this.crdbPost('/clusters', body);
  }

  private async updateCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.dedicated) {
      try { body.dedicated = JSON.parse(args.dedicated as string); } catch { /* keep */ }
    }
    if (args.maintenance_window) {
      try { body.maintenance_window = JSON.parse(args.maintenance_window as string); } catch { /* keep */ }
    }
    return this.crdbPatch(`/clusters/${encodeURIComponent(args.cluster_id as string)}`, body);
  }

  private async deleteCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    return this.crdbDelete(`/clusters/${encodeURIComponent(args.cluster_id as string)}`);
  }

  private async listDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.pagination_page) params['pagination.page'] = String(args.pagination_page);
    if (args.pagination_limit) params['pagination.limit'] = String(args.pagination_limit);
    return this.crdbGet(`/clusters/${encodeURIComponent(args.cluster_id as string)}/databases`, params);
  }

  private async createDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.name) {
      return { content: [{ type: 'text', text: 'cluster_id and name are required' }], isError: true };
    }
    return this.crdbPost(`/clusters/${encodeURIComponent(args.cluster_id as string)}/databases`, { name: args.name });
  }

  private async deleteDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.database_name) {
      return { content: [{ type: 'text', text: 'cluster_id and database_name are required' }], isError: true };
    }
    return this.crdbDelete(`/clusters/${encodeURIComponent(args.cluster_id as string)}/databases/${encodeURIComponent(args.database_name as string)}`);
  }

  private async listSqlUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.pagination_page) params['pagination.page'] = String(args.pagination_page);
    if (args.pagination_limit) params['pagination.limit'] = String(args.pagination_limit);
    return this.crdbGet(`/clusters/${encodeURIComponent(args.cluster_id as string)}/sql-users`, params);
  }

  private async createSqlUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.name || !args.password) {
      return { content: [{ type: 'text', text: 'cluster_id, name, and password are required' }], isError: true };
    }
    return this.crdbPost(`/clusters/${encodeURIComponent(args.cluster_id as string)}/sql-users`, {
      name: args.name,
      password: args.password,
    });
  }

  private async deleteSqlUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.username) {
      return { content: [{ type: 'text', text: 'cluster_id and username are required' }], isError: true };
    }
    return this.crdbDelete(`/clusters/${encodeURIComponent(args.cluster_id as string)}/sql-users/${encodeURIComponent(args.username as string)}`);
  }

  private async updateSqlUserPassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.username || !args.password) {
      return { content: [{ type: 'text', text: 'cluster_id, username, and password are required' }], isError: true };
    }
    return this.crdbPut(`/clusters/${encodeURIComponent(args.cluster_id as string)}/sql-users/${encodeURIComponent(args.username as string)}/password`, {
      password: args.password,
    });
  }

  private async listBackups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id) return { content: [{ type: 'text', text: 'cluster_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.pagination_page) params['pagination.page'] = String(args.pagination_page);
    if (args.pagination_limit) params['pagination.limit'] = String(args.pagination_limit);
    return this.crdbGet(`/clusters/${encodeURIComponent(args.cluster_id as string)}/backups`, params);
  }

  private async getBackup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cluster_id || !args.backup_id) {
      return { content: [{ type: 'text', text: 'cluster_id and backup_id are required' }], isError: true };
    }
    return this.crdbGet(`/clusters/${encodeURIComponent(args.cluster_id as string)}/backups/${encodeURIComponent(args.backup_id as string)}`);
  }

  private async listRegions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.provider) params.provider = args.provider as string;
    if (typeof args.serverless === 'boolean') params.serverless = String(args.serverless);
    return this.crdbGet('/regions', params);
  }

  private async crdbPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
