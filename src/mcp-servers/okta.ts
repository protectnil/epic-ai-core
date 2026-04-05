/**
 * Okta MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/okta/okta-mcp-server — transport: stdio, auth: Device Auth Grant or Private Key JWT
// Vendor MCP covers: full Okta admin API — users, groups, apps, policies, factors, devices + CRUD + lifecycle.
//   Uses Python SDK. README last updated Feb 24, 2026 (actively maintained). Destructive ops use MCP Elicitation.
//   Confirmed tools: list_users, get_user, create_user, update_user, deactivate_user, delete_deactivated_user,
//   get_user_profile_attributes, list_groups, get_group, create_group, delete_group, list_group_users,
//   list_group_apps, add_user_to_group, remove_user_from_group, list_applications, get_application,
//   create_application, delete_application, activate_application, deactivate_application,
//   list_policies, get_policy, create_policy, update_policy, delete_policy,
//   list_policy_rules, get_policy_rule, create_policy_rule, update_policy_rule,
//   delete_policy_rule, activate_policy_rule, deactivate_policy_rule,
//   get_system_logs (30+ tools total).
// Our adapter covers: 18 tools (REST v1 API surface using SSWS token or Bearer — for API-token deployments).
// Recommendation: use-both — MCP has unique tools (delete_group, create_application, delete_application,
//   activate/deactivate_application, full policy CRUD, get_user_profile_attributes) not in our REST adapter.
//   Our REST adapter covers list_user_factors (GET /users/{id}/factors) not in the Okta MCP.
//   Our REST adapter is required for SSWS API-token deployments (MCP requires OAuth 2.0).
// Integration: use-both
// MCP-sourced tools (unique): delete_group, create_application, delete_application, activate_application,
//   deactivate_application, full policy/policy_rule CRUD, get_user_profile_attributes, deactivate_user (separate)
// REST-sourced tools (18): list_users, get_user, create_user, update_user, delete_user, user_lifecycle,
//   reset_user_password, list_groups, get_group, create_group, add_user_to_group, remove_user_from_group,
//   list_group_members, list_apps, get_app, assign_user_to_app, list_user_factors, get_system_logs
//
// Base URL: https://{yourOktaDomain} (caller supplies org domain, no trailing slash)
// Auth: SSWS API token (legacy) or OAuth 2.0 Bearer token. SSWS is prepended automatically if token
//   does not start with "SSWS " or "Bearer ". Okta recommends OAuth 2.0 for new integrations.
// Docs: https://developer.okta.com/docs/reference/core-okta-api/
// Rate limits: Varies by endpoint and tier; typically 600 req/min for most management endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OktaConfig {
  orgUrl: string;    // e.g. https://your-org.okta.com (no trailing slash)
  apiToken: string;  // Raw token, "SSWS <token>", or "Bearer <access_token>"
}

export class OktaMCPServer extends MCPAdapterBase {
  private readonly orgUrl: string;
  private readonly authHeader: string;

  constructor(config: OktaConfig) {
    super();
    this.orgUrl = config.orgUrl.replace(/\/$/, '');
    // Prepend "SSWS " if the token is not already prefixed
    this.authHeader =
      config.apiToken.startsWith('SSWS ') || config.apiToken.startsWith('Bearer ')
        ? config.apiToken
        : `SSWS ${config.apiToken}`;
  }

  static catalog() {
    return {
      name: 'okta',
      displayName: 'Okta',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['okta', 'identity', 'iam', 'sso', 'mfa', 'user', 'group', 'application', 'policy', 'factor', 'lifecycle', 'audit', 'log', 'provisioning', 'deprovisioning'],
      toolNames: [
        'list_users',
        'get_user',
        'create_user',
        'update_user',
        'delete_user',
        'user_lifecycle',
        'reset_user_password',
        'list_groups',
        'get_group',
        'create_group',
        'add_user_to_group',
        'remove_user_from_group',
        'list_group_members',
        'list_apps',
        'get_app',
        'assign_user_to_app',
        'list_user_factors',
        'get_system_logs',
      ],
      description: 'Okta identity management: CRUD users and groups, lifecycle transitions, MFA factors, application assignments, and audit log queries.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Okta org with optional SCIM filter, search expression, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'SCIM filter expression (e.g. status eq "ACTIVE" or profile.email sw "alice") — preferred over filter',
            },
            filter: {
              type: 'string',
              description: 'Legacy Okta filter expression (e.g. status eq "LOCKED_OUT")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (max 200, default: 200)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from the Link header of a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve a single Okta user by user ID, login name, or email address',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Okta user ID (e.g. 00u1abc123xyz) or login/email address',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Okta user with profile attributes; optionally send an activation email immediately',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'User first name',
            },
            last_name: {
              type: 'string',
              description: 'User last name',
            },
            email: {
              type: 'string',
              description: 'Primary email address (used as login unless login is provided)',
            },
            login: {
              type: 'string',
              description: 'Login name — defaults to email if omitted',
            },
            mobile_phone: {
              type: 'string',
              description: 'Mobile phone number (optional)',
            },
            activate: {
              type: 'boolean',
              description: 'Send activation email immediately after creation (default: true)',
            },
            password: {
              type: 'string',
              description: 'Set an initial password (optional; requires activate=false to skip email)',
            },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update profile attributes on an existing Okta user (partial update — only provided fields are changed)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Okta user ID or login',
            },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated primary email' },
            mobile_phone: { type: 'string', description: 'Updated mobile phone number' },
            department: { type: 'string', description: 'Updated department' },
            title: { type: 'string', description: 'Updated job title' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete an Okta user. The user must be deactivated first. Sends the user to the DELETED state (irreversible).',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Okta user ID or login to delete',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'user_lifecycle',
        description: 'Perform a lifecycle transition on an Okta user: activate, deactivate, suspend, unsuspend, unlock, or reactivate',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Okta user ID or login',
            },
            action: {
              type: 'string',
              description: 'Lifecycle action: activate | deactivate | suspend | unsuspend | unlock | reactivate',
            },
            send_email: {
              type: 'boolean',
              description: 'Send notification email (applies to activate, deactivate, reactivate; default: false)',
            },
          },
          required: ['user_id', 'action'],
        },
      },
      {
        name: 'reset_user_password',
        description: 'Trigger a password reset for an Okta user, optionally sending a reset email',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Okta user ID or login',
            },
            send_email: {
              type: 'boolean',
              description: 'Send password reset email to the user (default: true)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List groups in the Okta org with optional name prefix search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Prefix search on the group name',
            },
            search: {
              type: 'string',
              description: 'SCIM filter expression for groups (e.g. type eq "APP_GROUP")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default: 200)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve a single Okta group by group ID including profile and type',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Okta group ID (e.g. 00g1abc123xyz)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new Okta group with a name and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Group name',
            },
            description: {
              type: 'string',
              description: 'Group description (optional)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'add_user_to_group',
        description: 'Add an Okta user to a group by user ID and group ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Okta group ID',
            },
            user_id: {
              type: 'string',
              description: 'Okta user ID',
            },
          },
          required: ['group_id', 'user_id'],
        },
      },
      {
        name: 'remove_user_from_group',
        description: 'Remove an Okta user from a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Okta group ID',
            },
            user_id: {
              type: 'string',
              description: 'Okta user ID',
            },
          },
          required: ['group_id', 'user_id'],
        },
      },
      {
        name: 'list_group_members',
        description: 'List all users who are members of a specific Okta group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Okta group ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 1000, default: 200)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_apps',
        description: 'List applications in the Okta org with optional name search, status filter, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Prefix search on the application label',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter expression (e.g. status eq "ACTIVE" or user.id eq "00u1abc")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 200, default: 200)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_app',
        description: 'Retrieve a single Okta application by application ID including settings and credentials',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Okta application ID (e.g. 0oa1abc123xyz)',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'assign_user_to_app',
        description: 'Assign an Okta user to an application with optional app-user profile override',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Okta application ID',
            },
            user_id: {
              type: 'string',
              description: 'Okta user ID to assign',
            },
            scope: {
              type: 'string',
              description: 'Assignment scope: USER (default) — only USER is supported for direct assignment',
            },
            profile: {
              type: 'object',
              description: 'App-user profile overrides (optional, app-specific attributes)',
            },
          },
          required: ['app_id', 'user_id'],
        },
      },
      {
        name: 'list_user_factors',
        description: 'List all enrolled MFA factors for a specific Okta user including factor type and status',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Okta user ID or login',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_system_logs',
        description: 'Query the Okta System Log for audit and security events with optional time range, filter, and keyword search',
        inputSchema: {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              description: 'ISO 8601 start timestamp (e.g. 2026-03-01T00:00:00Z)',
            },
            until: {
              type: 'string',
              description: 'ISO 8601 end timestamp (e.g. 2026-03-24T23:59:59Z)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter on log fields (e.g. eventType eq "user.session.start")',
            },
            q: {
              type: 'string',
              description: 'Free-text keyword search across all log fields',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (max 1000, default: 100)',
            },
          },
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
        case 'user_lifecycle':
          return await this.userLifecycle(args);
        case 'reset_user_password':
          return await this.resetUserPassword(args);
        case 'list_groups':
          return await this.listGroups(args);
        case 'get_group':
          return await this.getGroup(args);
        case 'create_group':
          return await this.createGroup(args);
        case 'add_user_to_group':
          return await this.addUserToGroup(args);
        case 'remove_user_from_group':
          return await this.removeUserFromGroup(args);
        case 'list_group_members':
          return await this.listGroupMembers(args);
        case 'list_apps':
          return await this.listApps(args);
        case 'get_app':
          return await this.getApp(args);
        case 'assign_user_to_app':
          return await this.assignUserToApp(args);
        case 'list_user_factors':
          return await this.listUserFactors(args);
        case 'get_system_logs':
          return await this.getSystemLogs(args);
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
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.orgUrl}${path}`, { method: 'GET', headers: this.headers });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async post(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.orgUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: unknown;
    try {
      const text = await response.text();
      data = text.trim() ? JSON.parse(text) : { status: 'success' };
    } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async put(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.orgUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
    });
    let data: unknown;
    try {
      const text = await response.text();
      data = text.trim() ? JSON.parse(text) : { status: 'success' };
    } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.orgUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search) params.set('search', args.search as string);
    if (args.filter) params.set('filter', args.filter as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.after) params.set('after', args.after as string);
    return this.get(`/api/v1/users?${params.toString()}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/api/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const profile: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
      email: args.email,
      login: args.login ?? args.email,
    };
    if (args.mobile_phone) profile.mobilePhone = args.mobile_phone;

    const body: Record<string, unknown> = { profile };
    if (args.password) {
      body.credentials = { password: { value: args.password } };
    }

    const activateParam = args.activate !== false;
    return this.post(`/api/v1/users?activate=${activateParam}`, body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const profile: Record<string, unknown> = {};
    if (args.first_name) profile.firstName = args.first_name;
    if (args.last_name) profile.lastName = args.last_name;
    if (args.email) profile.email = args.email;
    if (args.mobile_phone) profile.mobilePhone = args.mobile_phone;
    if (args.department) profile.department = args.department;
    if (args.title) profile.title = args.title;

    const response = await this.fetchWithRetry(`${this.orgUrl}/api/v1/users/${encodeURIComponent(args.user_id as string)}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ profile }),
    });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Okta returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.del(`/api/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async userLifecycle(args: Record<string, unknown>): Promise<ToolResult> {
    const action = (args.action as string).toLowerCase();
    const validActions = ['activate', 'deactivate', 'suspend', 'unsuspend', 'unlock', 'reactivate'];
    if (!validActions.includes(action)) {
      return {
        content: [{ type: 'text', text: `Invalid action "${action}". Must be one of: ${validActions.join(', ')}` }],
        isError: true,
      };
    }

    let path = `/api/v1/users/${encodeURIComponent(args.user_id as string)}/lifecycle/${action}`;
    const emailActions = ['activate', 'deactivate', 'reactivate'];
    if (emailActions.includes(action) && typeof args.send_email === 'boolean') {
      path += `?sendEmail=${encodeURIComponent(String(args.send_email))}`;
    }
    return this.post(path);
  }

  private async resetUserPassword(args: Record<string, unknown>): Promise<ToolResult> {
    const sendEmail = args.send_email !== false;
    return this.post(`/api/v1/users/${encodeURIComponent(args.user_id as string)}/lifecycle/reset_password?sendEmail=${sendEmail}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.search) params.set('search', args.search as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.after) params.set('after', args.after as string);
    return this.get(`/api/v1/groups?${params.toString()}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/api/v1/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      profile: { name: args.name },
    };
    if (args.description) (body.profile as Record<string, unknown>).description = args.description;
    return this.post('/api/v1/groups', body);
  }

  private async addUserToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.put(`/api/v1/groups/${encodeURIComponent(args.group_id as string)}/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async removeUserFromGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.del(`/api/v1/groups/${encodeURIComponent(args.group_id as string)}/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.after) params.set('after', args.after as string);
    return this.get(`/api/v1/groups/${encodeURIComponent(args.group_id as string)}/users?${params.toString()}`);
  }

  private async listApps(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.filter) params.set('filter', args.filter as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.after) params.set('after', args.after as string);
    return this.get(`/api/v1/apps?${params.toString()}`);
  }

  private async getApp(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/api/v1/apps/${encodeURIComponent(args.app_id as string)}`);
  }

  private async assignUserToApp(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      id: args.user_id,
      scope: (args.scope as string) ?? 'USER',
    };
    if (args.profile) body.profile = args.profile;
    return this.post(`/api/v1/apps/${encodeURIComponent(args.app_id as string)}/users`, body);
  }

  private async listUserFactors(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/api/v1/users/${encodeURIComponent(args.user_id as string)}/factors`);
  }

  private async getSystemLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    if (args.filter) params.set('filter', args.filter as string);
    if (args.q) params.set('q', args.q as string);
    params.set('limit', String((args.limit as number) ?? 100));
    return this.get(`/api/v1/logs?${params.toString()}`);
  }
}
