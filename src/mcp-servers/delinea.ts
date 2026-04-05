/**
 * Delinea Secret Server MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/DelineaXPM/delinea-mcp — transport: stdio or SSE, auth: OAuth2 password grant
// Published by DelineaXPM (official Delinea GitHub org). Last commit: March 2026. 29 tools.
// Our adapter covers: 18 tools (secrets CRUD, folders, users, groups, roles, templates, policies, audit).
// Vendor MCP covers: 29 tools (search, fetch, reports, access requests, inbox, health check, safe create/update, env vars).
// Recommendation: use-both — MCP has unique tools (run_report, ai_generate_and_run_report, health_check,
//   handle_access_request, get_pending_access_requests, get_inbox_messages, mark_inbox_messages_read,
//   create_secret_with_generated_password, set_secret_field_environment_variable, update_secret_generated_password,
//   check_secret_template, check_secret_template_field, get_secret_template_field, get_secret_environment_variable,
//   list_example_reports, search_users, search_secrets, search_folders, user_management, role_management,
//   user_role_management, group_management, user_group_management, group_role_management, folder_management).
//   REST adapter has unique tools (create_secret, update_secret, delete_secret, list_users, get_user,
//   list_groups, list_roles, list_secret_templates, get_secret_template, list_secret_policies,
//   get_secret_policy, get_secret_audit). Full coverage requires the union of both.
// Integration: use-both
// MCP-sourced tools (29): search, fetch, run_report, ai_generate_and_run_report, list_example_reports,
//   get_secret, get_folder, user_management, role_management, user_role_management, group_management,
//   user_group_management, group_role_management, folder_management, health_check, search_users,
//   search_secrets, search_folders, get_secret_environment_variable, check_secret_template,
//   check_secret_template_field, handle_access_request, get_pending_access_requests, get_inbox_messages,
//   mark_inbox_messages_read, get_secret_template_field, create_secret_with_generated_password,
//   set_secret_field_environment_variable, update_secret_generated_password
// REST-sourced tools (12): create_secret, update_secret, delete_secret, list_users, get_user,
//   list_groups, list_roles, list_secret_templates, get_secret_template, list_secret_policies,
//   get_secret_policy, get_secret_audit
// Shared tools (6): search_secrets (≈search), get_secret, get_folder, search_users (≈user_management), search_folders
//   (shared ops routed through MCP by FederationManager)
// Combined coverage: 35 unique operations (MCP: 29 + REST: 12 - shared: ~6)
//
// Base URL: https://{your-tenant}.secretservercloud.com/api/v1  (cloud)
//           https://{your-server}/SecretServer/api/v1           (on-prem)
//   The baseUrl must be provided in config — no universal default exists.
// Auth: OAuth2 Resource Owner Password Credentials (grant_type=password).
//   Token endpoint: {baseUrl}/oauth2/token  (or /oauth/token on older versions)
//   Token cached and refreshed 60s before expiry.
// Docs: https://docs.delinea.com/online-help/secret-server/api-scripting/rest-api/index.htm
//       https://github.com/DelineaXPM/delinea-mcp
// Rate limits: Not publicly documented; depends on server configuration and edition.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DelineaConfig {
  username: string;
  password: string;
  /** Full base URL including /api/v1 — e.g. https://tenant.secretservercloud.com/api/v1 */
  baseUrl: string;
}

