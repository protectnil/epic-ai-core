/**
 * WorkOS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/tellahq/workos-mcp — community-maintained, not official WorkOS
// WorkOS also publishes https://www.npmjs.com/package/@workos/mcp-docs-server (docs MCP, not API management)
// Our adapter covers: 22 tools (users, organizations, SSO, directory sync, audit logs). Community MCP covers: similar surface.
// Recommendation: Use this adapter for production REST access. Use community MCP for quick Claude Desktop prototyping.
//
// Base URL: https://api.workos.com
// Auth: Bearer token (API key from WorkOS dashboard → API Keys)
// Docs: https://workos.com/docs/reference
// Rate limits: 500 writes/10 seconds (AuthKit); 6,000 general requests/minute

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WorkOSConfig {
  apiKey: string;
  baseUrl?: string;
}

export class WorkOSMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WorkOSConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.workos.com';
  }

  static catalog() {
    return {
      name: 'workos',
      displayName: 'WorkOS',
      version: '1.0.0',
      category: 'identity',
      keywords: ['workos', 'sso', 'saml', 'oidc', 'single-sign-on', 'directory-sync', 'scim', 'organizations', 'users', 'enterprise', 'auth', 'identity', 'audit-log'],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_organizations', 'get_organization', 'create_organization', 'update_organization', 'delete_organization',
        'list_organization_memberships', 'get_organization_membership', 'create_organization_membership', 'delete_organization_membership',
        'list_connections', 'get_connection', 'delete_connection',
        'list_directories', 'get_directory',
        'list_directory_users', 'list_directory_groups',
        'list_audit_logs',
      ],
      description: 'WorkOS enterprise identity platform: manage users, organizations, SSO connections, SCIM directory sync, organization memberships, and audit logs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List WorkOS users with optional email, organization, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filter users by exact email address' },
            organization_id: { type: 'string', description: 'Filter users by organization ID' },
            limit: { type: 'number', description: 'Maximum users to return (default: 10, max: 100)' },
            before: { type: 'string', description: 'Pagination cursor — return records before this ID' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
            order: { type: 'string', description: 'Sort direction: asc or desc (default: desc)' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific WorkOS user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'WorkOS user ID (e.g. user_01HNRRRYRN...)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new WorkOS user with email, name, and optional password',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email address' },
            first_name: { type: 'string', description: 'User first name' },
            last_name: { type: 'string', description: 'User last name' },
            password: { type: 'string', description: 'Initial password (min 8 characters; omit to require SSO)' },
            email_verified: { type: 'boolean', description: 'Whether the email is pre-verified (default: false)' },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update profile fields for an existing WorkOS user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'WorkOS user ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email_verified: { type: 'boolean', description: 'Updated email verified status' },
            password: { type: 'string', description: 'Updated password' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a WorkOS user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'WorkOS user ID to delete' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List WorkOS organizations with optional domain filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            domains: { type: 'array', description: 'Filter organizations by domain names (e.g. ["acme.com"])' },
            limit: { type: 'number', description: 'Maximum organizations to return (default: 10, max: 100)' },
            before: { type: 'string', description: 'Pagination cursor — return records before this ID' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
            order: { type: 'string', description: 'Sort direction: asc or desc (default: desc)' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a specific WorkOS organization by organization ID',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'WorkOS organization ID (e.g. org_01HNRRRYRN...)' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'create_organization',
        description: 'Create a new WorkOS organization with a name and optional verified domains',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Organization display name (e.g. "Acme Corp")' },
            domains: { type: 'array', description: 'Array of verified domain strings (e.g. ["acme.com"])' },
            allow_profiles_outside_organization: { type: 'boolean', description: 'Allow SSO profiles from outside specified domains (default: false)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_organization',
        description: 'Update the name or domains for an existing WorkOS organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'WorkOS organization ID to update' },
            name: { type: 'string', description: 'Updated organization name' },
            domains: { type: 'array', description: 'Updated array of verified domains' },
            allow_profiles_outside_organization: { type: 'boolean', description: 'Updated outside-profile setting' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'delete_organization',
        description: 'Delete a WorkOS organization by organization ID',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'WorkOS organization ID to delete' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_organization_memberships',
        description: 'List members of a WorkOS organization with optional role and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'WorkOS organization ID' },
            user_id: { type: 'string', description: 'Filter by specific user ID' },
            statuses: { type: 'array', description: 'Filter by statuses: active, inactive, pending (default: all)' },
            limit: { type: 'number', description: 'Maximum memberships to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_organization_membership',
        description: 'Get a specific WorkOS organization membership by membership ID',
        inputSchema: {
          type: 'object',
          properties: {
            membership_id: { type: 'string', description: 'WorkOS organization membership ID' },
          },
          required: ['membership_id'],
        },
      },
      {
        name: 'create_organization_membership',
        description: 'Add a user to a WorkOS organization, creating an organization membership',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'WorkOS organization ID to add the user to' },
            user_id: { type: 'string', description: 'WorkOS user ID to add' },
            role_slug: { type: 'string', description: 'Role slug to assign in the organization (e.g. member, admin)' },
          },
          required: ['organization_id', 'user_id'],
        },
      },
      {
        name: 'delete_organization_membership',
        description: 'Remove a user from a WorkOS organization by membership ID',
        inputSchema: {
          type: 'object',
          properties: {
            membership_id: { type: 'string', description: 'WorkOS organization membership ID to delete' },
          },
          required: ['membership_id'],
        },
      },
      {
        name: 'list_connections',
        description: 'List WorkOS SSO connections with optional organization and connection type filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Filter by organization ID' },
            connection_type: { type: 'string', description: 'Filter by type: OktaSAML, AzureSAML, GoogleSAML, GenericSAML, OktaOIDC, MicrosoftOIDC, GoogleOAuth, etc.' },
            limit: { type: 'number', description: 'Maximum connections to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
          },
        },
      },
      {
        name: 'get_connection',
        description: 'Get details for a specific WorkOS SSO connection by connection ID',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: { type: 'string', description: 'WorkOS SSO connection ID' },
          },
          required: ['connection_id'],
        },
      },
      {
        name: 'delete_connection',
        description: 'Delete a WorkOS SSO connection by connection ID',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: { type: 'string', description: 'WorkOS SSO connection ID to delete' },
          },
          required: ['connection_id'],
        },
      },
      {
        name: 'list_directories',
        description: 'List WorkOS Directory Sync (SCIM) directories with optional organization filter',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Filter directories by organization ID' },
            domain: { type: 'string', description: 'Filter directories by domain' },
            limit: { type: 'number', description: 'Maximum directories to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
          },
        },
      },
      {
        name: 'get_directory',
        description: 'Get details for a specific WorkOS Directory Sync directory by directory ID',
        inputSchema: {
          type: 'object',
          properties: {
            directory_id: { type: 'string', description: 'WorkOS directory ID' },
          },
          required: ['directory_id'],
        },
      },
      {
        name: 'list_directory_users',
        description: 'List users synced from a SCIM directory with optional directory and group filters',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Filter by directory ID' },
            group: { type: 'string', description: 'Filter by group ID' },
            limit: { type: 'number', description: 'Maximum directory users to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
          },
        },
      },
      {
        name: 'list_directory_groups',
        description: 'List groups synced from a SCIM directory with optional directory filter',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Filter by directory ID' },
            user: { type: 'string', description: 'Filter by user ID to find their groups' },
            limit: { type: 'number', description: 'Maximum directory groups to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
          },
        },
      },
      {
        name: 'list_audit_logs',
        description: 'List WorkOS audit log events with optional actor, target, date range, and event filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Filter by organization ID' },
            actions: { type: 'array', description: 'Filter by event action names (e.g. ["user.signed_in", "user.created"])' },
            actors: { type: 'array', description: 'Filter by actor IDs' },
            targets: { type: 'array', description: 'Filter by target IDs' },
            occurred_at_gte: { type: 'string', description: 'Filter events on or after this ISO 8601 timestamp' },
            occurred_at_lte: { type: 'string', description: 'Filter events on or before this ISO 8601 timestamp' },
            limit: { type: 'number', description: 'Maximum events to return (default: 10, max: 100)' },
            after: { type: 'string', description: 'Pagination cursor — return records after this ID' },
          },
          required: ['organization_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'create_user': return this.createUser(args);
        case 'update_user': return this.updateUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'list_organizations': return this.listOrganizations(args);
        case 'get_organization': return this.getOrganization(args);
        case 'create_organization': return this.createOrganization(args);
        case 'update_organization': return this.updateOrganization(args);
        case 'delete_organization': return this.deleteOrganization(args);
        case 'list_organization_memberships': return this.listOrganizationMemberships(args);
        case 'get_organization_membership': return this.getOrganizationMembership(args);
        case 'create_organization_membership': return this.createOrganizationMembership(args);
        case 'delete_organization_membership': return this.deleteOrganizationMembership(args);
        case 'list_connections': return this.listConnections(args);
        case 'get_connection': return this.getConnection(args);
        case 'delete_connection': return this.deleteConnection(args);
        case 'list_directories': return this.listDirectories(args);
        case 'get_directory': return this.getDirectory(args);
        case 'list_directory_users': return this.listDirectoryUsers(args);
        case 'list_directory_groups': return this.listDirectoryGroups(args);
        case 'list_audit_logs': return this.listAuditLogs(args);
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


  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
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

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
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
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildParams(args: Record<string, unknown>, keys: string[]): Record<string, string> {
    const params: Record<string, string> = {};
    for (const key of keys) {
      if (args[key] !== undefined) {
        const val = args[key];
        if (Array.isArray(val)) {
          // WorkOS uses repeated query params for arrays
          params[key] = (val as string[]).join(',');
        } else {
          params[key] = String(val);
        }
      }
    }
    return params;
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['email', 'organization_id', 'limit', 'before', 'after', 'order']);
    return this.get('/user_management/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.get(`/user_management/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.post('/user_management/users', args);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const { user_id, ...body } = args;
    return this.put(`/user_management/users/${encodeURIComponent(user_id as string)}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.del(`/user_management/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['domains', 'limit', 'before', 'after', 'order']);
    return this.get('/organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.get(`/organizations/${encodeURIComponent(args.organization_id as string)}`);
  }

  private async createOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.post('/organizations', args);
  }

  private async updateOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const { organization_id, ...body } = args;
    return this.put(`/organizations/${encodeURIComponent(organization_id as string)}`, body);
  }

  private async deleteOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.del(`/organizations/${encodeURIComponent(args.organization_id as string)}`);
  }

  private async listOrganizationMemberships(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params = this.buildParams(args, ['user_id', 'statuses', 'limit', 'after']);
    params.organization_id = args.organization_id as string;
    return this.get('/user_management/organization_memberships', params);
  }

  private async getOrganizationMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.membership_id) return { content: [{ type: 'text', text: 'membership_id is required' }], isError: true };
    return this.get(`/user_management/organization_memberships/${encodeURIComponent(args.membership_id as string)}`);
  }

  private async createOrganizationMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'organization_id and user_id are required' }], isError: true };
    }
    return this.post('/user_management/organization_memberships', args);
  }

  private async deleteOrganizationMembership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.membership_id) return { content: [{ type: 'text', text: 'membership_id is required' }], isError: true };
    return this.del(`/user_management/organization_memberships/${encodeURIComponent(args.membership_id as string)}`);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['organization_id', 'connection_type', 'limit', 'after']);
    return this.get('/connections', params);
  }

  private async getConnection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.get(`/connections/${encodeURIComponent(args.connection_id as string)}`);
  }

  private async deleteConnection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.del(`/connections/${encodeURIComponent(args.connection_id as string)}`);
  }

  private async listDirectories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['organization_id', 'domain', 'limit', 'after']);
    return this.get('/directories', params);
  }

  private async getDirectory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.directory_id) return { content: [{ type: 'text', text: 'directory_id is required' }], isError: true };
    return this.get(`/directories/${encodeURIComponent(args.directory_id as string)}`);
  }

  private async listDirectoryUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['directory', 'group', 'limit', 'after']);
    return this.get('/directory_users', params);
  }

  private async listDirectoryGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['directory', 'user', 'limit', 'after']);
    return this.get('/directory_groups', params);
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params = this.buildParams(args, ['organization_id', 'actions', 'actors', 'targets', 'occurred_at_gte', 'occurred_at_lte', 'limit', 'after']);
    return this.get('/audit_logs/events', params);
  }
}
