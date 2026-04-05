/**
 * MX Financial Data MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official MX MCP server was found on GitHub. MX publishes SDKs in Java, Python, Ruby, C#,
// and Node.js (openapi/mxenabled), but no stdio or HTTP MCP server.
// Our adapter covers: 19 tools. Vendor MCP covers: 0 tools (none found).
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: https://int-api.mx.com (development) | https://api.mx.com (production — set via baseUrl)
// Auth: Basic auth — Base64(client_id:api_key) in Authorization header
// Docs: https://docs.mx.com/api-reference/platform-api/reference/mx-platform-api/
// Rate limits: Not publicly documented; contact MX for production rate limit details
// Note: MX API now supports Accept-Version header (e.g. v20250224); this adapter uses the legacy
//       Accept: application/vnd.mx.api.v1+json header which remains valid for the endpoints implemented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MXConfig {
  clientId: string;
  apiKey: string;
  baseUrl?: string;
}

export class MXMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MXConfig) {
    super();
    this.clientId = config.clientId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://int-api.mx.com';
  }

  static catalog() {
    return {
      name: 'mx',
      displayName: 'MX Financial Data',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'mx', 'financial data', 'open finance', 'bank', 'banking', 'accounts', 'transactions',
        'members', 'institutions', 'aggregation', 'fintech', 'money', 'balance', 'connectivity',
      ],
      toolNames: [
        'list_users', 'create_user', 'get_user', 'update_user', 'delete_user',
        'list_members', 'get_member', 'create_member', 'delete_member', 'aggregate_member',
        'list_member_accounts', 'list_member_transactions',
        'list_accounts', 'get_account',
        'list_transactions', 'get_transaction',
        'search_institutions', 'get_institution',
        'list_holdings',
      ],
      description: 'MX financial data platform: manage users, connect financial institution members, retrieve accounts, transactions, holdings, and search institutions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all users in the MX platform with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Number of records per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_user',
        description: 'Create a new MX platform user with an optional identifier and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'External unique identifier for the user (e.g. your system user ID)',
            },
            email: {
              type: 'string',
              description: 'Email address of the user',
            },
            metadata: {
              type: 'string',
              description: 'Additional metadata as a JSON string (max 1024 chars)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a single MX platform user by user GUID',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID (e.g. USR-1234)',
            },
          },
          required: ['user_guid'],
        },
      },
      {
        name: 'update_user',
        description: 'Update attributes of an existing MX user such as email or metadata',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID to update',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            metadata: {
              type: 'string',
              description: 'Updated metadata as a JSON string',
            },
          },
          required: ['user_guid'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete an MX user and all associated data',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID to delete',
            },
          },
          required: ['user_guid'],
        },
      },
      {
        name: 'list_members',
        description: 'List all financial institution members connected to an MX user',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID whose members to list',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
          required: ['user_guid'],
        },
      },
      {
        name: 'get_member',
        description: 'Get details for a single connected financial institution member',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            member_guid: {
              type: 'string',
              description: 'MX member GUID (e.g. MBR-1234)',
            },
          },
          required: ['user_guid', 'member_guid'],
        },
      },
      {
        name: 'create_member',
        description: 'Create a new member connection to a financial institution for a user with credentials',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID to connect the member to',
            },
            institution_code: {
              type: 'string',
              description: 'MX institution code (e.g. chase)',
            },
            credentials: {
              type: 'string',
              description: 'JSON array of credential objects with guid and value fields',
            },
          },
          required: ['user_guid', 'institution_code', 'credentials'],
        },
      },
      {
        name: 'delete_member',
        description: 'Delete a financial institution member connection from an MX user',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            member_guid: {
              type: 'string',
              description: 'MX member GUID to delete',
            },
          },
          required: ['user_guid', 'member_guid'],
        },
      },
      {
        name: 'aggregate_member',
        description: 'Trigger data aggregation for a member to refresh accounts and transactions from the institution',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            member_guid: {
              type: 'string',
              description: 'MX member GUID to aggregate',
            },
          },
          required: ['user_guid', 'member_guid'],
        },
      },
      {
        name: 'list_member_accounts',
        description: 'List all accounts associated with a specific financial institution member',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            member_guid: {
              type: 'string',
              description: 'MX member GUID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
          required: ['user_guid', 'member_guid'],
        },
      },
      {
        name: 'list_member_transactions',
        description: 'List transactions for all accounts under a specific member with optional date range',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            member_guid: {
              type: 'string',
              description: 'MX member GUID',
            },
            from_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
          required: ['user_guid', 'member_guid'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List all accounts for an MX user across all connected members with balance and type information',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
          required: ['user_guid'],
        },
      },
      {
        name: 'get_account',
        description: 'Get details for a single account including balance, type, and institution info',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            account_guid: {
              type: 'string',
              description: 'MX account GUID (e.g. ACT-1234)',
            },
          },
          required: ['user_guid', 'account_guid'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List all transactions for an MX user across all accounts with optional date and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            from_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            to_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
          required: ['user_guid'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Get details for a single transaction by user and transaction GUID',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            transaction_guid: {
              type: 'string',
              description: 'MX transaction GUID (e.g. TRN-1234)',
            },
          },
          required: ['user_guid', 'transaction_guid'],
        },
      },
      {
        name: 'search_institutions',
        description: 'Search MX-supported financial institutions by name with pagination for member creation',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Institution name to search for (e.g. Chase, Wells Fargo)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_institution',
        description: 'Get details for a specific financial institution by its MX institution code',
        inputSchema: {
          type: 'object',
          properties: {
            institution_code: {
              type: 'string',
              description: 'MX institution code (e.g. chase, bank_of_america)',
            },
          },
          required: ['institution_code'],
        },
      },
      {
        name: 'list_holdings',
        description: 'List investment holdings for an MX user including security name, value, and quantity',
        inputSchema: {
          type: 'object',
          properties: {
            user_guid: {
              type: 'string',
              description: 'MX user GUID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            records_per_page: {
              type: 'number',
              description: 'Records per page (default: 25, max: 100)',
            },
          },
          required: ['user_guid'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users':
          return this.listUsers(args);
        case 'create_user':
          return this.createUser(args);
        case 'get_user':
          return this.getUser(args);
        case 'update_user':
          return this.updateUser(args);
        case 'delete_user':
          return this.deleteUser(args);
        case 'list_members':
          return this.listMembers(args);
        case 'get_member':
          return this.getMember(args);
        case 'create_member':
          return this.createMember(args);
        case 'delete_member':
          return this.deleteMember(args);
        case 'aggregate_member':
          return this.aggregateMember(args);
        case 'list_member_accounts':
          return this.listMemberAccounts(args);
        case 'list_member_transactions':
          return this.listMemberTransactions(args);
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'list_transactions':
          return this.listTransactions(args);
        case 'get_transaction':
          return this.getTransaction(args);
        case 'search_institutions':
          return this.searchInstitutions(args);
        case 'get_institution':
          return this.getInstitution(args);
        case 'list_holdings':
          return this.listHoldings(args);
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.clientId}:${this.apiKey}`)}`;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Accept': 'application/vnd.mx.api.v1+json',
      'Content-Type': 'application/json',
    };
  }

  private async mxGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mxPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async mxPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async mxDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private paginationParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.records_per_page) params.records_per_page = String(args.records_per_page);
    return params;
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.mxGet('/users', this.paginationParams(args));
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const user: Record<string, unknown> = {};
    if (args.id) user.id = args.id;
    if (args.email) user.email = args.email;
    if (args.metadata) user.metadata = args.metadata;
    return this.mxPost('/users', { user });
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}`);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    const user: Record<string, unknown> = {};
    if (args.email) user.email = args.email;
    if (args.metadata) user.metadata = args.metadata;
    return this.mxPut(`/users/${encodeURIComponent(args.user_guid as string)}`, { user });
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    return this.mxDelete(`/users/${encodeURIComponent(args.user_guid as string)}`);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/members`, this.paginationParams(args));
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.member_guid) return { content: [{ type: 'text', text: 'user_guid and member_guid are required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/members/${encodeURIComponent(args.member_guid as string)}`);
  }

  private async createMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.institution_code || !args.credentials) {
      return { content: [{ type: 'text', text: 'user_guid, institution_code, and credentials are required' }], isError: true };
    }
    let credentials: unknown;
    try {
      credentials = JSON.parse(args.credentials as string);
    } catch {
      return { content: [{ type: 'text', text: 'credentials must be a valid JSON array string' }], isError: true };
    }
    return this.mxPost(`/users/${encodeURIComponent(args.user_guid as string)}/members`, {
      member: { institution_code: args.institution_code, credentials },
    });
  }

  private async deleteMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.member_guid) return { content: [{ type: 'text', text: 'user_guid and member_guid are required' }], isError: true };
    return this.mxDelete(`/users/${encodeURIComponent(args.user_guid as string)}/members/${encodeURIComponent(args.member_guid as string)}`);
  }

  private async aggregateMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.member_guid) return { content: [{ type: 'text', text: 'user_guid and member_guid are required' }], isError: true };
    return this.mxPost(`/users/${encodeURIComponent(args.user_guid as string)}/members/${encodeURIComponent(args.member_guid as string)}/aggregate`, {});
  }

  private async listMemberAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.member_guid) return { content: [{ type: 'text', text: 'user_guid and member_guid are required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/members/${encodeURIComponent(args.member_guid as string)}/accounts`, this.paginationParams(args));
  }

  private async listMemberTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.member_guid) return { content: [{ type: 'text', text: 'user_guid and member_guid are required' }], isError: true };
    const params = this.paginationParams(args);
    if (args.from_date) params.from_date = args.from_date as string;
    if (args.to_date) params.to_date = args.to_date as string;
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/members/${encodeURIComponent(args.member_guid as string)}/transactions`, params);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/accounts`, this.paginationParams(args));
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.account_guid) return { content: [{ type: 'text', text: 'user_guid and account_guid are required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/accounts/${encodeURIComponent(args.account_guid as string)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    const params = this.paginationParams(args);
    if (args.from_date) params.from_date = args.from_date as string;
    if (args.to_date) params.to_date = args.to_date as string;
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/transactions`, params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid || !args.transaction_guid) return { content: [{ type: 'text', text: 'user_guid and transaction_guid are required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/transactions/${encodeURIComponent(args.transaction_guid as string)}`);
  }

  private async searchInstitutions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.name) params.name = args.name as string;
    return this.mxGet('/institutions', params);
  }

  private async getInstitution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.institution_code) return { content: [{ type: 'text', text: 'institution_code is required' }], isError: true };
    return this.mxGet(`/institutions/${encodeURIComponent(args.institution_code as string)}`);
  }

  private async listHoldings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_guid) return { content: [{ type: 'text', text: 'user_guid is required' }], isError: true };
    return this.mxGet(`/users/${encodeURIComponent(args.user_guid as string)}/holdings`, this.paginationParams(args));
  }
}
