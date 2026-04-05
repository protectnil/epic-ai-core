/**
 * Biapi.pro (Budgea / Budget Insight) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://budgea.biapi.pro/2.0
// Auth: Bearer JWT token — Authorization: Bearer <jwt>
//   Use POST /auth/token to obtain a token, or POST /auth/jwt for a management token.
// Docs: https://budgea.biapi.pro/2.0/docs
// Spec: https://api.apis.guru/v2/specs/biapi.pro/2.0/openapi.json
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BiapiConfig {
  /** JWT access token obtained from /auth/token or /auth/jwt */
  accessToken: string;
  baseUrl?: string;
}

const TRUNCATE = 10 * 1024;

export class BiapiProMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: BiapiConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://budgea.biapi.pro/2.0').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'biapi-pro',
      displayName: 'Budget Insight (Biapi.pro)',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'biapi', 'budget insight', 'open banking', 'bank', 'account aggregation',
        'transactions', 'accounts', 'investments', 'psd2', 'connector', 'finance',
        'banking api', 'fintech', 'wealth management', 'categorization',
      ],
      toolNames: [
        'get_user',
        'list_connections', 'get_connection_logs',
        'list_accounts', 'list_account_transactions',
        'list_connectors', 'get_connector',
        'list_categories',
        'get_account_types',
        'list_banks', 'get_bank',
        'get_holdings_summary',
        'get_networth',
        'get_transaction_summary',
        'get_auth_token',
        'list_clients', 'get_client',
        'get_config',
        'get_incidents',
        'get_public_key',
      ],
      description: 'Budget Insight (Biapi.pro) open banking aggregation: manage bank connections, accounts, transactions, investments, and connectors via the v2.0 API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Get information about the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_connections',
        description: 'List all bank connections (linked accounts) without a user context',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum connections to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_connection_logs',
        description: 'Get connection synchronization logs for a specific connection',
        inputSchema: {
          type: 'object',
          properties: {
            id_connection: { type: 'number', description: 'Connection ID' },
            limit: { type: 'number', description: 'Maximum logs to return' },
          },
          required: ['id_connection'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List all bank accounts for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum accounts to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'list_account_transactions',
        description: 'List transactions for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            id_account: { type: 'number', description: 'Account ID' },
            min_date: { type: 'string', description: 'Filter transactions from this date (YYYY-MM-DD)' },
            max_date: { type: 'string', description: 'Filter transactions until this date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum transactions to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['id_account'],
        },
      },
      {
        name: 'list_connectors',
        description: 'List all available bank connectors (financial institutions)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum connectors to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_connector',
        description: 'Get details for a specific bank connector',
        inputSchema: {
          type: 'object',
          properties: {
            id_connector: { type: 'number', description: 'Connector ID' },
          },
          required: ['id_connector'],
        },
      },
      {
        name: 'list_categories',
        description: 'Get all transaction categories used for categorization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_account_types',
        description: 'Get all supported account types',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_banks',
        description: 'List banks (subset of connectors filtered to banking)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum banks to return' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_bank',
        description: 'Get details for a specific bank connector',
        inputSchema: {
          type: 'object',
          properties: {
            id_bank: { type: 'number', description: 'Bank/connector ID' },
          },
          required: ['id_bank'],
        },
      },
      {
        name: 'get_holdings_summary',
        description: 'Get holdings/investments summary for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'Period for summary (e.g. "month", "year")' },
          },
        },
      },
      {
        name: 'get_networth',
        description: 'Get net worth calculation for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'Period for net worth (e.g. "month", "year")' },
          },
        },
      },
      {
        name: 'get_transaction_summary',
        description: 'Get transaction summary/analytics for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            min_date: { type: 'string', description: 'Start date for summary (YYYY-MM-DD)' },
            max_date: { type: 'string', description: 'End date for summary (YYYY-MM-DD)' },
            period: { type: 'string', description: 'Grouping period: day, week, month, year' },
          },
        },
      },
      {
        name: 'get_auth_token',
        description: 'Obtain an authentication token using credentials',
        inputSchema: {
          type: 'object',
          properties: {
            application: { type: 'string', description: 'Application name/identifier' },
            password: { type: 'string', description: 'User password' },
          },
          required: ['application', 'password'],
        },
      },
      {
        name: 'list_clients',
        description: 'List all API clients (admin operation)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum clients to return' },
          },
        },
      },
      {
        name: 'get_client',
        description: 'Get information about a specific API client',
        inputSchema: {
          type: 'object',
          properties: {
            id_client: { type: 'number', description: 'Client ID' },
          },
          required: ['id_client'],
        },
      },
      {
        name: 'get_config',
        description: 'Get the current API configuration',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_incidents',
        description: 'Get incident logs for the API instance',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum incidents to return' },
          },
        },
      },
      {
        name: 'get_public_key',
        description: 'Get the public encryption key for the API instance',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this._dispatch(name, args);
      const text = JSON.stringify(result);
      return {
        content: [{ type: 'text', text: text.length > TRUNCATE ? text.slice(0, TRUNCATE) + '…[truncated]' : text }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  private async _fetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Biapi API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private _qs(params: Record<string, unknown>): string {
    const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  }

  private async _dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'get_user':
        return this._fetch('/users/me');
      case 'list_connections': {
        const qs = this._qs({ limit: args.limit, offset: args.offset });
        return this._fetch(`/connections${qs}`);
      }
      case 'get_connection_logs': {
        const qs = this._qs({ limit: args.limit });
        return this._fetch(`/connections/${args.id_connection}/logs${qs}`);
      }
      case 'list_accounts': {
        const qs = this._qs({ limit: args.limit, offset: args.offset });
        return this._fetch(`/users/me/accounts${qs}`);
      }
      case 'list_account_transactions': {
        const qs = this._qs({ min_date: args.min_date, max_date: args.max_date, limit: args.limit, offset: args.offset });
        return this._fetch(`/users/me/accounts/${args.id_account}/transactions${qs}`);
      }
      case 'list_connectors': {
        const qs = this._qs({ limit: args.limit, offset: args.offset });
        return this._fetch(`/connectors${qs}`);
      }
      case 'get_connector':
        return this._fetch(`/connectors/${args.id_connector}`);
      case 'list_categories':
        return this._fetch('/categories');
      case 'get_account_types':
        return this._fetch('/account_types');
      case 'list_banks': {
        const qs = this._qs({ limit: args.limit, offset: args.offset });
        return this._fetch(`/banks${qs}`);
      }
      case 'get_bank':
        return this._fetch(`/banks/${args.id_bank}`);
      case 'get_holdings_summary': {
        const qs = this._qs({ period: args.period });
        return this._fetch(`/users/me/holdings${qs}`);
      }
      case 'get_networth': {
        const qs = this._qs({ period: args.period });
        return this._fetch(`/users/me/networth${qs}`);
      }
      case 'get_transaction_summary': {
        const qs = this._qs({ min_date: args.min_date, max_date: args.max_date, period: args.period });
        return this._fetch(`/users/me/transactions/statistics${qs}`);
      }
      case 'get_auth_token':
        return this._fetch('/auth/token', {
          method: 'POST',
          body: JSON.stringify({ application: args.application, password: args.password }),
        });
      case 'list_clients': {
        const qs = this._qs({ limit: args.limit });
        return this._fetch(`/clients${qs}`);
      }
      case 'get_client':
        return this._fetch(`/clients/${args.id_client}`);
      case 'get_config':
        return this._fetch('/config');
      case 'get_incidents':
        return this._fetch('/incidents' + this._qs({ limit: args.limit }));
      case 'get_public_key':
        return this._fetch('/publickey');
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
