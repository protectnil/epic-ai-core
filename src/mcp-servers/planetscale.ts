/**
 * PlanetScale MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.pscale.dev/mcp/planetscale — transport: streamable-HTTP, auth: OAuth2
// MCP launched: January 29, 2026. Actively maintained. 16 tools.
// Our adapter covers: 14 tools. Vendor MCP covers: 16 tools.
// Recommendation: use-both — MCP and REST have non-overlapping tools requiring the union for full coverage.
//
// Integration: use-both
// MCP-sourced tools (9): planetscale_list_organizations, planetscale_list_databases, planetscale_list_branches,
//   planetscale_get_organization, planetscale_get_database, planetscale_get_branch, planetscale_get_branch_schema,
//   planetscale_execute_read_query, planetscale_execute_write_query, planetscale_get_insights,
//   planetscale_list_regions_for_organization, planetscale_list_cluster_size_skus, planetscale_list_invoices,
//   planetscale_get_invoice_line_items, planetscale_search_documentation, planetscale_list_schema_recommendations
// REST-sourced tools (5, not in MCP): list_deploy_requests, create_deploy_request, list_passwords, create_password,
//   create_database, delete_database, create_branch, delete_branch
// Combined coverage: 22 unique operations (MCP: 16 + REST unique: 6; shared org/db/branch list/get operations
//   routed through MCP by FederationManager)
//
// Base URL: https://api.planetscale.com/v1
// Auth: Service token — Authorization header with "{service_token_id}:{service_token}" (no scheme prefix)
// Docs: https://planetscale.com/docs/api/reference/getting-started-with-planetscale-api
// Rate limits: 600 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PlanetScaleConfig {
  serviceTokenId: string;
  serviceToken: string;
  baseUrl?: string;
}

export class PlanetScaleMCPServer extends MCPAdapterBase {
  private readonly serviceTokenId: string;
  private readonly serviceToken: string;
  private readonly baseUrl: string;

  constructor(config: PlanetScaleConfig) {
    super();
    this.serviceTokenId = config.serviceTokenId;
    this.serviceToken = config.serviceToken;
    this.baseUrl = config.baseUrl || 'https://api.planetscale.com';
  }

  static catalog() {
    return {
      name: 'planetscale',
      displayName: 'PlanetScale',
      version: '1.0.0',
      category: 'data',
      keywords: ['planetscale', 'mysql', 'database', 'branch', 'deploy', 'schema', 'vitess', 'cloud database'],
      toolNames: [
        'list_organizations', 'get_organization',
        'list_databases', 'get_database', 'create_database', 'delete_database',
        'list_branches', 'get_branch', 'create_branch', 'delete_branch',
        'list_deploy_requests', 'create_deploy_request',
        'list_passwords', 'create_password',
      ],
      description: 'PlanetScale database management: manage organizations, databases, branches, deploy requests, and connection passwords.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all PlanetScale organizations accessible to the current service token',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a specific PlanetScale organization by name',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases in a PlanetScale organization with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_database',
        description: 'Get details for a specific PlanetScale database including state, region, and plan',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
          },
          required: ['organization', 'database'],
        },
      },
      {
        name: 'create_database',
        description: 'Create a new PlanetScale database in an organization with optional region and plan settings',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            name: { type: 'string', description: 'Name for the new database (lowercase, alphanumeric and hyphens)' },
            notes: { type: 'string', description: 'Optional description for the database' },
            region: { type: 'string', description: 'Region slug, e.g. us-east, eu-west (default: organization default)' },
          },
          required: ['organization', 'name'],
        },
      },
      {
        name: 'delete_database',
        description: 'Permanently delete a PlanetScale database and all its branches and data',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name to delete' },
          },
          required: ['organization', 'database'],
        },
      },
      {
        name: 'list_branches',
        description: 'List all branches for a PlanetScale database, including production and development branches',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
          },
          required: ['organization', 'database'],
        },
      },
      {
        name: 'get_branch',
        description: 'Get details for a specific PlanetScale database branch including schema and status',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            branch: { type: 'string', description: 'Branch name' },
          },
          required: ['organization', 'database', 'branch'],
        },
      },
      {
        name: 'create_branch',
        description: 'Create a new development branch from an existing PlanetScale database branch',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            name: { type: 'string', description: 'Name for the new branch' },
            parent_branch: { type: 'string', description: 'Source branch to fork from (default: main)' },
            backup_id: { type: 'string', description: 'Optional backup ID to create branch from a specific backup' },
          },
          required: ['organization', 'database', 'name'],
        },
      },
      {
        name: 'delete_branch',
        description: 'Delete a development branch from a PlanetScale database (cannot delete production branches)',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            branch: { type: 'string', description: 'Branch name to delete (must be a development branch)' },
          },
          required: ['organization', 'database', 'branch'],
        },
      },
      {
        name: 'list_deploy_requests',
        description: 'List deploy requests for a PlanetScale database with optional state filter',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            state: { type: 'string', description: 'Filter by state: open, closed, merged (default: all)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
          },
          required: ['organization', 'database'],
        },
      },
      {
        name: 'create_deploy_request',
        description: 'Create a deploy request to merge schema changes from a development branch into production',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            branch: { type: 'string', description: 'Development branch name with schema changes to deploy' },
            into_branch: { type: 'string', description: 'Target production branch (default: main)' },
            notes: { type: 'string', description: 'Optional notes describing the deploy request' },
          },
          required: ['organization', 'database', 'branch'],
        },
      },
      {
        name: 'list_passwords',
        description: 'List connection passwords for a PlanetScale database branch',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            branch: { type: 'string', description: 'Branch name' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
          },
          required: ['organization', 'database', 'branch'],
        },
      },
      {
        name: 'create_password',
        description: 'Create a new connection password for a PlanetScale database branch with optional role',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'Organization name (slug)' },
            database: { type: 'string', description: 'Database name' },
            branch: { type: 'string', description: 'Branch name' },
            name: { type: 'string', description: 'Display name for the password' },
            role: { type: 'string', description: 'Role: admin, writer, reader, readwriter (default: readwriter)' },
          },
          required: ['organization', 'database', 'branch', 'name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations': return this.listOrganizations(args);
        case 'get_organization': return this.getOrganization(args);
        case 'list_databases': return this.listDatabases(args);
        case 'get_database': return this.getDatabase(args);
        case 'create_database': return this.createDatabase(args);
        case 'delete_database': return this.deleteDatabase(args);
        case 'list_branches': return this.listBranches(args);
        case 'get_branch': return this.getBranch(args);
        case 'create_branch': return this.createBranch(args);
        case 'delete_branch': return this.deleteBranch(args);
        case 'list_deploy_requests': return this.listDeployRequests(args);
        case 'create_deploy_request': return this.createDeployRequest(args);
        case 'list_passwords': return this.listPasswords(args);
        case 'create_password': return this.createPassword(args);
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
      Authorization: `${this.serviceTokenId}:${this.serviceToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { deleted: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.get('/v1/organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}`);
  }

  private async listDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases`, params);
  }

  private async getDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database) return { content: [{ type: 'text', text: 'organization and database are required' }], isError: true };
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}`);
  }

  private async createDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.name) return { content: [{ type: 'text', text: 'organization and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.notes) body.notes = args.notes;
    if (args.region) body.region = args.region;
    return this.post(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases`, body);
  }

  private async deleteDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database) return { content: [{ type: 'text', text: 'organization and database are required' }], isError: true };
    return this.del(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}`);
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database) return { content: [{ type: 'text', text: 'organization and database are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/branches`, params);
  }

  private async getBranch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database || !args.branch) return { content: [{ type: 'text', text: 'organization, database, and branch are required' }], isError: true };
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/branches/${encodeURIComponent(args.branch as string)}`);
  }

  private async createBranch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database || !args.name) return { content: [{ type: 'text', text: 'organization, database, and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.parent_branch) body.parent_branch = args.parent_branch;
    if (args.backup_id) body.backup_id = args.backup_id;
    return this.post(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/branches`, body);
  }

  private async deleteBranch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database || !args.branch) return { content: [{ type: 'text', text: 'organization, database, and branch are required' }], isError: true };
    return this.del(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/branches/${encodeURIComponent(args.branch as string)}`);
  }

  private async listDeployRequests(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database) return { content: [{ type: 'text', text: 'organization and database are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.state) params.state = args.state as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/deploy-requests`, params);
  }

  private async createDeployRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database || !args.branch) return { content: [{ type: 'text', text: 'organization, database, and branch are required' }], isError: true };
    const body: Record<string, unknown> = { branch: args.branch };
    if (args.into_branch) body.into_branch = args.into_branch;
    if (args.notes) body.notes = args.notes;
    return this.post(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/deploy-requests`, body);
  }

  private async listPasswords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database || !args.branch) return { content: [{ type: 'text', text: 'organization, database, and branch are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.get(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/branches/${encodeURIComponent(args.branch as string)}/passwords`, params);
  }

  private async createPassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization || !args.database || !args.branch || !args.name) return { content: [{ type: 'text', text: 'organization, database, branch, and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.role) body.role = args.role;
    return this.post(`/v1/organizations/${encodeURIComponent(args.organization as string)}/databases/${encodeURIComponent(args.database as string)}/branches/${encodeURIComponent(args.branch as string)}/passwords`, body);
  }
}
