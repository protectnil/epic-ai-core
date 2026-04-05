/**
 * Neon MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/neondatabase/mcp-server-neon — transport: streamable-HTTP (remote: mcp.neon.tech), auth: API token or OAuth2
// Our adapter covers: 16 tools (management API). Vendor MCP covers: 22+ tools (project/branch mgmt + SQL execution + migrations + query tuning).
// Recommendation: use-both — MCP has SQL execution tools not in REST API (run_sql, run_sql_transaction,
//   get_database_tables, describe_table_schema, list_slow_queries, prepare_database_migration,
//   complete_database_migration, explain_sql_statement, prepare_query_tuning, complete_query_tuning,
//   provision_neon_auth). REST adapter has operations not in MCP (restore_branch, compute endpoint CRUD,
//   snapshot management, API key management, VPC endpoint restrictions, JWKS URL management).
//   FederationManager routes shared tools (list_projects, create_project, delete_project, create_branch,
//   delete_branch, get_connection_uri) through MCP by default.
// MCP-sourced tools (11): run_sql, run_sql_transaction, get_database_tables, describe_table_schema,
//   list_slow_queries, prepare_database_migration, complete_database_migration, explain_sql_statement,
//   prepare_query_tuning, complete_query_tuning, provision_neon_auth
// REST-sourced tools (16): list_projects, get_project, create_project, delete_project, list_branches,
//   get_branch, create_branch, delete_branch, restore_branch, list_databases, create_database,
//   delete_database, list_roles, create_role, delete_role, get_connection_uri
// MCP maintained: yes — active issues and commits as of March 2026 (issues #207 opened 2026-03-11)
//
// Base URL: https://console.neon.tech/api/v2
// Auth: Bearer token (Neon API key)
// Docs: https://api-docs.neon.tech/reference/getting-started-with-neon-api
// Rate limits: 60 req/min on free tier; 200 req/min on paid plans

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NeonConfig {
  apiToken: string;
  baseUrl?: string;
}

export class NeonMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: NeonConfig) {
    super();
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://console.neon.tech/api/v2';
  }

  static catalog() {
    return {
      name: 'neon',
      displayName: 'Neon',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['neon', 'postgres', 'postgresql', 'serverless', 'database', 'branch', 'compute', 'endpoint', 'role', 'migration'],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'delete_project',
        'list_branches', 'get_branch', 'create_branch', 'delete_branch', 'restore_branch',
        'list_databases', 'create_database', 'delete_database',
        'list_roles', 'create_role', 'delete_role',
        'get_connection_uri',
      ],
      description: 'Manage Neon serverless Postgres: projects, branches, databases, roles, compute endpoints, and connection URIs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Neon projects in the account with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 10, max: 400)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to retrieve the next page',
            },
            search: {
              type: 'string',
              description: 'Filter projects by name substring search',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get detailed information about a specific Neon project by project ID',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID (e.g. silent-snowflake-12345678)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Neon project with optional name, region, and Postgres version settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for the project (optional, auto-generated if omitted)',
            },
            region_id: {
              type: 'string',
              description: 'AWS region ID for the project (e.g. aws-us-east-2, aws-eu-central-1)',
            },
            pg_version: {
              type: 'number',
              description: 'Postgres major version: 14, 15, 16, or 17 (default: 17)',
            },
          },
        },
      },
      {
        name: 'delete_project',
        description: 'Permanently delete a Neon project and all its branches, databases, and data',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID to delete',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_branches',
        description: 'List all branches in a Neon project with their status and parent information',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_branch',
        description: 'Get detailed information about a specific branch in a Neon project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID (e.g. br-wispy-meadow-12345678)',
            },
          },
          required: ['project_id', 'branch_id'],
        },
      },
      {
        name: 'create_branch',
        description: 'Create a new branch in a Neon project, optionally forking from a parent at a specific LSN or timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            name: {
              type: 'string',
              description: 'Name for the new branch (optional)',
            },
            parent_id: {
              type: 'string',
              description: 'Parent branch ID to fork from (defaults to primary branch)',
            },
            parent_lsn: {
              type: 'string',
              description: 'LSN on the parent branch to branch from (point-in-time fork)',
            },
            parent_timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp on the parent branch to branch from (e.g. 2026-01-15T10:00:00Z)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_branch',
        description: 'Delete a branch from a Neon project; all compute endpoints on the branch are suspended',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID to delete',
            },
          },
          required: ['project_id', 'branch_id'],
        },
      },
      {
        name: 'restore_branch',
        description: 'Restore a branch to an earlier state using another branch or a point-in-time (LSN or timestamp)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID to restore',
            },
            source_branch_id: {
              type: 'string',
              description: 'Source branch to restore from',
            },
            source_lsn: {
              type: 'string',
              description: 'LSN on the source branch to restore to',
            },
            source_timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp on the source branch to restore to (e.g. 2026-01-15T10:00:00Z)',
            },
          },
          required: ['project_id', 'branch_id', 'source_branch_id'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases in a Neon project branch',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID',
            },
          },
          required: ['project_id', 'branch_id'],
        },
      },
      {
        name: 'create_database',
        description: 'Create a new database in a Neon project branch with a specified owner role',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID where the database will be created',
            },
            name: {
              type: 'string',
              description: 'Name for the new database',
            },
            owner_name: {
              type: 'string',
              description: 'Role name that will own the database (default: the branch default role)',
            },
          },
          required: ['project_id', 'branch_id', 'name'],
        },
      },
      {
        name: 'delete_database',
        description: 'Delete a database from a Neon project branch by name',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID',
            },
            database_name: {
              type: 'string',
              description: 'The name of the database to delete',
            },
          },
          required: ['project_id', 'branch_id', 'database_name'],
        },
      },
      {
        name: 'list_roles',
        description: 'List all roles (users) in a Neon project branch',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID',
            },
          },
          required: ['project_id', 'branch_id'],
        },
      },
      {
        name: 'create_role',
        description: 'Create a new database role in a Neon project branch',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID where the role will be created',
            },
            name: {
              type: 'string',
              description: 'Name for the new role (database username)',
            },
          },
          required: ['project_id', 'branch_id', 'name'],
        },
      },
      {
        name: 'delete_role',
        description: 'Delete a database role from a Neon project branch by role name',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID',
            },
            role_name: {
              type: 'string',
              description: 'The name of the role to delete',
            },
          },
          required: ['project_id', 'branch_id', 'role_name'],
        },
      },
      {
        name: 'get_connection_uri',
        description: 'Get a Postgres connection URI for a Neon project branch endpoint, ready for use in connection strings',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'The Neon project ID',
            },
            branch_id: {
              type: 'string',
              description: 'The branch ID',
            },
            endpoint_id: {
              type: 'string',
              description: 'Compute endpoint ID (optional; defaults to primary read-write endpoint)',
            },
            database_name: {
              type: 'string',
              description: 'Database name to include in the connection URI (optional)',
            },
            role_name: {
              type: 'string',
              description: 'Role name to authenticate as (optional)',
            },
            pooled: {
              type: 'boolean',
              description: 'Return a connection pooler URI via PgBouncer instead of a direct connection (default: false)',
            },
          },
          required: ['project_id', 'branch_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_branches':
          return await this.listBranches(args);
        case 'get_branch':
          return await this.getBranch(args);
        case 'create_branch':
          return await this.createBranch(args);
        case 'delete_branch':
          return await this.deleteBranch(args);
        case 'restore_branch':
          return await this.restoreBranch(args);
        case 'list_databases':
          return await this.listDatabases(args);
        case 'create_database':
          return await this.createDatabase(args);
        case 'delete_database':
          return await this.deleteDatabase(args);
        case 'list_roles':
          return await this.listRoles(args);
        case 'create_role':
          return await this.createRole(args);
        case 'delete_role':
          return await this.deleteRole(args);
        case 'get_connection_uri':
          return await this.getConnectionUri(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', String(args.cursor));
    if (args.search) params.set('search', String(args.search));
    const qs = params.toString();
    return this.request('GET', `/projects${qs ? '?' + qs : ''}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const project: Record<string, unknown> = {};
    if (args.name) project.name = args.name;
    if (args.region_id) project.region_id = args.region_id;
    if (args.pg_version) project.pg_version = args.pg_version;
    return this.request('POST', '/projects', { project });
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/projects/${encodeURIComponent(args.project_id as string)}/branches`);
  }

  private async getBranch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}`);
  }

  private async createBranch(args: Record<string, unknown>): Promise<ToolResult> {
    const branch: Record<string, unknown> = {};
    if (args.name) branch.name = args.name;
    if (args.parent_id) branch.parent_id = args.parent_id;
    if (args.parent_lsn) branch.parent_lsn = args.parent_lsn;
    if (args.parent_timestamp) branch.parent_timestamp = args.parent_timestamp;
    return this.request('POST', `/projects/${encodeURIComponent(args.project_id as string)}/branches`, { branch });
  }

  private async deleteBranch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}`);
  }

  private async restoreBranch(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      source_branch_id: args.source_branch_id,
    };
    if (args.source_lsn) body.source_lsn = args.source_lsn;
    if (args.source_timestamp) body.source_timestamp = args.source_timestamp;
    return this.request('POST', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/restore`, body);
  }

  private async listDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/databases`);
  }

  private async createDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    const database: Record<string, unknown> = { name: args.name };
    if (args.owner_name) database.owner_name = args.owner_name;
    return this.request('POST', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/databases`, { database });
  }

  private async deleteDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/databases/${encodeURIComponent(args.database_name as string)}`);
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/roles`);
  }

  private async createRole(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/roles`, { role: { name: args.name } });
  }

  private async deleteRole(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/projects/${encodeURIComponent(args.project_id as string)}/branches/${encodeURIComponent(args.branch_id as string)}/roles/${encodeURIComponent(args.role_name as string)}`);
  }

  private async getConnectionUri(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('branch_id', args.branch_id as string);
    if (args.endpoint_id) params.set('endpoint_id', String(args.endpoint_id));
    if (args.database_name) params.set('db_name', String(args.database_name));
    if (args.role_name) params.set('role_name', String(args.role_name));
    if (args.pooled !== undefined) params.set('pooled', String(args.pooled));
    return this.request('GET', `/projects/${encodeURIComponent(args.project_id as string)}/connection_uri?${params.toString()}`);
  }
}
