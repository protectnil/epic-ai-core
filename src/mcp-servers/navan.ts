/**
 * Navan Corporate Travel & Expense MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Navan MCP server was found on GitHub, npmjs.com, or the Navan developer portal.
// mcpbundles.com lists 1 community-built tool (list_bookings) — NOT an official Navan MCP server.
//
// Base URL: https://api.navan.com (US) — override via baseUrl for EU region (https://app-fra.navan.com)
// Auth: OAuth2 client credentials — POST /reauthenticate with client_id + client_secret in JSON body.
//       Returns a bearer token. Token endpoints confirmed: POST /reauthenticate (refresh/obtain token).
//       Verified: client_id + client_secret sent as JSON body (not Basic auth header).
// Docs: https://app.navan.com/app/helpcenter/articles/travel/admin/other-integrations/navan-tmc-api-integration-documentation
//       Note: Official API docs require admin-level account access to view. Endpoints partially verified
//       via Supergood proxy docs and Stitchflow API guide (confirmed: /get_users, /get_user_trips, /get_admin_trips).
//       Endpoints /expenses, /transactions, /policies, /departments are unverified — not in any public source.
// Rate limits: Not publicly documented; implement exponential backoff on 429 responses.
// Note: Expense API requires Navan to enable Public API on your account. Contact Navan support.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NavanConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class NavanMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: NavanConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.navan.com';
  }

  static catalog() {
    return {
      name: 'navan',
      displayName: 'Navan',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'navan', 'tripactions', 'corporate travel', 'expense', 'travel management', 'trip',
        'booking', 'hotel', 'flight', 'reimbursement', 'receipt', 'corporate card', 'tmc',
      ],
      toolNames: [
        'list_users', 'get_user',
        'list_trips', 'get_trip', 'list_admin_trips',
        'list_expenses', 'get_expense',
        'list_transactions', 'get_transaction',
        'list_policies',
        'list_departments',
      ],
      description: 'Navan corporate travel and expense: retrieve user trips, booking details, expense reports, transactions, and policy information for corporate travel management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List all users in the Navan account with profile and role information',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of users per page (default: 50, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and role details for a single Navan user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Navan user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_trips',
        description: 'List travel trips for the authenticated user with optional status and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by trip status: upcoming, past, cancelled (default: all)',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_trip',
        description: 'Get detailed information for a single trip including flights, hotels, and car rentals',
        inputSchema: {
          type: 'object',
          properties: {
            trip_id: {
              type: 'string',
              description: 'Navan trip ID',
            },
          },
          required: ['trip_id'],
        },
      },
      {
        name: 'list_admin_trips',
        description: 'List all trips across the organization (admin access required) with optional user and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter trips by a specific user ID',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            status: {
              type: 'string',
              description: 'Filter by trip status: upcoming, past, cancelled (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_expenses',
        description: 'List expense reports with optional status, user, and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter expenses by user ID',
            },
            status: {
              type: 'string',
              description: 'Filter by expense status: draft, submitted, approved, rejected, paid',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_expense',
        description: 'Get full details of a single expense report including line items and receipts',
        inputSchema: {
          type: 'object',
          properties: {
            expense_id: {
              type: 'string',
              description: 'Navan expense report ID',
            },
          },
          required: ['expense_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List corporate card and reimbursement transactions with optional user and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter transactions by user ID',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            type: {
              type: 'string',
              description: 'Filter by transaction type: card, reimbursement (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get full details of a single corporate card or reimbursement transaction by ID',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: {
              type: 'string',
              description: 'Navan transaction ID',
            },
          },
          required: ['transaction_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List travel and expense policies configured for the organization',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by policy type: travel, expense (default: all)',
            },
          },
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments configured in the Navan organization for cost center allocation',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
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
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_trips':
          return this.listTrips(args);
        case 'get_trip':
          return this.getTrip(args);
        case 'list_admin_trips':
          return this.listAdminTrips(args);
        case 'list_expenses':
          return this.listExpenses(args);
        case 'get_expense':
          return this.getExpense(args);
        case 'list_transactions':
          return this.listTransactions(args);
        case 'get_transaction':
          return this.getTransaction(args);
        case 'list_policies':
          return this.listPolicies(args);
        case 'list_departments':
          return this.listDepartments(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/reauthenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.clientId, client_secret: this.clientSecret }),
    });

    if (!response.ok) {
      throw new Error(`Navan authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    this.bearerToken = data.access_token;
    // Default to 55-minute expiry if not provided; refresh 60s early
    this.tokenExpiry = now + ((data.expires_in ?? 3600) - 60) * 1000;
    return this.bearerToken;
  }

  private async navanGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private paginationParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.page_size) params.page_size = String(args.page_size);
    return params;
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.navanGet('/get_users', this.paginationParams(args));
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.navanGet('/get_users', { user_id: args.user_id as string });
  }

  private async listTrips(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.status) params.status = args.status as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.navanGet('/get_user_trips', params);
  }

  private async getTrip(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.trip_id) return { content: [{ type: 'text', text: 'trip_id is required' }], isError: true };
    return this.navanGet('/get_user_trips', { trip_id: args.trip_id as string });
  }

  private async listAdminTrips(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.user_id) params.user_id = args.user_id as string;
    if (args.status) params.status = args.status as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.navanGet('/get_admin_trips', params);
  }

  private async listExpenses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.user_id) params.user_id = args.user_id as string;
    if (args.status) params.status = args.status as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.navanGet('/expenses', params);
  }

  private async getExpense(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.expense_id) return { content: [{ type: 'text', text: 'expense_id is required' }], isError: true };
    return this.navanGet(`/expenses/${encodeURIComponent(args.expense_id as string)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.user_id) params.user_id = args.user_id as string;
    if (args.type) params.type = args.type as string;
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.navanGet('/transactions', params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transaction_id) return { content: [{ type: 'text', text: 'transaction_id is required' }], isError: true };
    return this.navanGet(`/transactions/${encodeURIComponent(args.transaction_id as string)}`);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.type) params.type = args.type as string;
    return this.navanGet('/policies', params);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.navanGet('/departments', this.paginationParams(args));
  }
}
