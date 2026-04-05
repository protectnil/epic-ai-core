/**
 * JumpCloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.jumpcloud.com/v1 — transport: streamable-HTTP, auth: API key (Bearer) or OAuth2
// Vendor MCP is GA as of 2025-10-01. Covers users, devices, groups, SSO apps, Directory Insights, bulk actions.
// Our adapter covers: 18 tools. Vendor MCP tool count not enumerated in public docs (tool list behind login).
// Recommendation: use-vendor-mcp for full coverage. Use this REST adapter for air-gapped deployments.
// NOTE: Vendor MCP (https://mcp.jumpcloud.com/v1) is official and actively maintained — prefer vendor MCP.
//
// Base URL (v1): https://console.jumpcloud.com/api
// Base URL (v2): https://console.jumpcloud.com/api/v2
// Auth: x-api-key header (administrator API key from JumpCloud Admin Portal)
// Docs: https://docs.jumpcloud.com/api/1.0/index.html / https://docs.jumpcloud.com/api/2.0/index.html
// Rate limits: Not publicly documented; JumpCloud recommends exponential backoff on 429

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JumpCloudConfig {
  apiKey: string;
  baseUrlV1?: string;
  baseUrlV2?: string;
}

export class JumpCloudMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrlV1: string;
  private readonly baseUrlV2: string;

  constructor(config: JumpCloudConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrlV1 = config.baseUrlV1 ?? 'https://console.jumpcloud.com/api';
    this.baseUrlV2 = config.baseUrlV2 ?? 'https://console.jumpcloud.com/api/v2';
  }

  static catalog() {
    return {
      name: 'jumpcloud',
      displayName: 'JumpCloud',
      version: '1.0.0',
      category: 'identity',
      keywords: ['jumpcloud', 'identity', 'directory', 'sso', 'users', 'devices', 'groups', 'mdm', 'zero-trust', 'access'],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_systems', 'get_system', 'list_user_groups', 'get_user_group',
        'create_user_group', 'list_system_groups', 'get_user_group_members',
        'get_system_group_members', 'add_user_to_group', 'remove_user_from_group',
        'search_users', 'list_applications', 'list_policies',
      ],
      description: 'JumpCloud directory-as-a-service: manage users, devices, groups, SSO applications, and policies. Supports v1 (systemusers, systems) and v2 (groups, graph) APIs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List JumpCloud system users with optional text search, field projection, and pagination via limit/skip',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            search: {
              type: 'string',
              description: 'Free-text search term to filter users by username, email, or display name',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "username,email,id")',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "suspended:eq:false")',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. "username:asc")',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a single JumpCloud system user by ID, returning full user object with all attributes',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'JumpCloud user ID (24-char hex string)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new JumpCloud system user with username, email, and optional attributes',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Unique username for the new user',
            },
            email: {
              type: 'string',
              description: 'Email address for the new user',
            },
            firstname: {
              type: 'string',
              description: 'First name of the user',
            },
            lastname: {
              type: 'string',
              description: 'Last name of the user',
            },
            password: {
              type: 'string',
              description: 'Initial password for the user (optional; can be set to allow_public_key only)',
            },
            allow_public_key: {
              type: 'boolean',
              description: 'Whether to allow SSH public key authentication (default: false)',
            },
            sudo: {
              type: 'boolean',
              description: 'Whether to grant sudo access to the user (default: false)',
            },
          },
          required: ['username', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update attributes of an existing JumpCloud system user by ID using PUT (full update via /api/systemusers/{id})',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'JumpCloud user ID to update',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            firstname: {
              type: 'string',
              description: 'New first name',
            },
            lastname: {
              type: 'string',
              description: 'New last name',
            },
            suspended: {
              type: 'boolean',
              description: 'Whether to suspend the user account',
            },
            sudo: {
              type: 'boolean',
              description: 'Whether to grant or revoke sudo access',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a JumpCloud system user by ID — this action is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'JumpCloud user ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_systems',
        description: 'List JumpCloud managed devices/systems with optional filter, field projection, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "hostname,os,active")',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "active:eq:true")',
            },
          },
        },
      },
      {
        name: 'get_system',
        description: 'Get a single JumpCloud managed device/system by ID with full details',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'JumpCloud system ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_user_groups',
        description: 'List all JumpCloud user groups with optional filter and pagination (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:Engineering")',
            },
          },
        },
      },
      {
        name: 'get_user_group',
        description: 'Get a single JumpCloud user group by ID (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud user group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_user_group',
        description: 'Create a new JumpCloud user group with a name and optional description (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the new user group',
            },
            description: {
              type: 'string',
              description: 'Optional description for the group',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_system_groups',
        description: 'List all JumpCloud system/device groups with optional filter and pagination (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:Servers")',
            },
          },
        },
      },
      {
        name: 'get_user_group_members',
        description: 'List all members of a JumpCloud user group by group ID (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud user group ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_system_group_members',
        description: 'List all members of a JumpCloud system group by group ID (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud system group ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'add_user_to_group',
        description: 'Add a JumpCloud user to a user group via graph association (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud user group ID',
            },
            user_id: {
              type: 'string',
              description: 'JumpCloud user ID to add to the group',
            },
          },
          required: ['group_id', 'user_id'],
        },
      },
      {
        name: 'remove_user_from_group',
        description: 'Remove a JumpCloud user from a user group via graph association (v2 API)',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'JumpCloud user group ID',
            },
            user_id: {
              type: 'string',
              description: 'JumpCloud user ID to remove from the group',
            },
          },
          required: ['group_id', 'user_id'],
        },
      },
      {
        name: 'search_users',
        description: 'Search JumpCloud users by a specific field value using POST /search/systemusers (v1 API)',
        inputSchema: {
          type: 'object',
          properties: {
            searchTerm: {
              type: 'object',
              description: 'Search criteria with searchField (e.g. "email") and searchValue (e.g. "alice@example.com")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return in results',
            },
          },
          required: ['searchTerm'],
        },
      },
      {
        name: 'list_applications',
        description: 'List JumpCloud SSO applications configured in the organization (v1 API)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of applications to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return',
            },
            filter: {
              type: 'string',
              description: 'Filter expression to narrow results',
            },
          },
        },
      },
      {
        name: 'list_policies',
        description: 'List JumpCloud device management policies with optional filter and pagination (v1 API)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return',
            },
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. "name:eq:MyPolicy")',
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
        case 'list_systems':
          return await this.listSystems(args);
        case 'get_system':
          return await this.getSystem(args);
        case 'list_user_groups':
          return await this.listUserGroups(args);
        case 'get_user_group':
          return await this.getUserGroup(args);
        case 'create_user_group':
          return await this.createUserGroup(args);
        case 'list_system_groups':
          return await this.listSystemGroups(args);
        case 'get_user_group_members':
          return await this.getUserGroupMembers(args);
        case 'get_system_group_members':
          return await this.getSystemGroupMembers(args);
        case 'add_user_to_group':
          return await this.addUserToGroup(args);
        case 'remove_user_from_group':
          return await this.removeUserFromGroup(args);
        case 'search_users':
          return await this.searchUsers(args);
        case 'list_applications':
          return await this.listApplications(args);
        case 'list_policies':
          return await this.listPolicies(args);
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
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; statusText: string; data: unknown }> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { ok: response.ok, status: response.status, statusText: response.statusText, data };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.search) params.set('search', args.search as string);
    if (args.fields) params.set('fields', args.fields as string);
    if (args.filter) params.set('filter', args.filter as string);
    if (args.sort) params.set('sort', args.sort as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV1}/systemusers?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV1}/systemusers/${encodeURIComponent(args.id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      username: args.username,
      email: args.email,
    };
    if (args.firstname !== undefined) body.firstname = args.firstname;
    if (args.lastname !== undefined) body.lastname = args.lastname;
    if (args.password !== undefined) body.password = args.password;
    if (args.allow_public_key !== undefined) body.allow_public_key = args.allow_public_key;
    if (args.sudo !== undefined) body.sudo = args.sudo;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV1}/systemusers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...rest } = args;
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) body[k] = v;
    }

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV1}/systemusers/${encodeURIComponent(id as string)}`,
      { method: 'PUT', body: JSON.stringify(body) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrlV1}/systemusers/${encodeURIComponent(args.id as string)}`,
      { method: 'DELETE', headers: this.headers }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: args.id }) }], isError: false };
  }

  private async listSystems(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.fields) params.set('fields', args.fields as string);
    if (args.filter) params.set('filter', args.filter as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV1}/systems?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSystem(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV1}/systems/${encodeURIComponent(args.id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUserGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.filter) params.set('filter', args.filter as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV2}/usergroups?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV2}/usergroups/${encodeURIComponent(args.group_id as string)}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createUserGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description !== undefined) body.description = args.description;

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV2}/usergroups`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSystemGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.filter) params.set('filter', args.filter as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV2}/systemgroups?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV2}/usergroups/${encodeURIComponent(args.group_id as string)}/members?${params}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSystemGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV2}/systemgroups/${encodeURIComponent(args.group_id as string)}/members?${params}`
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async addUserToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body = { op: 'add', type: 'user', id: args.user_id };
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV2}/usergroups/${encodeURIComponent(args.group_id as string)}/members`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data ?? { success: true }) }], isError: false };
  }

  private async removeUserFromGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body = { op: 'remove', type: 'user', id: args.user_id };
    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV2}/usergroups/${encodeURIComponent(args.group_id as string)}/members`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data ?? { success: true }) }], isError: false };
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.fields) params.set('fields', args.fields as string);

    const { ok, status, statusText, data } = await this.fetchJSON(
      `${this.baseUrlV1}/search/systemusers?${params}`,
      { method: 'POST', body: JSON.stringify({ searchTerm: args.searchTerm }) }
    );
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.fields) params.set('fields', args.fields as string);
    if (args.filter) params.set('filter', args.filter as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV1}/applications?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const skip = (args.skip as number) ?? 0;
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (args.fields) params.set('fields', args.fields as string);
    if (args.filter) params.set('filter', args.filter as string);

    const { ok, status, statusText, data } = await this.fetchJSON(`${this.baseUrlV1}/policies?${params}`);
    if (!ok) return { content: [{ type: 'text', text: `API error ${status}: ${statusText}` }], isError: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
