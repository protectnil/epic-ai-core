/**
 * Cisco Duo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cisco Duo MCP server was found on GitHub. Community Cisco MCP repos
// (cisco-mcp, mcp-cisco-support) cover network devices and support APIs, not Duo.
// Duo publishes an OAuth/SSO integration for securing MCP servers (duo.com/docs/sso-oauth-server-mcp)
// but this is an identity provider for MCP, not an MCP server exposing Duo Admin API tools.
// Our adapter covers: 17 tools. Vendor MCP covers: 0 tools (N/A).
// Recommendation: use-rest-api — no official Duo MCP server exists.
//
// Base URL: https://{apiHost}  where apiHost = api-xxxxxxxx.duosecurity.com
// Auth: HMAC-SHA1 — canonical request signed with secretKey; integrationKey as Basic Auth username.
//   Canonical: DATE\nMETHOD\nHOST\nPATH\nSORTED_PARAMS
//   Authorization: Basic base64(integrationKey:hmac_hex)
//   Date header must match the date used in the canonical string exactly.
// Docs: https://duo.com/docs/adminapi
// Rate limits: 60 API calls per second per integration (burst allowed; sustained limit applies).
// Log endpoints: authentication=v2, administrator=v1, telephony=v2 (v1 deprecated Sept 30, 2026).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import { createHmac } from 'node:crypto';

interface CiscoDuoConfig {
  apiHost: string;        // e.g. api-xxxxxxxx.duosecurity.com (no scheme, no trailing slash)
  integrationKey: string; // ikey
  secretKey: string;      // skey
}

export class CiscoDuoMCPServer extends MCPAdapterBase {
  private readonly apiHost: string;
  private readonly integrationKey: string;
  private readonly secretKey: string;

  constructor(config: CiscoDuoConfig) {
    super();
    this.apiHost = config.apiHost.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    this.integrationKey = config.integrationKey;
    this.secretKey = config.secretKey;
  }

  private sign(method: string, path: string, params: Record<string, string>, date: string): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    const canon = [date, method.toUpperCase(), this.apiHost, path, sortedParams].join('\n');
    const sig = createHmac('sha1', this.secretKey).update(canon).digest('hex');
    return 'Basic ' + Buffer.from(`${this.integrationKey}:${sig}`).toString('base64');
  }

  private async duoRequest(
    method: string,
    path: string,
    params: Record<string, string> = {},
  ): Promise<Response> {
    const date = new Date().toUTCString();
    const auth = this.sign(method, path, params, date);
    const headers: Record<string, string> = {
      Authorization: auth,
      Date: date,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    let url = `https://${this.apiHost}${path}`;
    let body: string | undefined;
    if (method === 'GET' || method === 'DELETE') {
      if (Object.keys(params).length > 0) url += '?' + new URLSearchParams(params).toString();
    } else {
      body = new URLSearchParams(params).toString();
    }
    return fetch(url, { method, headers, body });
  }

  private async duoGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.duoRequest('GET', path, params);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Duo API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async duoPost(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.duoRequest('POST', path, params);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Duo API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Duo returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async duoDelete(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.duoRequest('DELETE', path, params);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Duo API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all Duo users with optional username filter and pagination. Returns user IDs, status, groups, phones, and tokens.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Filter by exact username' },
            limit: { type: 'number', description: 'Max results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get full details for a specific Duo user by user ID, including groups, phones, tokens, and authentication status',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Duo user ID (e.g. DUXXXXXXXXXXXXXXXXXX)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Duo user with username, display name, email, and initial status',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username for the new Duo user (must be unique)' },
            realname: { type: 'string', description: 'Full display name' },
            email: { type: 'string', description: 'Email address' },
            status: { type: 'string', description: 'User status: active | bypass | disabled (default: active)' },
            notes: { type: 'string', description: 'Notes about the user' },
          },
          required: ['username'],
        },
      },
      {
        name: 'update_user',
        description: 'Update attributes on an existing Duo user such as status, name, email, or notes',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Duo user ID' },
            username: { type: 'string', description: 'New username' },
            realname: { type: 'string', description: 'New display name' },
            email: { type: 'string', description: 'New email address' },
            status: { type: 'string', description: 'New status: active | bypass | disabled' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a Duo user and all associated data. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Duo user ID to delete' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all Duo groups with optional pagination. Returns group IDs, names, descriptions, and push settings.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a specific Duo group by group ID, including member count and push settings',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'Duo group ID (e.g. DGXXXXXXXXXXXXXXXXXX)' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_phones',
        description: 'List all phones associated with Duo users, optionally filtered by number or extension',
        inputSchema: {
          type: 'object',
          properties: {
            number: { type: 'string', description: 'Filter by phone number (E.164 format, e.g. +14155551234)' },
            extension: { type: 'string', description: 'Filter by phone extension' },
            limit: { type: 'number', description: 'Max results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_phone',
        description: 'Get details for a specific Duo phone by phone ID, including type, platform, and activation status',
        inputSchema: {
          type: 'object',
          properties: {
            phone_id: { type: 'string', description: 'Duo phone ID (e.g. DPXXXXXXXXXXXXXXXXXX)' },
          },
          required: ['phone_id'],
        },
      },
      {
        name: 'list_hardware_tokens',
        description: 'List all OTP hardware tokens registered in Duo, optionally filtered by type or serial number',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Token type: TOTP | TOTP6 | HOTP6 | HOTP8 | YubiKey (omit for all)' },
            serial: { type: 'string', description: 'Filter by serial number' },
            limit: { type: 'number', description: 'Max results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'list_admins',
        description: 'List all Duo administrators in the account with their roles and last login timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'list_integrations',
        description: 'List all Duo integrations (applications) configured in the account, including type and status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results per page (max 300, default 100)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_authentication_logs',
        description: 'Retrieve Duo authentication log events (v2 API). Returns up to 180 days of events with up to 2-minute delay. Supports cursor-based pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            mintime: { type: 'number', description: 'Unix millisecond timestamp: return events at or after this time' },
            maxtime: { type: 'number', description: 'Unix millisecond timestamp: return events before this time' },
            limit: { type: 'number', description: 'Max log entries to return (max 1000, default 100)' },
            next_offset: {
              type: 'array',
              description: 'Pagination cursor from a previous response (array of two strings)',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_admin_logs',
        description: 'Retrieve Duo administrator activity log events including config changes, user modifications, and admin logins',
        inputSchema: {
          type: 'object',
          properties: {
            mintime: { type: 'number', description: 'Unix timestamp (seconds): return events at or after this time' },
            limit: { type: 'number', description: 'Max log entries to return (default 100)' },
          },
        },
      },
      {
        name: 'get_telephony_logs',
        description: 'Retrieve Duo telephony log events (SMS and phone call authentications) for billing and audit purposes. Uses v2 endpoint with cursor-based pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            mintime: { type: 'number', description: 'Unix millisecond timestamp: return events at or after this time' },
            maxtime: { type: 'number', description: 'Unix millisecond timestamp: return events before this time' },
            limit: { type: 'number', description: 'Max log entries to return (max 1000, default 100)' },
            next_offset: {
              type: 'array',
              description: 'Pagination cursor from a previous response (array of two strings)',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'bypass_user',
        description: 'Generate bypass codes for a Duo user, allowing authentication without a second factor for a limited time or number of uses',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Duo user ID' },
            count: { type: 'number', description: 'Number of bypass codes to generate (max 10, default 1)' },
            valid_secs: { type: 'number', description: 'Seconds until bypass codes expire (0 = no expiry)' },
            reuse_count: { type: 'number', description: 'Number of times each code can be used (0 = unlimited)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_account_summary',
        description: 'Get a summary of the Duo account including user counts, phone counts, active integrations, and telephony credits',
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
        case 'list_groups':
          return await this.listGroups(args);
        case 'get_group':
          return await this.getGroup(args);
        case 'list_phones':
          return await this.listPhones(args);
        case 'get_phone':
          return await this.getPhone(args);
        case 'list_hardware_tokens':
          return await this.listHardwareTokens(args);
        case 'list_admins':
          return await this.listAdmins(args);
        case 'list_integrations':
          return await this.listIntegrations(args);
        case 'get_authentication_logs':
          return await this.getAuthenticationLogs(args);
        case 'get_admin_logs':
          return await this.getAdminLogs(args);
        case 'get_telephony_logs':
          return await this.getTelephonyLogs(args);
        case 'bypass_user':
          return await this.bypassUser(args);
        case 'get_account_summary':
          return await this.getAccountSummary();
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

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.username) params.username = args.username as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.duoGet('/admin/v1/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.duoGet(`/admin/v1/users/${encodeURIComponent(userId)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    const params: Record<string, string> = { username };
    if (args.realname) params.realname = args.realname as string;
    if (args.email) params.email = args.email as string;
    if (args.status) params.status = args.status as string;
    if (args.notes) params.notes = args.notes as string;
    return this.duoPost('/admin/v1/users', params);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.username) params.username = args.username as string;
    if (args.realname) params.realname = args.realname as string;
    if (args.email) params.email = args.email as string;
    if (args.status) params.status = args.status as string;
    if (args.notes) params.notes = args.notes as string;
    return this.duoPost(`/admin/v1/users/${encodeURIComponent(userId)}`, params);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.duoDelete(`/admin/v1/users/${encodeURIComponent(userId)}`);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.duoGet('/admin/v1/groups', params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.duoGet(`/admin/v1/groups/${encodeURIComponent(groupId)}`);
  }

  private async listPhones(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.number) params.number = args.number as string;
    if (args.extension) params.extension = args.extension as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.duoGet('/admin/v1/phones', params);
  }

  private async getPhone(args: Record<string, unknown>): Promise<ToolResult> {
    const phoneId = args.phone_id as string;
    if (!phoneId) return { content: [{ type: 'text', text: 'phone_id is required' }], isError: true };
    return this.duoGet(`/admin/v1/phones/${encodeURIComponent(phoneId)}`);
  }

  private async listHardwareTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.type) params.type = args.type as string;
    if (args.serial) params.serial = args.serial as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.duoGet('/admin/v1/tokens', params);
  }

  private async listAdmins(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.duoGet('/admin/v1/admins', params);
  }

  private async listIntegrations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.duoGet('/admin/v1/integrations', params);
  }

  private async getAuthenticationLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.mintime === 'number') params.mintime = String(args.mintime);
    if (typeof args.maxtime === 'number') params.maxtime = String(args.maxtime);
    if (typeof args.limit === 'number') params.limit = String(args.limit);
    if (Array.isArray(args.next_offset) && args.next_offset.length === 2) {
      params['next_offset[0]'] = String(args.next_offset[0]);
      params['next_offset[1]'] = String(args.next_offset[1]);
    }
    return this.duoGet('/admin/v2/logs/authentication', params);
  }

  private async getAdminLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.mintime === 'number') params.mintime = String(args.mintime);
    if (typeof args.limit === 'number') params.limit = String(args.limit);
    return this.duoGet('/admin/v1/logs/administrator', params);
  }

  private async getTelephonyLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.mintime === 'number') params.mintime = String(args.mintime);
    if (typeof args.maxtime === 'number') params.maxtime = String(args.maxtime);
    if (typeof args.limit === 'number') params.limit = String(args.limit);
    if (Array.isArray(args.next_offset) && args.next_offset.length === 2) {
      params['next_offset[0]'] = String(args.next_offset[0]);
      params['next_offset[1]'] = String(args.next_offset[1]);
    }
    return this.duoGet('/admin/v2/logs/telephony', params);
  }

  private async bypassUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.count === 'number') params.count = String(args.count);
    if (typeof args.valid_secs === 'number') params.valid_secs = String(args.valid_secs);
    if (typeof args.reuse_count === 'number') params.reuse_count = String(args.reuse_count);
    return this.duoPost(`/admin/v1/users/${encodeURIComponent(userId)}/bypass_codes`, params);
  }

  private async getAccountSummary(): Promise<ToolResult> {
    return this.duoGet('/admin/v1/info/summary');
  }

  static catalog() {
    return {
      name: 'cisco-duo',
      displayName: 'Cisco Duo',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['cisco-duo', 'cisco', 'duo'],
      toolNames: ['list_users', 'get_user', 'create_user', 'update_user', 'delete_user', 'list_groups', 'get_group', 'list_phones', 'get_phone', 'list_hardware_tokens', 'list_admins', 'list_integrations', 'get_authentication_logs', 'get_admin_logs', 'get_telephony_logs', 'bypass_user', 'get_account_summary'],
      description: 'Cisco Duo adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