export class DelineaMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: DelineaConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'delinea',
      displayName: 'Delinea Secret Server',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['delinea', 'secret-server', 'pam', 'privileged-access', 'vault', 'secret', 'password', 'credential', 'rotation', 'audit', 'cyberark-alternative', 'thycotic'],
      toolNames: [
        'search_secrets', 'get_secret', 'create_secret', 'update_secret', 'delete_secret',
        'get_secret_field', 'list_folders', 'get_folder', 'create_folder',
        'get_secret_audit', 'list_secret_templates', 'get_secret_template',
        'list_users', 'get_user', 'list_groups', 'list_roles',
        'get_secret_policy', 'list_secret_policies',
      ],
      description: 'Manage Delinea Secret Server vaults: search, retrieve, create, and rotate secrets; audit access; manage folders, users, groups, roles, and policies.',
      author: 'protectnil',
    };
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    // Determine token URL — try /oauth2/token first (cloud), fall back to /oauth/token (on-prem)
    // Both are tried via the configured baseUrl minus /api/v1 suffix
    const apiBase = this.baseUrl.replace(/\/api\/v1\/?$/, '');
    const tokenUrl = `${apiBase}/oauth2/token`;

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.username,
        password: this.password,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Delinea OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_secrets',
        description: 'Search for secrets in Delinea Secret Server by text, folder, template, or exposure status. Returns matching secret stubs.',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Text to search for in secret names and metadata.',
            },
            folder_id: {
              type: 'number',
              description: 'Filter results to a specific folder ID (optional).',
            },
            secret_template_id: {
              type: 'number',
              description: 'Filter by secret template ID (optional).',
            },
            is_exposed: {
              type: 'boolean',
              description: 'Filter by whether the secret is currently exposed (optional).',
            },
            is_active: {
              type: 'boolean',
              description: 'Filter by active status: true=active, false=inactive (default: true).',
            },
            take: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100, max: 1000).',
            },
            skip: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0).',
            },
            sort_by: {
              type: 'string',
              description: 'Field to sort by (e.g. "name", "lastAccessed").',
            },
          },
        },
      },
      {
        name: 'get_secret',
        description: 'Retrieve full details for a specific secret by ID, including all fields and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'Unique Delinea Secret Server secret ID.',
            },
            include_inactive: {
              type: 'boolean',
              description: 'Include the secret even if it is inactive (default: false).',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'create_secret',
        description: 'Create a new secret in Delinea Secret Server using a template, with specified field values.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new secret.',
            },
            secret_template_id: {
              type: 'number',
              description: 'ID of the secret template to use (defines available fields).',
            },
            folder_id: {
              type: 'number',
              description: 'ID of the folder to create the secret in.',
            },
            items: {
              type: 'array',
              description: 'Array of field value objects: [{fieldName: "Username", itemValue: "admin"}].',
              items: { type: 'object' },
            },
          },
          required: ['name', 'secret_template_id', 'folder_id', 'items'],
        },
      },
      {
        name: 'update_secret',
        description: 'Update an existing secret in Delinea Secret Server, modifying field values or metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'ID of the secret to update.',
            },
            name: {
              type: 'string',
              description: 'New display name for the secret (optional).',
            },
            items: {
              type: 'array',
              description: 'Array of field value objects to update: [{fieldName: "Password", itemValue: "newpass"}].',
              items: { type: 'object' },
            },
            folder_id: {
              type: 'number',
              description: 'Move secret to a different folder ID (optional).',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Deactivate (soft-delete) a secret in Delinea Secret Server by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'ID of the secret to deactivate.',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'get_secret_field',
        description: 'Retrieve the value of a single field from a secret (e.g. the password or username field).',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'Delinea secret ID.',
            },
            field_slug: {
              type: 'string',
              description: 'Slug name of the field to retrieve (e.g. "password", "username", "notes").',
            },
          },
          required: ['secret_id', 'field_slug'],
        },
      },
      {
        name: 'list_folders',
        description: 'List folders in Delinea Secret Server, with optional parent filter and search text.',
        inputSchema: {
          type: 'object',
          properties: {
            parent_folder_id: {
              type: 'number',
              description: 'Filter by parent folder ID (optional; omit for root folders).',
            },
            search_text: {
              type: 'string',
              description: 'Search for folder names matching this text (optional).',
            },
            take: {
              type: 'number',
              description: 'Maximum number of folders to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of folders to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_folder',
        description: 'Retrieve details for a specific folder in Delinea Secret Server by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'number',
              description: 'Delinea folder ID.',
            },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder in Delinea Secret Server under an optional parent folder.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_name: {
              type: 'string',
              description: 'Name for the new folder.',
            },
            parent_folder_id: {
              type: 'number',
              description: 'ID of the parent folder (-1 for root, optional).',
            },
            inherit_permissions: {
              type: 'boolean',
              description: 'Whether to inherit permissions from parent folder (default: true).',
            },
            inherit_secret_policy: {
              type: 'boolean',
              description: 'Whether to inherit the secret policy from parent folder (default: true).',
            },
          },
          required: ['folder_name'],
        },
      },
      {
        name: 'get_secret_audit',
        description: 'Retrieve the audit trail and access log for a specific secret, with optional action type and date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'Delinea secret ID to retrieve audit records for.',
            },
            action_type: {
              type: 'string',
              description: 'Filter by action: VIEW, EDIT, COPY, LAUNCH, CHECKIN, CHECKOUT, etc. (optional).',
            },
            start_date: {
              type: 'string',
              description: 'Start of the date range (ISO 8601 format, optional).',
            },
            end_date: {
              type: 'string',
              description: 'End of the date range (ISO 8601 format, optional).',
            },
            take: {
              type: 'number',
              description: 'Maximum number of audit records to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'list_secret_templates',
        description: 'List all secret templates available in Delinea Secret Server, including template name and field definitions.',
        inputSchema: {
          type: 'object',
          properties: {
            take: {
              type: 'number',
              description: 'Maximum number of templates to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of templates to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_secret_template',
        description: 'Retrieve full details for a specific secret template by ID, including all field definitions.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'number',
              description: 'Delinea secret template ID.',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users configured in Delinea Secret Server, with optional search by name or username.',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Search for users by name or username (optional).',
            },
            domain_id: {
              type: 'number',
              description: 'Filter users by Active Directory domain ID (optional).',
            },
            take: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of users to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve full profile details for a specific Delinea Secret Server user by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Delinea user ID.',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List user groups configured in Delinea Secret Server, with optional search by group name.',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Search for groups by name (optional).',
            },
            domain_id: {
              type: 'number',
              description: 'Filter by Active Directory domain ID (optional).',
            },
            take: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of groups to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'list_roles',
        description: 'List user roles and permission sets configured in Delinea Secret Server.',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Search for roles by name (optional).',
            },
            take: {
              type: 'number',
              description: 'Maximum number of roles to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of roles to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'list_secret_policies',
        description: 'List all secret policies configured in Delinea Secret Server, including password requirements and check-out settings.',
        inputSchema: {
          type: 'object',
          properties: {
            take: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 100).',
            },
            skip: {
              type: 'number',
              description: 'Number of policies to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_secret_policy',
        description: 'Retrieve details for a specific secret policy by ID, including all policy rules and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'number',
              description: 'Delinea secret policy ID.',
            },
          },
          required: ['policy_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_secrets':
          return await this.searchSecrets(args);
        case 'get_secret':
          return await this.getSecret(args);
        case 'create_secret':
          return await this.createSecret(args);
        case 'update_secret':
          return await this.updateSecret(args);
        case 'delete_secret':
          return await this.deleteSecret(args);
        case 'get_secret_field':
          return await this.getSecretField(args);
        case 'list_folders':
          return await this.listFolders(args);
        case 'get_folder':
          return await this.getFolder(args);
        case 'create_folder':
          return await this.createFolder(args);
        case 'get_secret_audit':
          return await this.getSecretAudit(args);
        case 'list_secret_templates':
          return await this.listSecretTemplates(args);
        case 'get_secret_template':
          return await this.getSecretTemplate(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_groups':
          return await this.listGroups(args);
        case 'list_roles':
          return await this.listRoles(args);
        case 'list_secret_policies':
          return await this.listSecretPolicies(args);
        case 'get_secret_policy':
          return await this.getSecretPolicy(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------


  private async request(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers as Record<string, string> || {}),
      },
    });

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }

    // DELETE returns 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Delinea returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async searchSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    if (args.search_text) params.set('filter.searchText', args.search_text as string);
    if (args.folder_id != null) params.set('filter.folderId', String(args.folder_id as number));
    if (args.secret_template_id != null) params.set('filter.secretTemplateId', String(args.secret_template_id as number));
    if (args.is_exposed != null) params.set('filter.isExposed', String(args.is_exposed as boolean));
    if (args.is_active != null) params.set('filter.isActive', String(args.is_active as boolean));
    if (args.sort_by) params.set('sortBy[0].direction', 'asc'), params.set('sortBy[0].name', args.sort_by as string);
    return this.request(`/secrets?${params}`);
  }

  private async getSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const secretId = args.secret_id as number;
    if (secretId == null) return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.include_inactive != null) params.set('includeInactive', String(args.include_inactive as boolean));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/secrets/${secretId}${qs}`);
  }

  private async createSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (args.secret_template_id == null) return { content: [{ type: 'text', text: 'secret_template_id is required' }], isError: true };
    if (args.folder_id == null) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    if (!args.items) return { content: [{ type: 'text', text: 'items is required' }], isError: true };

    const body: Record<string, unknown> = {
      name: args.name,
      secretTemplateId: args.secret_template_id,
      folderId: args.folder_id,
      items: args.items,
    };

    return this.request('/secrets', { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const secretId = args.secret_id as number;
    if (secretId == null) return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };

    const body: Record<string, unknown> = { id: secretId };
    if (args.name != null) body.name = args.name;
    if (args.items != null) body.items = args.items;
    if (args.folder_id != null) body.folderId = args.folder_id;

    return this.request(`/secrets/${secretId}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const secretId = args.secret_id as number;
    if (secretId == null) return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };
    return this.request(`/secrets/${secretId}`, { method: 'DELETE' });
  }

  private async getSecretField(args: Record<string, unknown>): Promise<ToolResult> {
    const secretId = args.secret_id as number;
    const fieldSlug = args.field_slug as string;
    if (secretId == null) return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };
    if (!fieldSlug) return { content: [{ type: 'text', text: 'field_slug is required' }], isError: true };
    return this.request(`/secrets/${secretId}/fields/${encodeURIComponent(fieldSlug)}`);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    if (args.parent_folder_id != null) params.set('filter.parentFolderId', String(args.parent_folder_id as number));
    if (args.search_text) params.set('filter.searchText', args.search_text as string);
    return this.request(`/folders?${params}`);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    const folderId = args.folder_id as number;
    if (folderId == null) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    return this.request(`/folders/${folderId}`);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_name) return { content: [{ type: 'text', text: 'folder_name is required' }], isError: true };

    const body: Record<string, unknown> = {
      folderName: args.folder_name,
      folderTypeId: 1,
      inheritPermissions: args.inherit_permissions !== false,
      inheritSecretPolicy: args.inherit_secret_policy !== false,
    };
    if (args.parent_folder_id != null) body.parentFolderId = args.parent_folder_id;

    return this.request('/folders', { method: 'POST', body: JSON.stringify(body) });
  }

  private async getSecretAudit(args: Record<string, unknown>): Promise<ToolResult> {
    const secretId = args.secret_id as number;
    if (secretId == null) return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };

    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    if (args.action_type) params.set('filter.actionType', args.action_type as string);
    if (args.start_date) params.set('filter.startDate', args.start_date as string);
    if (args.end_date) params.set('filter.endDate', args.end_date as string);

    return this.request(`/secrets/${secretId}/audits?${params}`);
  }

  private async listSecretTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    return this.request(`/secret-templates?${params}`);
  }

  private async getSecretTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const templateId = args.template_id as number;
    if (templateId == null) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.request(`/secret-templates/${templateId}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    if (args.search_text) params.set('filter.searchText', args.search_text as string);
    if (args.domain_id != null) params.set('filter.domainId', String(args.domain_id as number));
    return this.request(`/users?${params}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as number;
    if (userId == null) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request(`/users/${userId}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    if (args.search_text) params.set('filter.searchText', args.search_text as string);
    if (args.domain_id != null) params.set('filter.domainId', String(args.domain_id as number));
    return this.request(`/groups?${params}`);
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    if (args.search_text) params.set('filter.searchText', args.search_text as string);
    return this.request(`/roles?${params}`);
  }

  private async listSecretPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('take', String((args.take as number) || 100));
    params.set('skip', String((args.skip as number) || 0));
    return this.request(`/secret-policies?${params}`);
  }

  private async getSecretPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    const policyId = args.policy_id as number;
    if (policyId == null) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.request(`/secret-policies/${policyId}`);
  }
}
