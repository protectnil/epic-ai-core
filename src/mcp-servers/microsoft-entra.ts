/**
 * Microsoft Entra ID MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/EnterpriseMCP — transport: streamable-HTTP, auth: delegated OAuth2 (user sign-in required)
// The Microsoft EnterpriseMCP server exposes 3 tools (suggest_queries, get, list_properties) using
// delegated permissions only. It does not support service principal / client_credentials auth and
// is read-only (no create/update/delete operations).
// Our adapter covers 21 tools with full service-principal auth (client_credentials) including
// write operations (create user, update user, assign role, manage groups, reset password).
// Recommendation: Use microsoft/EnterpriseMCP for interactive/read-only Entra scenarios.
//   Use this adapter for automation, service accounts, and write operations.
//
// Base URL: https://graph.microsoft.com/v1.0
//   National clouds: https://graph.microsoft.us/v1.0 (US Gov), https://graph.microsoft.de/v1.0 (DE)
// Auth: OAuth2 client_credentials via
//   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
//   scope = https://graph.microsoft.com/.default
// Docs: https://learn.microsoft.com/en-us/graph/identity-network-access-overview
// Rate limits: Per-resource throttling. Typically 10,000 requests/10 min per tenant.
// Note: $search and $filter are mutually exclusive on most Graph endpoints.
//   $search requires ConsistencyLevel: eventual header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MicrosoftEntraConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  graphBaseUrl?: string;
}

export class MicrosoftEntraMCPServer extends MCPAdapterBase {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly graphBaseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  constructor(config: MicrosoftEntraConfig) {
    super();
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.graphBaseUrl = (config.graphBaseUrl ?? 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'microsoft-entra',
      displayName: 'Microsoft Entra ID',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: [
        'entra', 'azure-ad', 'aad', 'microsoft', 'identity', 'users', 'groups',
        'applications', 'service-principals', 'roles', 'rbac', 'conditional-access',
        'mfa', 'sign-in', 'audit', 'directory', 'tenant', 'oauth', 'sso',
      ],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'reset_user_password', 'list_groups', 'get_group', 'create_group',
        'get_group_members', 'add_group_member', 'remove_group_member',
        'list_applications', 'get_application', 'list_service_principals',
        'get_service_principal', 'list_directory_roles', 'list_role_assignments',
        'list_conditional_access_policies', 'get_sign_in_logs', 'get_audit_logs',
      ],
      description: 'Manage Microsoft Entra ID (Azure AD): list, create, update, and delete users and groups; manage application registrations and service principals; assign directory roles; query conditional access policies, sign-in logs, and audit logs.',
      author: 'protectnil',
    };
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) return this.cachedToken;

    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token acquisition failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Microsoft Entra ID tenant. Supports OData $filter, $search (mutually exclusive), $select, and $top. $search requires ConsistencyLevel: eventual.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "displayName eq \'Alice\'" or "accountEnabled eq true"). Cannot be combined with search.',
            },
            search: {
              type: 'string',
              description: 'OData $search expression (e.g. "displayName:Alice"). Cannot be combined with filter.',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return (e.g. id,displayName,mail,userPrincipalName,accountEnabled)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (max 999, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a specific Microsoft Entra user by object ID or user principal name (UPN).',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Object ID (GUID) or user principal name (e.g. alice@contoso.com)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user in the Microsoft Entra ID tenant. Requires User.ReadWrite.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              description: 'Display name of the user',
            },
            userPrincipalName: {
              type: 'string',
              description: 'UPN (e.g. alice@contoso.com)',
            },
            mailNickname: {
              type: 'string',
              description: 'Mail alias / nickname (without domain)',
            },
            password: {
              type: 'string',
              description: 'Initial password (must meet tenant password policy)',
            },
            forceChangePasswordNextSignIn: {
              type: 'boolean',
              description: 'Require password change on next sign-in (default: true)',
            },
            accountEnabled: {
              type: 'boolean',
              description: 'Whether the account is enabled (default: true)',
            },
            givenName: {
              type: 'string',
              description: 'First name',
            },
            surname: {
              type: 'string',
              description: 'Last name',
            },
            jobTitle: {
              type: 'string',
              description: 'Job title',
            },
            department: {
              type: 'string',
              description: 'Department',
            },
          },
          required: ['displayName', 'userPrincipalName', 'mailNickname', 'password'],
        },
      },
      {
        name: 'update_user',
        description: 'Update properties of an existing Microsoft Entra user. Requires User.ReadWrite.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Object ID or UPN of the user to update',
            },
            displayName: {
              type: 'string',
              description: 'New display name',
            },
            jobTitle: {
              type: 'string',
              description: 'New job title',
            },
            department: {
              type: 'string',
              description: 'New department',
            },
            accountEnabled: {
              type: 'boolean',
              description: 'Enable or disable the account',
            },
            usageLocation: {
              type: 'string',
              description: 'Two-letter ISO country code (required for license assignment)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user from the Microsoft Entra ID tenant. Soft-deletes to the Deleted Items container. Requires User.ReadWrite.All.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Object ID or UPN of the user to delete',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'reset_user_password',
        description: 'Reset the password of a Microsoft Entra user. Requires UserAuthenticationMethod.ReadWrite.All or privileged role.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Object ID or UPN of the user',
            },
            newPassword: {
              type: 'string',
              description: 'New temporary password (must meet tenant complexity requirements)',
            },
            forceChangePasswordNextSignIn: {
              type: 'boolean',
              description: 'Require change on next sign-in (default: true)',
            },
          },
          required: ['userId', 'newPassword'],
        },
      },
      {
        name: 'list_groups',
        description: 'List Microsoft Entra security groups and Microsoft 365 groups. Supports OData $filter, $search, $select, and $top.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "displayName eq \'Engineering\'" or "securityEnabled eq true")',
            },
            search: {
              type: 'string',
              description: 'OData $search expression (requires ConsistencyLevel: eventual)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details of a specific Microsoft Entra group by its object ID.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'Object ID of the group (GUID)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new security group or Microsoft 365 group in Entra ID. Requires Group.ReadWrite.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              description: 'Display name of the group',
            },
            mailNickname: {
              type: 'string',
              description: 'Mail alias (no spaces, no domain)',
            },
            description: {
              type: 'string',
              description: 'Group description',
            },
            securityEnabled: {
              type: 'boolean',
              description: 'Create as a security group (default: true)',
            },
            mailEnabled: {
              type: 'boolean',
              description: 'Create as a mail-enabled group — set true for Microsoft 365 groups (default: false)',
            },
            groupTypes: {
              type: 'array',
              description: 'Group type array: ["Unified"] for Microsoft 365 group, [] for security group',
            },
          },
          required: ['displayName', 'mailNickname'],
        },
      },
      {
        name: 'get_group_members',
        description: 'List direct members of a Microsoft Entra group.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'Object ID of the group',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return for each member',
            },
            top: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100)',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'add_group_member',
        description: 'Add a user or service principal as a direct member of a Microsoft Entra group.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'Object ID of the group',
            },
            memberId: {
              type: 'string',
              description: 'Object ID of the user or service principal to add',
            },
          },
          required: ['groupId', 'memberId'],
        },
      },
      {
        name: 'remove_group_member',
        description: 'Remove a direct member from a Microsoft Entra group.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'Object ID of the group',
            },
            memberId: {
              type: 'string',
              description: 'Object ID of the member to remove',
            },
          },
          required: ['groupId', 'memberId'],
        },
      },
      {
        name: 'list_applications',
        description: 'List application registrations in the Entra ID tenant. Supports OData $filter and $select.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "displayName eq \'MyApp\'")',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get an application registration by its object ID.',
        inputSchema: {
          type: 'object',
          properties: {
            applicationId: {
              type: 'string',
              description: 'Object ID of the application registration (not the client/app ID)',
            },
          },
          required: ['applicationId'],
        },
      },
      {
        name: 'list_service_principals',
        description: 'List service principals (enterprise apps) in the Entra ID tenant. Supports OData $filter and $select.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "displayName eq \'MyApp\'" or "appId eq \'<guid>\'")',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_service_principal',
        description: 'Get a service principal by its object ID.',
        inputSchema: {
          type: 'object',
          properties: {
            servicePrincipalId: {
              type: 'string',
              description: 'Object ID of the service principal',
            },
          },
          required: ['servicePrincipalId'],
        },
      },
      {
        name: 'list_directory_roles',
        description: 'List activated directory roles in the Entra ID tenant (e.g. Global Administrator, User Administrator).',
        inputSchema: {
          type: 'object',
          properties: {
            select: {
              type: 'string',
              description: 'Comma-separated properties to return (e.g. id,displayName,roleTemplateId)',
            },
          },
        },
      },
      {
        name: 'list_role_assignments',
        description: 'List Entra ID role assignments, optionally filtered by roleDefinitionId or principalId.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter (e.g. "roleDefinitionId eq \'<guid>\'" or "principalId eq \'<userId>\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of results (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_conditional_access_policies',
        description: 'List Conditional Access policies in the Entra ID tenant. Requires Policy.Read.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "state eq \'enabled\'")',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
        },
      },
      {
        name: 'get_sign_in_logs',
        description: 'Retrieve Entra ID sign-in activity logs. Requires AuditLog.Read.All permission. Supports OData $filter for user, app, IP, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter (e.g. "createdDateTime ge 2026-03-01T00:00:00Z and userDisplayName eq \'Alice\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of log entries to return (max: 1000, default: 50)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
        },
      },
      {
        name: 'get_audit_logs',
        description: 'Retrieve Entra ID directory audit logs for admin operations (user creation, role assignments, etc.). Requires AuditLog.Read.All permission.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter (e.g. "activityDateTime ge 2026-03-01T00:00:00Z and initiatedBy/user/userPrincipalName eq \'admin@contoso.com\'")',
            },
            top: {
              type: 'number',
              description: 'Maximum number of log entries to return (max: 1000, default: 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_users':
          return await this.listUsers(args, headers);
        case 'get_user':
          return await this.getUser(args, headers);
        case 'create_user':
          return await this.createUser(args, headers);
        case 'update_user':
          return await this.updateUser(args, headers);
        case 'delete_user':
          return await this.deleteUser(args, headers);
        case 'reset_user_password':
          return await this.resetUserPassword(args, headers);
        case 'list_groups':
          return await this.listGroups(args, headers);
        case 'get_group':
          return await this.getGroup(args, headers);
        case 'create_group':
          return await this.createGroup(args, headers);
        case 'get_group_members':
          return await this.getGroupMembers(args, headers);
        case 'add_group_member':
          return await this.addGroupMember(args, headers);
        case 'remove_group_member':
          return await this.removeGroupMember(args, headers);
        case 'list_applications':
          return await this.listApplications(args, headers);
        case 'get_application':
          return await this.getApplication(args, headers);
        case 'list_service_principals':
          return await this.listServicePrincipals(args, headers);
        case 'get_service_principal':
          return await this.getServicePrincipal(args, headers);
        case 'list_directory_roles':
          return await this.listDirectoryRoles(args, headers);
        case 'list_role_assignments':
          return await this.listRoleAssignments(args, headers);
        case 'list_conditional_access_policies':
          return await this.listConditionalAccessPolicies(args, headers);
        case 'get_sign_in_logs':
          return await this.getSignInLogs(args, headers);
        case 'get_audit_logs':
          return await this.getAuditLogs(args, headers);
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

  private async graphGet(path: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.graphBaseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async graphPost(path: string, headers: Record<string, string>, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.graphBaseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async graphPatch(path: string, headers: Record<string, string>, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.graphBaseUrl}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async graphDelete(path: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.graphBaseUrl}${path}`, { method: 'DELETE', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private buildParams(args: Record<string, unknown>, extraFields?: Record<string, string>): string {
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    if (args.select) p.set('$select', args.select as string);
    if (args.top) p.set('$top', String(args.top));
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  private async listUsers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (args.filter && args.search) {
      return { content: [{ type: 'text', text: '$filter and $search are mutually exclusive' }], isError: true };
    }
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    if (args.select) p.set('$select', args.select as string);
    if (args.top) p.set('$top', String(args.top));
    const reqHeaders = { ...headers };
    if (args.search) {
      p.set('$search', args.search as string);
      reqHeaders['ConsistencyLevel'] = 'eventual';
    }
    const qs = p.toString() ? `?${p.toString()}` : '';
    return this.graphGet(`/users${qs}`, reqHeaders);
  }

  private async getUser(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    const p = new URLSearchParams();
    if (args.select) p.set('$select', args.select as string);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return this.graphGet(`/users/${encodeURIComponent(userId)}${qs}`, headers);
  }

  private async createUser(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const { displayName, userPrincipalName, mailNickname, password } = args;
    if (!displayName || !userPrincipalName || !mailNickname || !password) {
      return { content: [{ type: 'text', text: 'displayName, userPrincipalName, mailNickname, and password are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      displayName,
      userPrincipalName,
      mailNickname,
      accountEnabled: args.accountEnabled ?? true,
      passwordProfile: {
        password,
        forceChangePasswordNextSignIn: args.forceChangePasswordNextSignIn ?? true,
      },
    };
    if (args.givenName) body.givenName = args.givenName;
    if (args.surname) body.surname = args.surname;
    if (args.jobTitle) body.jobTitle = args.jobTitle;
    if (args.department) body.department = args.department;
    return this.graphPost('/users', headers, body);
  }

  private async updateUser(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.displayName !== undefined) body.displayName = args.displayName;
    if (args.jobTitle !== undefined) body.jobTitle = args.jobTitle;
    if (args.department !== undefined) body.department = args.department;
    if (args.accountEnabled !== undefined) body.accountEnabled = args.accountEnabled;
    if (args.usageLocation !== undefined) body.usageLocation = args.usageLocation;
    return this.graphPatch(`/users/${encodeURIComponent(userId)}`, headers, body);
  }

  private async deleteUser(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    return this.graphDelete(`/users/${encodeURIComponent(userId)}`, headers);
  }

  private async resetUserPassword(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const userId = args.userId as string;
    const newPassword = args.newPassword as string;
    if (!userId || !newPassword) return { content: [{ type: 'text', text: 'userId and newPassword are required' }], isError: true };
    return this.graphPatch(`/users/${encodeURIComponent(userId)}`, headers, {
      passwordProfile: {
        password: newPassword,
        forceChangePasswordNextSignIn: args.forceChangePasswordNextSignIn ?? true,
      },
    });
  }

  private async listGroups(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (args.filter && args.search) {
      return { content: [{ type: 'text', text: '$filter and $search are mutually exclusive' }], isError: true };
    }
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    if (args.select) p.set('$select', args.select as string);
    if (args.top) p.set('$top', String(args.top));
    const reqHeaders = { ...headers };
    if (args.search) {
      p.set('$search', args.search as string);
      reqHeaders['ConsistencyLevel'] = 'eventual';
    }
    const qs = p.toString() ? `?${p.toString()}` : '';
    return this.graphGet(`/groups${qs}`, reqHeaders);
  }

  private async getGroup(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    if (!groupId) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    const qs = args.select ? `?$select=${encodeURIComponent(args.select as string)}` : '';
    return this.graphGet(`/groups/${encodeURIComponent(groupId)}${qs}`, headers);
  }

  private async createGroup(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const { displayName, mailNickname } = args;
    if (!displayName || !mailNickname) {
      return { content: [{ type: 'text', text: 'displayName and mailNickname are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      displayName,
      mailNickname,
      securityEnabled: args.securityEnabled ?? true,
      mailEnabled: args.mailEnabled ?? false,
      groupTypes: args.groupTypes ?? [],
    };
    if (args.description) body.description = args.description;
    return this.graphPost('/groups', headers, body);
  }

  private async getGroupMembers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    if (!groupId) return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    const p = new URLSearchParams();
    if (args.select) p.set('$select', args.select as string);
    if (args.top) p.set('$top', String(args.top));
    const qs = p.toString() ? `?${p.toString()}` : '';
    return this.graphGet(`/groups/${encodeURIComponent(groupId)}/members${qs}`, headers);
  }

  private async addGroupMember(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    const memberId = args.memberId as string;
    if (!groupId || !memberId) return { content: [{ type: 'text', text: 'groupId and memberId are required' }], isError: true };
    return this.graphPost(`/groups/${encodeURIComponent(groupId)}/members/$ref`, headers, {
      '@odata.id': `${this.graphBaseUrl}/directoryObjects/${memberId}`,
    });
  }

  private async removeGroupMember(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    const memberId = args.memberId as string;
    if (!groupId || !memberId) return { content: [{ type: 'text', text: 'groupId and memberId are required' }], isError: true };
    return this.graphDelete(`/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/$ref`, headers);
  }

  private async listApplications(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    return this.graphGet(`/applications${this.buildParams(args)}`, headers);
  }

  private async getApplication(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const applicationId = args.applicationId as string;
    if (!applicationId) return { content: [{ type: 'text', text: 'applicationId is required' }], isError: true };
    return this.graphGet(`/applications/${encodeURIComponent(applicationId)}`, headers);
  }

  private async listServicePrincipals(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    return this.graphGet(`/servicePrincipals${this.buildParams(args)}`, headers);
  }

  private async getServicePrincipal(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const id = args.servicePrincipalId as string;
    if (!id) return { content: [{ type: 'text', text: 'servicePrincipalId is required' }], isError: true };
    return this.graphGet(`/servicePrincipals/${encodeURIComponent(id)}`, headers);
  }

  private async listDirectoryRoles(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const qs = args.select ? `?$select=${encodeURIComponent(args.select as string)}` : '';
    return this.graphGet(`/directoryRoles${qs}`, headers);
  }

  private async listRoleAssignments(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    if (args.top) p.set('$top', String(args.top));
    const qs = p.toString() ? `?${p.toString()}` : '';
    return this.graphGet(`/roleManagement/directory/roleAssignments${qs}`, headers);
  }

  private async listConditionalAccessPolicies(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    if (args.select) p.set('$select', args.select as string);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return this.graphGet(`/identity/conditionalAccess/policies${qs}`, headers);
  }

  private async getSignInLogs(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    if (args.select) p.set('$select', args.select as string);
    p.set('$top', String(args.top ?? 50));
    return this.graphGet(`/auditLogs/signIns?${p.toString()}`, headers);
  }

  private async getAuditLogs(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.filter) p.set('$filter', args.filter as string);
    p.set('$top', String(args.top ?? 50));
    return this.graphGet(`/auditLogs/directoryAudits?${p.toString()}`, headers);
  }
}
