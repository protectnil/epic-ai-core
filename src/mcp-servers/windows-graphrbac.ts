/**
 * Windows Graph RBAC MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Azure AD Graph RBAC API (legacy — superseded by Microsoft Graph API for new workloads)
// Manages Azure Active Directory applications, service principals, groups, users, and OAuth2 grants.
//
// Base URL: https://graph.windows.net/{tenantID}
// Auth: OAuth2 Bearer token (azure_auth scope: user_impersonation)
//   Token endpoint: https://login.microsoftonline.com/{tenant}/oauth2/token
//   Resource: https://graph.windows.net/
// API Version: 1.6 (required as query param: api-version=1.6)
// Docs: https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-graph-api

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WindowsGraphRbacConfig {
  /** OAuth2 Bearer access token for Azure AD Graph API */
  accessToken: string;
  /** Azure AD tenant ID (directory ID) */
  tenantId: string;
  /** Optional base URL override (default: https://graph.windows.net) */
  baseUrl?: string;
}

export class WindowsGraphRbacMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly tenantId: string;
  private readonly baseUrl: string;
  private static readonly API_VERSION = '1.6';

  constructor(config: WindowsGraphRbacConfig) {
    super();
    this.accessToken = config.accessToken;
    this.tenantId = config.tenantId;
    this.baseUrl = config.baseUrl ?? 'https://graph.windows.net';
  }

  static catalog() {
    return {
      name: 'windows-graphrbac',
      displayName: 'Windows Graph RBAC',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'azure', 'active directory', 'aad', 'rbac', 'identity', 'graph',
        'application', 'service principal', 'group', 'user', 'oauth2',
        'tenant', 'directory', 'role', 'permission', 'access control',
      ],
      toolNames: [
        'list_applications', 'get_application', 'create_application', 'update_application', 'delete_application',
        'list_service_principals', 'get_service_principal', 'create_service_principal',
        'list_groups', 'get_group', 'create_group', 'delete_group',
        'list_group_members', 'add_group_member', 'remove_group_member',
        'list_users', 'get_user',
        'list_domains', 'get_domain',
        'list_oauth2_permission_grants', 'create_oauth2_permission_grant', 'delete_oauth2_permission_grant',
        'get_current_user', 'get_objects_by_ids',
      ],
      description: 'Azure Active Directory Graph RBAC API. Manage AAD applications, service principals, groups, users, domains, and OAuth2 permission grants for identity and access control.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List Azure AD applications in the tenant with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. "displayName eq \'MyApp\'")',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get details of a specific Azure AD application by its object ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_object_id: {
              type: 'string',
              description: 'Application object ID in Azure AD',
            },
          },
          required: ['application_object_id'],
        },
      },
      {
        name: 'create_application',
        description: 'Create a new Azure AD application registration',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Display name for the new application',
            },
            identifier_uris: {
              type: 'array',
              items: { type: 'string' },
              description: 'Unique URIs that identify the application (e.g. ["https://tenant.onmicrosoft.com/MyApp"])',
            },
            reply_urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'OAuth2 redirect URIs for the application',
            },
            available_to_other_tenants: {
              type: 'boolean',
              description: 'Whether the application is multi-tenant (default: false)',
            },
          },
          required: ['display_name'],
        },
      },
      {
        name: 'update_application',
        description: 'Update properties of an existing Azure AD application',
        inputSchema: {
          type: 'object',
          properties: {
            application_object_id: {
              type: 'string',
              description: 'Application object ID to update',
            },
            display_name: {
              type: 'string',
              description: 'New display name for the application',
            },
            reply_urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated list of OAuth2 redirect URIs',
            },
          },
          required: ['application_object_id'],
        },
      },
      {
        name: 'delete_application',
        description: 'Delete an Azure AD application by its object ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_object_id: {
              type: 'string',
              description: 'Application object ID to delete',
            },
          },
          required: ['application_object_id'],
        },
      },
      {
        name: 'list_service_principals',
        description: 'List service principals in the tenant with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. "appId eq \'guid\'")',
            },
          },
        },
      },
      {
        name: 'get_service_principal',
        description: 'Get details of a specific service principal by its object ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_id: {
              type: 'string',
              description: 'Service principal object ID in Azure AD',
            },
          },
          required: ['object_id'],
        },
      },
      {
        name: 'create_service_principal',
        description: 'Create a new service principal for an existing application',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: {
              type: 'string',
              description: 'Application (client) ID to create a service principal for',
            },
            account_enabled: {
              type: 'boolean',
              description: 'Whether the service principal account is enabled (default: true)',
            },
          },
          required: ['app_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List Azure AD groups in the tenant with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. "displayName eq \'MyGroup\'")',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details of a specific Azure AD group by its object ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_id: {
              type: 'string',
              description: 'Group object ID in Azure AD',
            },
          },
          required: ['object_id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new Azure AD group',
        inputSchema: {
          type: 'object',
          properties: {
            display_name: {
              type: 'string',
              description: 'Display name for the new group',
            },
            mail_nickname: {
              type: 'string',
              description: 'Mail alias for the group (required, no spaces)',
            },
            mail_enabled: {
              type: 'boolean',
              description: 'Whether the group is mail-enabled (default: false)',
            },
            security_enabled: {
              type: 'boolean',
              description: 'Whether the group is security-enabled (default: true)',
            },
          },
          required: ['display_name', 'mail_nickname'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete an Azure AD group by its object ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_id: {
              type: 'string',
              description: 'Group object ID to delete',
            },
          },
          required: ['object_id'],
        },
      },
      {
        name: 'list_group_members',
        description: 'List members of an Azure AD group',
        inputSchema: {
          type: 'object',
          properties: {
            object_id: {
              type: 'string',
              description: 'Group object ID to list members of',
            },
          },
          required: ['object_id'],
        },
      },
      {
        name: 'add_group_member',
        description: 'Add a user, group, or service principal as a member of an Azure AD group',
        inputSchema: {
          type: 'object',
          properties: {
            group_object_id: {
              type: 'string',
              description: 'Object ID of the group to add the member to',
            },
            member_object_id: {
              type: 'string',
              description: 'Object ID of the user, group, or service principal to add',
            },
          },
          required: ['group_object_id', 'member_object_id'],
        },
      },
      {
        name: 'remove_group_member',
        description: 'Remove a member from an Azure AD group',
        inputSchema: {
          type: 'object',
          properties: {
            group_object_id: {
              type: 'string',
              description: 'Object ID of the group',
            },
            member_object_id: {
              type: 'string',
              description: 'Object ID of the member to remove',
            },
          },
          required: ['group_object_id', 'member_object_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List Azure AD users in the tenant with optional OData filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. "userPrincipalName eq \'user@tenant.com\'")',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific Azure AD user by UPN or object ID',
        inputSchema: {
          type: 'object',
          properties: {
            upn_or_object_id: {
              type: 'string',
              description: 'User principal name (user@tenant.com) or object ID',
            },
          },
          required: ['upn_or_object_id'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all domains registered in the Azure AD tenant',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_domain',
        description: 'Get details of a specific domain registered in the tenant',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Domain name to retrieve (e.g. "contoso.com")',
            },
          },
          required: ['domain_name'],
        },
      },
      {
        name: 'list_oauth2_permission_grants',
        description: 'List OAuth2 permission grants for delegated permissions in the tenant',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. "clientId eq \'guid\'")',
            },
          },
        },
      },
      {
        name: 'create_oauth2_permission_grant',
        description: 'Create an OAuth2 permission grant to delegate permissions from a resource to a client application',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Object ID of the client service principal receiving the grant',
            },
            resource_id: {
              type: 'string',
              description: 'Object ID of the resource service principal (e.g. Microsoft Graph)',
            },
            scope: {
              type: 'string',
              description: 'Space-separated list of OAuth2 permission scopes to grant (e.g. "User.Read Mail.Read")',
            },
            consent_type: {
              type: 'string',
              description: 'Consent type: "AllPrincipals" for admin consent, "Principal" for user consent',
            },
          },
          required: ['client_id', 'resource_id', 'scope'],
        },
      },
      {
        name: 'delete_oauth2_permission_grant',
        description: 'Delete an OAuth2 permission grant by its object ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_id: {
              type: 'string',
              description: 'Object ID of the OAuth2 permission grant to delete',
            },
          },
          required: ['object_id'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile of the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_objects_by_ids',
        description: 'Retrieve Azure AD directory objects (users, groups, applications) by a list of object IDs',
        inputSchema: {
          type: 'object',
          properties: {
            object_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of object IDs to look up (max 1000)',
            },
            types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional list of object types to filter (e.g. ["User", "Group", "Application"])',
            },
          },
          required: ['object_ids'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_applications': return this.listApplications(args);
        case 'get_application': return this.getApplication(args);
        case 'create_application': return this.createApplication(args);
        case 'update_application': return this.updateApplication(args);
        case 'delete_application': return this.deleteApplication(args);
        case 'list_service_principals': return this.listServicePrincipals(args);
        case 'get_service_principal': return this.getServicePrincipal(args);
        case 'create_service_principal': return this.createServicePrincipal(args);
        case 'list_groups': return this.listGroups(args);
        case 'get_group': return this.getGroup(args);
        case 'create_group': return this.createGroup(args);
        case 'delete_group': return this.deleteGroup(args);
        case 'list_group_members': return this.listGroupMembers(args);
        case 'add_group_member': return this.addGroupMember(args);
        case 'remove_group_member': return this.removeGroupMember(args);
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'list_domains': return this.listDomains();
        case 'get_domain': return this.getDomain(args);
        case 'list_oauth2_permission_grants': return this.listOauth2PermissionGrants(args);
        case 'create_oauth2_permission_grant': return this.createOauth2PermissionGrant(args);
        case 'delete_oauth2_permission_grant': return this.deleteOauth2PermissionGrant(args);
        case 'get_current_user': return this.getCurrentUser();
        case 'get_objects_by_ids': return this.getObjectsByIds(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string, extraParams: Record<string, string | undefined> = {}): string {
    const qs = new URLSearchParams({ 'api-version': WindowsGraphRbacMCPServer.API_VERSION });
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}/${encodeURIComponent(this.tenantId)}${path}?${qs.toString()}`;
  }


  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Graph RBAC returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 204 No Content responses
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Graph RBAC returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Graph RBAC returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
  }

  // --- Applications ---
  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      $filter: args.filter as string | undefined,
    };
    return this.get('/applications', params);
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_object_id) return { content: [{ type: 'text', text: 'application_object_id is required' }], isError: true };
    return this.get(`/applications/${encodeURIComponent(args.application_object_id as string)}`);
  }

  private async createApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.display_name) return { content: [{ type: 'text', text: 'display_name is required' }], isError: true };
    const body: Record<string, unknown> = { displayName: args.display_name };
    if (args.identifier_uris) body.identifierUris = args.identifier_uris;
    if (args.reply_urls) body.replyUrls = args.reply_urls;
    if (args.available_to_other_tenants !== undefined) body.availableToOtherTenants = args.available_to_other_tenants;
    return this.post('/applications', body);
  }

  private async updateApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_object_id) return { content: [{ type: 'text', text: 'application_object_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.display_name) body.displayName = args.display_name;
    if (args.reply_urls) body.replyUrls = args.reply_urls;
    return this.patch(`/applications/${encodeURIComponent(args.application_object_id as string)}`, body);
  }

  private async deleteApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_object_id) return { content: [{ type: 'text', text: 'application_object_id is required' }], isError: true };
    return this.delete(`/applications/${encodeURIComponent(args.application_object_id as string)}`);
  }

  // --- Service Principals ---
  private async listServicePrincipals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      $filter: args.filter as string | undefined,
    };
    return this.get('/servicePrincipals', params);
  }

  private async getServicePrincipal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_id) return { content: [{ type: 'text', text: 'object_id is required' }], isError: true };
    return this.get(`/servicePrincipals/${encodeURIComponent(args.object_id as string)}`);
  }

  private async createServicePrincipal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_id) return { content: [{ type: 'text', text: 'app_id is required' }], isError: true };
    const body: Record<string, unknown> = { appId: args.app_id };
    if (args.account_enabled !== undefined) body.accountEnabled = args.account_enabled;
    return this.post('/servicePrincipals', body);
  }

  // --- Groups ---
  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      $filter: args.filter as string | undefined,
    };
    return this.get('/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_id) return { content: [{ type: 'text', text: 'object_id is required' }], isError: true };
    return this.get(`/groups/${encodeURIComponent(args.object_id as string)}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.display_name || !args.mail_nickname) return { content: [{ type: 'text', text: 'display_name and mail_nickname are required' }], isError: true };
    const body: Record<string, unknown> = {
      displayName: args.display_name,
      mailNickname: args.mail_nickname,
      mailEnabled: args.mail_enabled ?? false,
      securityEnabled: args.security_enabled ?? true,
    };
    return this.post('/groups', body);
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_id) return { content: [{ type: 'text', text: 'object_id is required' }], isError: true };
    return this.delete(`/groups/${encodeURIComponent(args.object_id as string)}`);
  }

  private async listGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_id) return { content: [{ type: 'text', text: 'object_id is required' }], isError: true };
    return this.get(`/groups/${encodeURIComponent(args.object_id as string)}/members`);
  }

  private async addGroupMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_object_id || !args.member_object_id) return { content: [{ type: 'text', text: 'group_object_id and member_object_id are required' }], isError: true };
    const body = {
      url: `${this.baseUrl}/${encodeURIComponent(this.tenantId)}/directoryObjects/${encodeURIComponent(args.member_object_id as string)}`,
    };
    return this.post(`/groups/${encodeURIComponent(args.group_object_id as string)}/$links/members`, body);
  }

  private async removeGroupMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_object_id || !args.member_object_id) return { content: [{ type: 'text', text: 'group_object_id and member_object_id are required' }], isError: true };
    return this.delete(`/groups/${encodeURIComponent(args.group_object_id as string)}/$links/members/${encodeURIComponent(args.member_object_id as string)}`);
  }

  // --- Users ---
  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      $filter: args.filter as string | undefined,
    };
    return this.get('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.upn_or_object_id) return { content: [{ type: 'text', text: 'upn_or_object_id is required' }], isError: true };
    return this.get(`/users/${encodeURIComponent(args.upn_or_object_id as string)}`);
  }

  // --- Domains ---
  private async listDomains(): Promise<ToolResult> {
    return this.get('/domains');
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain_name) return { content: [{ type: 'text', text: 'domain_name is required' }], isError: true };
    return this.get(`/domains/${encodeURIComponent(args.domain_name as string)}`);
  }

  // --- OAuth2 Permission Grants ---
  private async listOauth2PermissionGrants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      $filter: args.filter as string | undefined,
    };
    return this.get('/oauth2PermissionGrants', params);
  }

  private async createOauth2PermissionGrant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id || !args.resource_id || !args.scope) {
      return { content: [{ type: 'text', text: 'client_id, resource_id, and scope are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      clientId: args.client_id,
      resourceId: args.resource_id,
      scope: args.scope,
      consentType: args.consent_type ?? 'AllPrincipals',
    };
    return this.post('/oauth2PermissionGrants', body);
  }

  private async deleteOauth2PermissionGrant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_id) return { content: [{ type: 'text', text: 'object_id is required' }], isError: true };
    return this.delete(`/oauth2PermissionGrants/${encodeURIComponent(args.object_id as string)}`);
  }

  // --- Me / Utility ---
  private async getCurrentUser(): Promise<ToolResult> {
    return this.get('/me');
  }

  private async getObjectsByIds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_ids || !Array.isArray(args.object_ids) || args.object_ids.length === 0) {
      return { content: [{ type: 'text', text: 'object_ids array is required' }], isError: true };
    }
    const body: Record<string, unknown> = { objectIds: args.object_ids };
    if (args.types && Array.isArray(args.types)) body.types = args.types;
    return this.post('/getObjectsByObjectIds', body);
  }
}
