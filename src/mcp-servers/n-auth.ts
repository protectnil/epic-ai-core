/**
 * n-auth (nextAuth) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official n-auth / nextAuth MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.nextauth.com
// Auth: X-apikey header (API key for the virtual server).
//   Optional X-su header for role impersonation (requires root or setrid permission).
// Docs: https://api.docs.nextauth.com/api/swagger.json
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NAuthConfig {
  apiKey: string;
  suRole?: string;
  baseUrl?: string;
}

export class NAuthMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly suRole: string | undefined;
  private readonly baseUrl: string;

  constructor(config: NAuthConfig) {
    super();
    this.apiKey = config.apiKey;
    this.suRole = config.suRole;
    this.baseUrl = config.baseUrl || 'https://api.nextauth.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_servers',
        description: 'List all nextAuth virtual servers associated with the API key.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of servers to return.',
            },
            marker: {
              type: 'string',
              description: 'Pagination marker for the next page of results.',
            },
          },
        },
      },
      {
        name: 'create_server',
        description: 'Create a new nextAuth virtual server.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new server.',
            },
            settings: {
              type: 'object',
              description: 'Optional server configuration settings.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_server',
        description: 'Get configuration and details for a specific nextAuth server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
          },
          required: ['serverid'],
        },
      },
      {
        name: 'get_api_keys',
        description: 'Get all API keys associated with the account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_users',
        description: 'Get all users registered on a nextAuth server, with optional filtering, search, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            filter: {
              type: 'string',
              description: 'Optional filter expression.',
            },
            search: {
              type: 'string',
              description: 'Optional search term.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return.',
            },
            marker: {
              type: 'string',
              description: 'Pagination marker.',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g., "userid asc").',
            },
          },
          required: ['serverid'],
        },
      },
      {
        name: 'get_user_accounts',
        description: 'Get all registered accounts (enrolled devices) for a specific user on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            userid: {
              type: 'string',
              description: 'The user ID.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of accounts to return.',
            },
            marker: {
              type: 'string',
              description: 'Pagination marker.',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction.',
            },
          },
          required: ['serverid', 'userid'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a specific user from a nextAuth server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            userid: {
              type: 'string',
              description: 'The user ID to delete.',
            },
          },
          required: ['serverid', 'userid'],
        },
      },
      {
        name: 'get_all_accounts',
        description: 'Get all accounts (enrolled devices) on a server, with optional filtering and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            filter: {
              type: 'string',
              description: 'Optional filter expression.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of accounts to return.',
            },
            marker: {
              type: 'string',
              description: 'Pagination marker.',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction.',
            },
          },
          required: ['serverid'],
        },
      },
      {
        name: 'get_account',
        description: 'Get a specific account (enrolled device) by account ID on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            accountid: {
              type: 'string',
              description: 'The account ID.',
            },
          },
          required: ['serverid', 'accountid'],
        },
      },
      {
        name: 'update_account',
        description: 'Update the blocked status of a specific account on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            accountid: {
              type: 'string',
              description: 'The account ID.',
            },
            blocked: {
              type: 'boolean',
              description: 'Whether to block the account.',
            },
          },
          required: ['serverid', 'accountid', 'blocked'],
        },
      },
      {
        name: 'check_session',
        description: 'Check if a user session is currently active (user is logged in) on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            nonce: {
              type: 'string',
              description: 'The session nonce.',
            },
          },
          required: ['serverid', 'nonce'],
        },
      },
      {
        name: 'provoke_login',
        description: 'Push a login confirmation request to the user\'s mobile app for the given session.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            nonce: {
              type: 'string',
              description: 'The session nonce.',
            },
            userContext: {
              type: 'object',
              description: 'Optional user context information shown to the user during login.',
            },
          },
          required: ['serverid', 'nonce'],
        },
      },
      {
        name: 'logout',
        description: 'Force a logout on the given session.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            nonce: {
              type: 'string',
              description: 'The session nonce to log out.',
            },
          },
          required: ['serverid', 'nonce'],
        },
      },
      {
        name: 'create_transaction',
        description: 'Create a transaction to be approved by the user within the current session (e.g., for step-up authentication or signing).',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            nonce: {
              type: 'string',
              description: 'The session nonce.',
            },
            msg: {
              type: 'string',
              description: 'The transaction message to display to the user for approval.',
            },
          },
          required: ['serverid', 'nonce', 'msg'],
        },
      },
      {
        name: 'get_transaction_result',
        description: 'Get the result (approved/rejected/pending) for a specific transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            transactionid: {
              type: 'string',
              description: 'The transaction ID.',
            },
          },
          required: ['serverid', 'transactionid'],
        },
      },
      {
        name: 'get_permissions',
        description: 'Get all permissions for a specific role on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            roleid: {
              type: 'string',
              description: 'The role ID.',
            },
          },
          required: ['serverid', 'roleid'],
        },
      },
      {
        name: 'grant_permissions',
        description: 'Set new permissions for a specific role on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            roleid: {
              type: 'string',
              description: 'The role ID.',
            },
            permissions: {
              type: 'object',
              description: 'Permissions object to grant to the role.',
            },
          },
          required: ['serverid', 'roleid', 'permissions'],
        },
      },
      {
        name: 'get_server_attributes',
        description: 'Get all attributes of a specific nextAuth server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
          },
          required: ['serverid'],
        },
      },
      {
        name: 'get_user_attributes',
        description: 'Get all attributes for a specific user on a server.',
        inputSchema: {
          type: 'object',
          properties: {
            serverid: {
              type: 'string',
              description: 'The server ID.',
            },
            userid: {
              type: 'string',
              description: 'The user ID.',
            },
          },
          required: ['serverid', 'userid'],
        },
      },
      {
        name: 'get_global_attributes',
        description: 'Get all global attributes for the account.',
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
        case 'get_servers':
          return await this.getServers(args);
        case 'create_server':
          return await this.createServer(args);
        case 'get_server':
          return await this.getServer(args);
        case 'get_api_keys':
          return await this.getApiKeys();
        case 'get_users':
          return await this.getUsers(args);
        case 'get_user_accounts':
          return await this.getUserAccounts(args);
        case 'delete_user':
          return await this.deleteUser(args);
        case 'get_all_accounts':
          return await this.getAllAccounts(args);
        case 'get_account':
          return await this.getAccount(args);
        case 'update_account':
          return await this.updateAccount(args);
        case 'check_session':
          return await this.checkSession(args);
        case 'provoke_login':
          return await this.provokeLogin(args);
        case 'logout':
          return await this.logout(args);
        case 'create_transaction':
          return await this.createTransaction(args);
        case 'get_transaction_result':
          return await this.getTransactionResult(args);
        case 'get_permissions':
          return await this.getPermissions(args);
        case 'grant_permissions':
          return await this.grantPermissions(args);
        case 'get_server_attributes':
          return await this.getServerAttributes(args);
        case 'get_user_attributes':
          return await this.getUserAttributes(args);
        case 'get_global_attributes':
          return await this.getGlobalAttributes();
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

  private buildHeaders(nonce?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-apikey': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.suRole) {
      headers['X-su'] = this.suRole;
    }
    if (nonce) {
      headers['X-nonce'] = nonce;
    }
    return headers;
  }

  private async request(
    path: string,
    method: string,
    body?: unknown,
    nonce?: string,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method,
      headers: this.buildHeaders(nonce),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `n-auth API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    // 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'OK' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`n-auth returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated =
      text.length > 10_000
        ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
        : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildQs(params: Record<string, unknown>, keys: string[]): string {
    const parts: string[] = [];
    for (const key of keys) {
      if (params[key] !== undefined && params[key] !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
      }
    }
    return parts.length ? '?' + parts.join('&') : '';
  }

  private async getServers(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs(args, ['limit', 'marker']);
    return this.request(`/servers/${qs}`, 'GET');
  }

  private async createServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('/servers/', 'POST', { name: args.name, ...(args.settings as object || {}) });
  }

  private async getServer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid) {
      return { content: [{ type: 'text', text: 'serverid is required' }], isError: true };
    }
    return this.request(`/servers/${encodeURIComponent(String(args.serverid))}/`, 'GET');
  }

  private async getApiKeys(): Promise<ToolResult> {
    return this.request('/apikeys/', 'GET');
  }

  private async getUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid) {
      return { content: [{ type: 'text', text: 'serverid is required' }], isError: true };
    }
    const qs = this.buildQs(args, ['filter', 'search', 'limit', 'marker', 'sort']);
    return this.request(`/servers/${encodeURIComponent(String(args.serverid))}/users/${qs}`, 'GET');
  }

  private async getUserAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.userid) {
      return { content: [{ type: 'text', text: 'serverid and userid are required' }], isError: true };
    }
    const qs = this.buildQs(args, ['limit', 'marker', 'sort']);
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/users/${encodeURIComponent(String(args.userid))}/accounts${qs}`,
      'GET',
    );
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.userid) {
      return { content: [{ type: 'text', text: 'serverid and userid are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/users/${encodeURIComponent(String(args.userid))}/`,
      'DELETE',
    );
  }

  private async getAllAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid) {
      return { content: [{ type: 'text', text: 'serverid is required' }], isError: true };
    }
    const qs = this.buildQs(args, ['filter', 'limit', 'marker', 'sort']);
    return this.request(`/servers/${encodeURIComponent(String(args.serverid))}/accounts/${qs}`, 'GET');
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.accountid) {
      return { content: [{ type: 'text', text: 'serverid and accountid are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/accounts/${encodeURIComponent(String(args.accountid))}/`,
      'GET',
    );
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.accountid || args.blocked === undefined) {
      return { content: [{ type: 'text', text: 'serverid, accountid, and blocked are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/accounts/${encodeURIComponent(String(args.accountid))}/`,
      'PUT',
      { blocked: args.blocked },
    );
  }

  private async checkSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.nonce) {
      return { content: [{ type: 'text', text: 'serverid and nonce are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/sessions/`,
      'GET',
      undefined,
      String(args.nonce),
    );
  }

  private async provokeLogin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.nonce) {
      return { content: [{ type: 'text', text: 'serverid and nonce are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/sessions/provokelogin`,
      'POST',
      args.userContext !== undefined ? args.userContext : undefined,
      String(args.nonce),
    );
  }

  private async logout(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.nonce) {
      return { content: [{ type: 'text', text: 'serverid and nonce are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/sessions/logout`,
      'POST',
      undefined,
      String(args.nonce),
    );
  }

  private async createTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.nonce || !args.msg) {
      return { content: [{ type: 'text', text: 'serverid, nonce, and msg are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/sessions/transactions`,
      'POST',
      { msg: args.msg },
      String(args.nonce),
    );
  }

  private async getTransactionResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.transactionid) {
      return { content: [{ type: 'text', text: 'serverid and transactionid are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/transactions/${encodeURIComponent(String(args.transactionid))}`,
      'GET',
    );
  }

  private async getPermissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.roleid) {
      return { content: [{ type: 'text', text: 'serverid and roleid are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/permissions/${encodeURIComponent(String(args.roleid))}`,
      'GET',
    );
  }

  private async grantPermissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.roleid || !args.permissions) {
      return { content: [{ type: 'text', text: 'serverid, roleid, and permissions are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/permissions/${encodeURIComponent(String(args.roleid))}`,
      'POST',
      args.permissions,
    );
  }

  private async getServerAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid) {
      return { content: [{ type: 'text', text: 'serverid is required' }], isError: true };
    }
    return this.request(`/servers/${encodeURIComponent(String(args.serverid))}/attributes/`, 'GET');
  }

  private async getUserAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serverid || !args.userid) {
      return { content: [{ type: 'text', text: 'serverid and userid are required' }], isError: true };
    }
    return this.request(
      `/servers/${encodeURIComponent(String(args.serverid))}/users/${encodeURIComponent(String(args.userid))}/attributes/`,
      'GET',
    );
  }

  private async getGlobalAttributes(): Promise<ToolResult> {
    return this.request('/attributes/', 'GET');
  }

  static catalog() {
    return {
      name: 'n-auth',
      displayName: 'n-auth (nextAuth)',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: [
        'n-auth',
        'nextauth',
        'authentication',
        'passwordless',
        'mobile auth',
        'identity',
        'MFA',
        'two-factor',
        'session',
        'login',
        'transaction signing',
        'step-up auth',
        'user management',
        'accounts',
        'permissions',
      ],
      toolNames: [
        'get_servers',
        'create_server',
        'get_server',
        'get_api_keys',
        'get_users',
        'get_user_accounts',
        'delete_user',
        'get_all_accounts',
        'get_account',
        'update_account',
        'check_session',
        'provoke_login',
        'logout',
        'create_transaction',
        'get_transaction_result',
        'get_permissions',
        'grant_permissions',
        'get_server_attributes',
        'get_user_attributes',
        'get_global_attributes',
      ],
      description:
        'n-auth (nextAuth) adapter — passwordless mobile authentication: server management, user enrollment, session validation, transaction signing, and permission control.',
      author: 'protectnil' as const,
    };
  }
}
