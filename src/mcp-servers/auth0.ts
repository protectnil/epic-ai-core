/**
 * Auth0 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/auth0/auth0-mcp-server — transport: stdio, auth: OAuth2 device authorization flow
//   (interactive browser login; stores token in keychain). Published by auth0 (Okta). Actively maintained (Mar 2026).
//   MCP covers ~18 tools: Applications (list/get/create/update/delete), Resource Servers (list/get/create),
//   Actions (list/get/create/update/deploy), Logs (list/get), Forms (list/get/create/update/publish),
//   Application Grants (create). Does NOT cover: users, roles, connections, organizations, grants (revoke).
// Our adapter covers: 29 tools (user mgmt, roles, connections, organizations, logs, clients, grants).
// Vendor MCP covers: ~18 tools.
//
// Integration: use-both
// MCP-sourced tools (use vendor MCP for these — not in our adapter):
//   auth0_list_resource_servers, auth0_get_resource_server, auth0_create_resource_server,
//   auth0_list_actions, auth0_get_action, auth0_create_action, auth0_update_action, auth0_deploy_action,
//   auth0_list_forms, auth0_get_form, auth0_create_form, auth0_update_form, auth0_publish_form,
//   auth0_create_application_grant, auth0_create_application, auth0_update_application, auth0_delete_application
// REST-sourced tools (our adapter — not covered by vendor MCP):
//   list_users, get_user, create_user, update_user, delete_user, get_user_roles, get_user_permissions,
//   get_user_logs, send_verification_email, list_roles, get_role, create_role, delete_role,
//   assign_roles_to_user, remove_roles_from_user, get_role_permissions, list_clients, get_client,
//   list_connections, get_connection, list_organizations, get_organization, list_organization_members,
//   add_organization_members, remove_organization_members, list_logs, get_log, list_grants, delete_grant
// Shared (both MCP and REST cover — FederationManager routes through MCP):
//   list_clients/get_client ↔ auth0_list_applications/auth0_get_application,
//   list_logs/get_log ↔ auth0_list_logs/auth0_get_log
// Combined coverage: 29 REST + 17 MCP-only = ~46 unique operations
//
// Base URL: https://{domain}/api/v2  (domain = your Auth0 tenant, e.g. tenant.auth0.com)
// Auth: OAuth2 M2M Bearer token — POST /oauth/token with grant_type=client_credentials,
//       audience=https://{domain}/api/v2/, client_id, client_secret
// Docs: https://auth0.com/docs/api/management/v2
// Rate limits: 1,000 requests/minute per API token (varies by plan)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Auth0Config {
  domain: string;          // e.g. your-tenant.auth0.com (no https://, no trailing slash)
  managementToken: string; // M2M access token with required Management API scopes
  baseUrl?: string;        // optional full base URL override
}

export class Auth0MCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly managementToken: string;

  constructor(config: Auth0Config) {
    super();
    const domain = config.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = config.baseUrl ?? `https://${domain}/api/v2`;
    this.managementToken = config.managementToken;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Users ─────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List users in the Auth0 tenant with optional Lucene query search, pagination, and field selection',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Lucene query string (e.g. email:"alice@example.com" or name:"Alice")' },
            search_engine: { type: 'string', description: 'Search engine version: v2 or v3 (default: v3)' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count in response (default: false)' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include' },
            sort: { type: 'string', description: 'Sort field and order (e.g. email:1 for ascending)' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a specific Auth0 user by their user ID including profile, metadata, and last login',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID (e.g. auth0|64abc123)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Auth0 user in a specific connection (database, sms, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            connection: { type: 'string', description: 'Connection name to create the user in (e.g. Username-Password-Authentication)' },
            email: { type: 'string', description: 'User email address' },
            password: { type: 'string', description: 'User password (required for database connections)' },
            name: { type: 'string', description: 'Display name' },
            given_name: { type: 'string', description: 'First name' },
            family_name: { type: 'string', description: 'Last name' },
            username: { type: 'string', description: 'Username (if connection requires it)' },
            email_verified: { type: 'boolean', description: 'Mark email as verified (default: false)' },
            blocked: { type: 'boolean', description: 'Block the user at creation (default: false)' },
            user_metadata: { type: 'object', description: 'User-editable metadata object' },
            app_metadata: { type: 'object', description: 'Application-controlled metadata object' },
          },
          required: ['connection'],
        },
      },
      {
        name: 'update_user',
        description: 'Update attributes on an Auth0 user — name, email, blocked status, or metadata',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            name: { type: 'string', description: 'Display name' },
            given_name: { type: 'string', description: 'First name' },
            family_name: { type: 'string', description: 'Last name' },
            email: { type: 'string', description: 'Email address' },
            email_verified: { type: 'boolean', description: 'Mark email as verified (true) or unverified (false)' },
            blocked: { type: 'boolean', description: 'Block (true) or unblock (false) the user' },
            user_metadata: { type: 'object', description: 'User-editable metadata (merged, not replaced)' },
            app_metadata: { type: 'object', description: 'Application-controlled metadata (merged, not replaced)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete an Auth0 user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID to delete' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_roles',
        description: 'List all roles currently assigned to an Auth0 user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_permissions',
        description: 'List all permissions granted to an Auth0 user across all their assigned roles',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_logs',
        description: 'Get recent Auth0 log events for a specific user (logins, password resets, MFA, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
            sort: { type: 'string', description: 'Sort order: date:1 (ascending) or date:-1 (descending, default)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'send_verification_email',
        description: 'Send a verification email to an Auth0 user to confirm their email address',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            client_id: { type: 'string', description: 'Client ID for branding the email (optional)' },
          },
          required: ['user_id'],
        },
      },
      // ── Roles ─────────────────────────────────────────────────────────────
      {
        name: 'list_roles',
        description: 'List roles defined in the Auth0 tenant with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name_filter: { type: 'string', description: 'Filter by role name prefix' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
        },
      },
      {
        name: 'get_role',
        description: 'Get details of a specific Auth0 role by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: { type: 'string', description: 'Auth0 role ID' },
          },
          required: ['role_id'],
        },
      },
      {
        name: 'create_role',
        description: 'Create a new Auth0 role with a name and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Role name (must be unique in the tenant)' },
            description: { type: 'string', description: 'Role description' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_role',
        description: 'Delete an Auth0 role by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: { type: 'string', description: 'Auth0 role ID to delete' },
          },
          required: ['role_id'],
        },
      },
      {
        name: 'assign_roles_to_user',
        description: 'Assign one or more roles to an Auth0 user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            roles: {
              type: 'array',
              description: 'Array of role IDs to assign',
              items: { type: 'string' },
            },
          },
          required: ['user_id', 'roles'],
        },
      },
      {
        name: 'remove_roles_from_user',
        description: 'Remove one or more roles from an Auth0 user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth0 user ID' },
            roles: {
              type: 'array',
              description: 'Array of role IDs to remove',
              items: { type: 'string' },
            },
          },
          required: ['user_id', 'roles'],
        },
      },
      {
        name: 'get_role_permissions',
        description: 'List all permissions associated with a specific Auth0 role',
        inputSchema: {
          type: 'object',
          properties: {
            role_id: { type: 'string', description: 'Auth0 role ID' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
          required: ['role_id'],
        },
      },
      // ── Clients (Applications) ─────────────────────────────────────────────
      {
        name: 'list_clients',
        description: 'List Auth0 applications (clients) in the tenant with optional app type filter',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
            fields: { type: 'string', description: 'Comma-separated fields to include' },
            app_type: { type: 'string', description: 'Filter by app type: native, spa, regular_web, non_interactive' },
          },
        },
      },
      {
        name: 'get_client',
        description: 'Get full details of a specific Auth0 application (client) by its client ID',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Auth0 client ID' },
            fields: { type: 'string', description: 'Comma-separated fields to include' },
          },
          required: ['client_id'],
        },
      },
      // ── Connections ────────────────────────────────────────────────────────
      {
        name: 'list_connections',
        description: 'List identity provider connections configured in the Auth0 tenant (database, social, enterprise)',
        inputSchema: {
          type: 'object',
          properties: {
            strategy: {
              type: 'string',
              description: 'Filter by connection strategy: auth0, google-oauth2, github, samlp, waad, adfs, etc.',
            },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
            fields: { type: 'string', description: 'Comma-separated fields to include' },
          },
        },
      },
      {
        name: 'get_connection',
        description: 'Get full details of a specific Auth0 connection by its connection ID',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: { type: 'string', description: 'Auth0 connection ID (con_...)' },
          },
          required: ['connection_id'],
        },
      },
      // ── Organizations ──────────────────────────────────────────────────────
      {
        name: 'list_organizations',
        description: 'List organizations in the Auth0 tenant with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details of a specific Auth0 organization by its organization ID',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Auth0 organization ID (org_...)' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_organization_members',
        description: 'List members of an Auth0 organization with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Auth0 organization ID' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'add_organization_members',
        description: 'Add users to an Auth0 organization by their user IDs',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Auth0 organization ID' },
            members: {
              type: 'array',
              description: 'Array of user IDs to add to the organization',
              items: { type: 'string' },
            },
          },
          required: ['organization_id', 'members'],
        },
      },
      {
        name: 'remove_organization_members',
        description: 'Remove users from an Auth0 organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Auth0 organization ID' },
            members: {
              type: 'array',
              description: 'Array of user IDs to remove from the organization',
              items: { type: 'string' },
            },
          },
          required: ['organization_id', 'members'],
        },
      },
      // ── Logs ──────────────────────────────────────────────────────────────
      {
        name: 'list_logs',
        description: 'Retrieve Auth0 tenant log events with optional Lucene filter, sort, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
            from: { type: 'string', description: 'Log ID to start from (checkpoint-based pagination)' },
            take: { type: 'number', description: 'Records to take with checkpoint pagination (max 100)' },
            q: { type: 'string', description: 'Lucene query filter (e.g. type:fp for failed passwords, type:s for successes)' },
            sort: { type: 'string', description: 'Sort field and order (e.g. date:-1 for descending)' },
          },
        },
      },
      {
        name: 'get_log',
        description: 'Get a single Auth0 log event by its log entry ID',
        inputSchema: {
          type: 'object',
          properties: {
            log_id: { type: 'string', description: 'Log entry ID' },
          },
          required: ['log_id'],
        },
      },
      // ── Grants ────────────────────────────────────────────────────────────
      {
        name: 'list_grants',
        description: 'List OAuth2 grants (authorizations) issued in the tenant, filterable by user or client',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Filter by user ID' },
            client_id: { type: 'string', description: 'Filter by client (application) ID' },
            audience: { type: 'string', description: 'Filter by audience (API identifier)' },
            page: { type: 'number', description: 'Page number, 0-based (default: 0)' },
            per_page: { type: 'number', description: 'Results per page, max 100 (default: 50)' },
            include_totals: { type: 'boolean', description: 'Include total count (default: false)' },
          },
        },
      },
      {
        name: 'delete_grant',
        description: 'Revoke an OAuth2 grant, forcing the user to re-authorize the application',
        inputSchema: {
          type: 'object',
          properties: {
            grant_id: { type: 'string', description: 'Grant ID to revoke' },
          },
          required: ['grant_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'create_user':
          return await this.createUser(args);
        case 'update_user':
          return await this.updateUser(args);
        case 'delete_user':
          return await this.deleteUser(args);
        case 'get_user_roles':
          return await this.getUserRoles(args);
        case 'get_user_permissions':
          return await this.getUserPermissions(args);
        case 'get_user_logs':
          return await this.getUserLogs(args);
        case 'send_verification_email':
          return await this.sendVerificationEmail(args);
        case 'list_roles':
          return await this.listRoles(args);
        case 'get_role':
          return await this.getRole(args);
        case 'create_role':
          return await this.createRole(args);
        case 'delete_role':
          return await this.deleteRole(args);
        case 'assign_roles_to_user':
          return await this.assignRolesToUser(args);
        case 'remove_roles_from_user':
          return await this.removeRolesFromUser(args);
        case 'get_role_permissions':
          return await this.getRolePermissions(args);
        case 'list_clients':
          return await this.listClients(args);
        case 'get_client':
          return await this.getClient(args);
        case 'list_connections':
          return await this.listConnections(args);
        case 'get_connection':
          return await this.getConnection(args);
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'get_organization':
          return await this.getOrganization(args);
        case 'list_organization_members':
          return await this.listOrganizationMembers(args);
        case 'add_organization_members':
          return await this.addOrganizationMembers(args);
        case 'remove_organization_members':
          return await this.removeOrganizationMembers(args);
        case 'list_logs':
          return await this.listLogs(args);
        case 'get_log':
          return await this.getLog(args);
        case 'list_grants':
          return await this.listGrants(args);
        case 'delete_grant':
          return await this.deleteGrant(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.managementToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let errText: string;
      try {
        const err = await response.json() as { message?: string };
        errText = err.message ?? `${response.status} ${response.statusText}`;
      } catch {
        errText = `${response.status} ${response.statusText}`;
      }
      return { content: [{ type: 'text', text: `API error: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = response.status === 204 ? { status: 'success' } : await response.json();
    } catch {
      throw new Error(`Auth0 returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private paginationParams(args: Record<string, unknown>): URLSearchParams {
    const p = new URLSearchParams();
    if (typeof args.page === 'number') p.set('page', String(args.page));
    if (typeof args.per_page === 'number') p.set('per_page', String(args.per_page));
    if (typeof args.include_totals === 'boolean') p.set('include_totals', String(args.include_totals));
    return p;
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.q) params.set('q', String(args.q));
    params.set('search_engine', (args.search_engine as string) ?? 'v3');
    if (args.fields) params.set('fields', String(args.fields));
    if (args.sort) params.set('sort', String(args.sort));
    return this.fetchJSON(`${this.baseUrl}/users?${params}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { connection: args.connection };
    if (args.email) body.email = args.email;
    if (args.password) body.password = args.password;
    if (args.name) body.name = args.name;
    if (args.given_name) body.given_name = args.given_name;
    if (args.family_name) body.family_name = args.family_name;
    if (args.username) body.username = args.username;
    if (typeof args.email_verified === 'boolean') body.email_verified = args.email_verified;
    if (typeof args.blocked === 'boolean') body.blocked = args.blocked;
    if (args.user_metadata) body.user_metadata = args.user_metadata;
    if (args.app_metadata) body.app_metadata = args.app_metadata;
    return this.fetchJSON(`${this.baseUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.given_name !== undefined) body.given_name = args.given_name;
    if (args.family_name !== undefined) body.family_name = args.family_name;
    if (args.email !== undefined) body.email = args.email;
    if (typeof args.email_verified === 'boolean') body.email_verified = args.email_verified;
    if (typeof args.blocked === 'boolean') body.blocked = args.blocked;
    if (args.user_metadata !== undefined) body.user_metadata = args.user_metadata;
    if (args.app_metadata !== undefined) body.app_metadata = args.app_metadata;
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}`,
      { method: 'DELETE' },
    );
  }

  private async getUserRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}/roles?${params}`);
  }

  private async getUserPermissions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}/permissions?${params}`);
  }

  private async getUserLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.sort) params.set('sort', String(args.sort));
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}/logs?${params}`);
  }

  private async sendVerificationEmail(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { user_id: args.user_id };
    if (args.client_id) body.client_id = args.client_id;
    return this.fetchJSON(`${this.baseUrl}/jobs/verification-email`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.name_filter) params.set('name_filter', String(args.name_filter));
    return this.fetchJSON(`${this.baseUrl}/roles?${params}`);
  }

  private async getRole(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/roles/${encodeURIComponent(String(args.role_id))}`);
  }

  private async createRole(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.fetchJSON(`${this.baseUrl}/roles`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteRole(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/roles/${encodeURIComponent(String(args.role_id))}`,
      { method: 'DELETE' },
    );
  }

  private async assignRolesToUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roles: args.roles }),
    });
  }

  private async removeRolesFromUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/users/${encodeURIComponent(String(args.user_id))}/roles`, {
      method: 'DELETE',
      body: JSON.stringify({ roles: args.roles }),
    });
  }

  private async getRolePermissions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.fetchJSON(`${this.baseUrl}/roles/${encodeURIComponent(String(args.role_id))}/permissions?${params}`);
  }

  private async listClients(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.fields) params.set('fields', String(args.fields));
    if (args.app_type) params.set('app_type', String(args.app_type));
    return this.fetchJSON(`${this.baseUrl}/clients?${params}`);
  }

  private async getClient(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', String(args.fields));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/clients/${encodeURIComponent(String(args.client_id))}${qs ? `?${qs}` : ''}`);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.strategy) params.set('strategy', String(args.strategy));
    if (args.fields) params.set('fields', String(args.fields));
    return this.fetchJSON(`${this.baseUrl}/connections?${params}`);
  }

  private async getConnection(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/connections/${encodeURIComponent(String(args.connection_id))}`);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.fetchJSON(`${this.baseUrl}/organizations?${params}`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/organizations/${encodeURIComponent(String(args.organization_id))}`);
  }

  private async listOrganizationMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.fetchJSON(`${this.baseUrl}/organizations/${encodeURIComponent(String(args.organization_id))}/members?${params}`);
  }

  private async addOrganizationMembers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/organizations/${encodeURIComponent(String(args.organization_id))}/members`, {
      method: 'POST',
      body: JSON.stringify({ members: args.members }),
    });
  }

  private async removeOrganizationMembers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/organizations/${encodeURIComponent(String(args.organization_id))}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ members: args.members }),
    });
  }

  private async listLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.from) params.set('from', String(args.from));
    if (args.take) params.set('take', String(args.take));
    if (args.q) params.set('q', String(args.q));
    if (args.sort) params.set('sort', String(args.sort));
    return this.fetchJSON(`${this.baseUrl}/logs?${params}`);
  }

  private async getLog(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/logs/${encodeURIComponent(String(args.log_id))}`);
  }

  private async listGrants(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.user_id) params.set('user_id', String(args.user_id));
    if (args.client_id) params.set('client_id', String(args.client_id));
    if (args.audience) params.set('audience', String(args.audience));
    return this.fetchJSON(`${this.baseUrl}/grants?${params}`);
  }

  private async deleteGrant(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/grants/${encodeURIComponent(String(args.grant_id))}`,
      { method: 'DELETE' },
    );
  }

  static catalog() {
    return {
      name: 'auth0',
      displayName: 'Auth0',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['auth0', 'identity', 'users', 'roles', 'permissions', 'oauth', 'sso', 'authentication', 'authorization', 'connections', 'organizations', 'rbac'],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'get_user_roles', 'get_user_permissions', 'get_user_logs', 'send_verification_email',
        'list_roles', 'get_role', 'create_role', 'delete_role',
        'assign_roles_to_user', 'remove_roles_from_user', 'get_role_permissions',
        'list_clients', 'get_client',
        'list_connections', 'get_connection',
        'list_organizations', 'get_organization',
        'list_organization_members', 'add_organization_members', 'remove_organization_members',
        'list_logs', 'get_log',
        'list_grants', 'delete_grant',
      ],
      description: 'Identity and access management via Auth0 Management API: manage users, roles, permissions, clients, connections, organizations, and audit logs.',
      author: 'protectnil' as const,
    };
  }
}
