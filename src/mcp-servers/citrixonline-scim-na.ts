/**
 * Citrix Online SCIM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Citrix Online SCIM MCP server was found on GitHub or npm.
//
// Our adapter covers: 17 tools (full SCIM 1.0 surface — users, groups, schema, service config).
// Integration: use-our-adapter
//
// Base URL: https://api.citrixonline.com/identity/v1
// Auth: Bearer token (OAuth2 access token from Citrix Identity Provider)
// Docs: https://developer.citrixonline.com/
// API Version: N/A (SCIM 1.0)
// Rate limits: Not publicly documented
//
// SCIM operations: Users (CRUD + list + me), Groups (CRUD + list), schema discovery, service config

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CitrixSCIMConfig {
  accessToken: string;
  baseUrl?: string;
}

export class CitrixonlineScimNaMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(config: CitrixSCIMConfig) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://api.citrixonline.com/identity/v1';
    this.accessToken = config.accessToken;
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Users -------------------------------------------------------------
      {
        name: 'get_users',
        description: 'List all users in the Citrix organization with optional SCIM filter expression',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'SCIM filter expression (e.g. userName eq "alice@example.com")' },
          },
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user in the Citrix organization via SCIM provisioning',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: "The user's username, usually their email address" },
            displayName: { type: 'string', description: "The user's display name" },
            givenName: { type: 'string', description: "The user's first name" },
            familyName: { type: 'string', description: "The user's surname" },
            password: { type: 'string', description: "The user's initial password" },
            locale: { type: 'string', description: "The user's locale/language setting (e.g. en_US)" },
            timezone: { type: 'string', description: "The user's time zone (e.g. America/New_York)" },
          },
          required: ['userName'],
        },
      },
      {
        name: 'get_user',
        description: "Get a specific Citrix user by their unique user key",
        inputSchema: {
          type: 'object',
          properties: {
            userKey: { type: 'string', description: "The user's unique key (SCIM id)" },
          },
          required: ['userKey'],
        },
      },
      {
        name: 'update_user',
        description: "Partially update a Citrix user's attributes (PATCH — only provided fields are changed)",
        inputSchema: {
          type: 'object',
          properties: {
            userKey: { type: 'string', description: "The user's unique key" },
            userName: { type: 'string', description: 'New username/email address' },
            displayName: { type: 'string', description: 'New display name' },
            givenName: { type: 'string', description: 'New first name' },
            familyName: { type: 'string', description: 'New surname' },
            password: { type: 'string', description: 'New password' },
            locale: { type: 'string', description: 'New locale/language setting' },
            timezone: { type: 'string', description: 'New time zone' },
          },
          required: ['userKey'],
        },
      },
      {
        name: 'replace_user',
        description: "Fully replace a Citrix user's attributes (PUT — replaces all user data)",
        inputSchema: {
          type: 'object',
          properties: {
            userKey: { type: 'string', description: "The user's unique key" },
            userName: { type: 'string', description: "The user's username, usually their email address" },
            displayName: { type: 'string', description: "The user's display name" },
            givenName: { type: 'string', description: "The user's first name" },
            familyName: { type: 'string', description: "The user's surname" },
            password: { type: 'string', description: "The user's password" },
            locale: { type: 'string', description: "The user's locale/language setting" },
            timezone: { type: 'string', description: "The user's time zone" },
          },
          required: ['userKey', 'userName'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a Citrix user by their unique user key',
        inputSchema: {
          type: 'object',
          properties: {
            userKey: { type: 'string', description: "The user's unique key to delete" },
          },
          required: ['userKey'],
        },
      },
      // -- Current User (me) -------------------------------------------------
      {
        name: 'get_me',
        description: 'Get the profile of the currently authenticated Citrix user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_me',
        description: "Partially update the currently authenticated user's profile (PATCH)",
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'New username/email address' },
            displayName: { type: 'string', description: 'New display name' },
            givenName: { type: 'string', description: 'New first name' },
            familyName: { type: 'string', description: 'New surname' },
            password: { type: 'string', description: 'New password' },
            locale: { type: 'string', description: 'New locale/language setting' },
            timezone: { type: 'string', description: 'New time zone' },
          },
        },
      },
      {
        name: 'replace_me',
        description: "Fully replace the currently authenticated user's profile (PUT)",
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: "The user's username, usually their email address" },
            displayName: { type: 'string', description: "The user's display name" },
            givenName: { type: 'string', description: "The user's first name" },
            familyName: { type: 'string', description: "The user's surname" },
            password: { type: 'string', description: "The user's password" },
            locale: { type: 'string', description: "The user's locale/language setting" },
            timezone: { type: 'string', description: "The user's time zone" },
          },
          required: ['userName'],
        },
      },
      // -- Groups ------------------------------------------------------------
      {
        name: 'get_groups',
        description: 'List all groups in the Citrix organization with optional SCIM filter',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'SCIM filter expression (e.g. displayName eq "Engineering")' },
          },
        },
      },
      {
        name: 'create_group',
        description: 'Create a new group in the Citrix organization',
        inputSchema: {
          type: 'object',
          properties: {
            displayName: { type: 'string', description: "The group's display name" },
            members: {
              type: 'array',
              description: 'Initial members of the group',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['group', 'user'], description: 'Member type: group or user' },
                  value: { type: 'string', description: 'The groupKey or userKey of the member' },
                },
                required: ['type', 'value'],
              },
            },
          },
          required: ['displayName'],
        },
      },
      {
        name: 'get_group',
        description: 'Get a specific Citrix group by its unique group key',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key (SCIM id)" },
          },
          required: ['groupKey'],
        },
      },
      {
        name: 'update_group',
        description: "Partially update a Citrix group's attributes (PATCH — only provided fields are changed)",
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key" },
            displayName: { type: 'string', description: 'New display name for the group' },
            members: {
              type: 'array',
              description: 'Updated member list',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['group', 'user'], description: 'Member type' },
                  value: { type: 'string', description: 'The groupKey or userKey' },
                },
                required: ['type', 'value'],
              },
            },
          },
          required: ['groupKey'],
        },
      },
      {
        name: 'replace_group',
        description: "Fully replace a Citrix group's attributes (PUT — replaces all group data)",
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key" },
            displayName: { type: 'string', description: "The group's display name" },
            members: {
              type: 'array',
              description: 'Complete member list (replaces existing)',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['group', 'user'], description: 'Member type' },
                  value: { type: 'string', description: 'The groupKey or userKey' },
                },
                required: ['type', 'value'],
              },
            },
          },
          required: ['groupKey', 'displayName'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a Citrix group by its unique group key',
        inputSchema: {
          type: 'object',
          properties: {
            groupKey: { type: 'string', description: "The group's unique key to delete" },
          },
          required: ['groupKey'],
        },
      },
      // -- Schema & Config ---------------------------------------------------
      {
        name: 'get_user_schema',
        description: 'Get the SCIM user resource schema including all supported attributes and their types',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_service_provider_configs',
        description: 'Get the SCIM service provider configuration including supported features (PATCH, bulk, filter, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_users':
          return await this.getUsers(args);
        case 'create_user':
          return await this.createUser(args);
        case 'get_user':
          return await this.getUser(args);
        case 'update_user':
          return await this.updateUser(args);
        case 'replace_user':
          return await this.replaceUser(args);
        case 'delete_user':
          return await this.deleteUser(args);
        case 'get_me':
          return await this.getMe();
        case 'update_me':
          return await this.updateMe(args);
        case 'replace_me':
          return await this.replaceMe(args);
        case 'get_groups':
          return await this.getGroups(args);
        case 'create_group':
          return await this.createGroup(args);
        case 'get_group':
          return await this.getGroup(args);
        case 'update_group':
          return await this.updateGroup(args);
        case 'replace_group':
          return await this.replaceGroup(args);
        case 'delete_group':
          return await this.deleteGroup(args);
        case 'get_user_schema':
          return await this.getUserSchema();
        case 'get_service_provider_configs':
          return await this.getServiceProviderConfigs();
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

  // -- Private helpers -------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let errText: string;
      try {
        const err = await response.json() as { message?: string; detail?: string };
        errText = err.message ?? err.detail ?? `${response.status} ${response.statusText}`;
      } catch {
        errText = `${response.status} ${response.statusText}`;
      }
      return { content: [{ type: 'text', text: `API error: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = response.status === 204 ? { status: 'success' } : await response.json();
    } catch {
      throw new Error(`Citrix SCIM returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildUserBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.userName !== undefined) body.userName = args.userName;
    if (args.displayName !== undefined) body.displayName = args.displayName;
    if (args.password !== undefined) body.password = args.password;
    if (args.locale !== undefined) body.locale = args.locale;
    if (args.timezone !== undefined) body.timezone = args.timezone;
    if (args.givenName !== undefined || args.familyName !== undefined) {
      body.name = {
        ...(args.givenName !== undefined ? { givenName: args.givenName } : {}),
        ...(args.familyName !== undefined ? { familyName: args.familyName } : {}),
      };
    }
    return body;
  }

  // -- Users -----------------------------------------------------------------

  private async getUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    const query = params.toString();
    return this.fetchJSON(`${this.baseUrl}/Users${query ? `?${query}` : ''}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users`, {
      method: 'POST',
      body: JSON.stringify(this.buildUserBody(args)),
    });
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users/${encodeURIComponent(String(args.userKey))}`);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users/${encodeURIComponent(String(args.userKey))}`, {
      method: 'PATCH',
      body: JSON.stringify(this.buildUserBody(args)),
    });
  }

  private async replaceUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users/${encodeURIComponent(String(args.userKey))}`, {
      method: 'PUT',
      body: JSON.stringify(this.buildUserBody(args)),
    });
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/Users/${encodeURIComponent(String(args.userKey))}`,
      { method: 'DELETE' },
    );
  }

  // -- Current User (me) -----------------------------------------------------

  private async getMe(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users/me`);
  }

  private async updateMe(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users/me`, {
      method: 'PATCH',
      body: JSON.stringify(this.buildUserBody(args)),
    });
  }

  private async replaceMe(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Users/me`, {
      method: 'PUT',
      body: JSON.stringify(this.buildUserBody(args)),
    });
  }

  // -- Groups ----------------------------------------------------------------

  private async getGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', String(args.filter));
    const query = params.toString();
    return this.fetchJSON(`${this.baseUrl}/Groups${query ? `?${query}` : ''}`);
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { displayName: args.displayName };
    if (args.members !== undefined) body.members = args.members;
    return this.fetchJSON(`${this.baseUrl}/Groups`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Groups/${encodeURIComponent(String(args.groupKey))}`);
  }

  private async updateGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.displayName !== undefined) body.displayName = args.displayName;
    if (args.members !== undefined) body.members = args.members;
    return this.fetchJSON(`${this.baseUrl}/Groups/${encodeURIComponent(String(args.groupKey))}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async replaceGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { displayName: args.displayName };
    if (args.members !== undefined) body.members = args.members;
    return this.fetchJSON(`${this.baseUrl}/Groups/${encodeURIComponent(String(args.groupKey))}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(
      `${this.baseUrl}/Groups/${encodeURIComponent(String(args.groupKey))}`,
      { method: 'DELETE' },
    );
  }

  // -- Schema & Config -------------------------------------------------------

  private async getUserSchema(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/Schemas/Users`);
  }

  private async getServiceProviderConfigs(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/ServiceProviderConfigs`);
  }
}
