/**
 * Codat Bank Feeds MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://api.codat.io
// Auth: HTTP Basic — "Basic " + base64(apiKey)
//   Codat docs: the API key is base64-encoded and used as the Basic auth credential.
// Docs: https://docs.codat.io/bank-feeds-api
// Rate limits: Not publicly documented; Codat enforces per-client limits server-side.
// OpenAPI spec: https://api.apis.guru/v2/specs/codat.io/bank-feeds/2.1.0/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CodatBankFeedsConfig {
  /** Codat API key — will be base64-encoded into the Authorization header */
  apiKey: string;
  baseUrl?: string;
}

export class CodatBankFeedsMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: CodatBankFeedsConfig) {
    super();
    this.authHeader = 'Basic ' + Buffer.from(config.apiKey).toString('base64');
    this.baseUrl = config.baseUrl || 'https://api.codat.io';
  }

  static catalog() {
    return {
      name: 'codat-bank-feeds',
      displayName: 'Codat Bank Feeds',
      version: '2.1.0',
      category: 'finance' as const,
      keywords: [
        'codat', 'bank feeds', 'bank accounts', 'bank transactions',
        'open banking', 'accounting', 'financial data', 'fintech',
      ],
      toolNames: [
        'list_bank_feed_accounts',
        'create_bank_feed_accounts',
        'update_bank_feed_account',
        'list_bank_transactions',
        'get_create_bank_transactions_model',
        'create_bank_transactions',
      ],
      description:
        'Manage Codat Bank Feeds: list and configure bank feed accounts, push bank transactions, and query push options via the Codat Bank Feeds REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Bank Feed Accounts ────────────────────────────────────────────────
      {
        name: 'list_bank_feed_accounts',
        description:
          'List all bank feed bank accounts for a company connection in Codat',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
          },
          required: ['companyId', 'connectionId'],
        },
      },
      {
        name: 'create_bank_feed_accounts',
        description:
          'Create or replace bank feed bank accounts for a company connection in Codat',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accounts: {
              type: 'array',
              description:
                'Array of bank account objects (id, accountName, accountNumber, accountType, balance, currency, sortCode, status, feedStartDate)',
            },
          },
          required: ['companyId', 'connectionId', 'accounts'],
        },
      },
      {
        name: 'update_bank_feed_account',
        description:
          'Update a single bank feed bank account by accountId for a company connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accountId: {
              type: 'string',
              description: 'Unique identifier for the bank account',
            },
            accountName: {
              type: 'string',
              description: 'Display name for the account',
            },
            accountNumber: {
              type: 'string',
              description: 'Account number',
            },
            accountType: {
              type: 'string',
              description: 'Account type (e.g. checking, savings)',
            },
            balance: {
              type: 'number',
              description: 'Current account balance',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD)',
            },
            feedStartDate: {
              type: 'string',
              description: 'ISO 8601 date from which the feed starts',
            },
            modifiedDate: {
              type: 'string',
              description: 'ISO 8601 date the account was last modified',
            },
            sortCode: {
              type: 'string',
              description: 'Sort code for the account (UK accounts)',
            },
            status: {
              type: 'string',
              description: 'Account status (e.g. pending, connected)',
            },
          },
          required: ['companyId', 'connectionId', 'accountId'],
        },
      },
      // ── Bank Transactions ─────────────────────────────────────────────────
      {
        name: 'list_bank_transactions',
        description:
          'List bank transactions for a specific bank account within a Codat company connection',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accountId: {
              type: 'string',
              description: 'Unique identifier for the bank account',
            },
            page: {
              type: 'integer',
              description: 'Page number for pagination (required, starts at 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of records per page (max 5000)',
            },
            query: {
              type: 'string',
              description: 'Codat query string to filter results',
            },
            orderBy: {
              type: 'string',
              description: 'Field to order results by',
            },
          },
          required: ['companyId', 'connectionId', 'accountId', 'page'],
        },
      },
      {
        name: 'get_create_bank_transactions_model',
        description:
          'List push options and validation rules for creating bank transactions on an account',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accountId: {
              type: 'string',
              description: 'Unique identifier for the bank account',
            },
          },
          required: ['companyId', 'connectionId', 'accountId'],
        },
      },
      {
        name: 'create_bank_transactions',
        description:
          'Push bank transactions for a specific bank account into the Codat platform',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Unique identifier for the Codat company',
            },
            connectionId: {
              type: 'string',
              description: 'Unique identifier for the data connection',
            },
            accountId: {
              type: 'string',
              description: 'Unique identifier for the bank account',
            },
            transactions: {
              type: 'array',
              description:
                'Array of bank transaction objects (id, date, description, amount, balance, transactionType, reconciled)',
            },
            allowSyncOnPushComplete: {
              type: 'boolean',
              description: 'Trigger a sync on push completion (default: true)',
            },
            timeoutInMinutes: {
              type: 'integer',
              description: 'Timeout in minutes for the push operation',
            },
          },
          required: ['companyId', 'connectionId', 'accountId', 'transactions'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_bank_feed_accounts':
          return await this.listBankFeedAccounts(args);
        case 'create_bank_feed_accounts':
          return await this.createBankFeedAccounts(args);
        case 'update_bank_feed_account':
          return await this.updateBankFeedAccount(args);
        case 'list_bank_transactions':
          return await this.listBankTransactions(args);
        case 'get_create_bank_transactions_model':
          return await this.getCreateBankTransactionsModel(args);
        case 'create_bank_transactions':
          return await this.createBankTransactions(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${String(err)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    query?: Record<string, unknown>,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await this.fetchWithRetry(url.toString(), init);
    let text = await res.text();
    const MAX = 10 * 1024;
    if (text.length > MAX) {
      text = text.slice(0, MAX) + '\n[truncated]';
    }

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${res.status}: ${text}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text }], isError: false };
  }

  private async listBankFeedAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/connections/${connectionId}/connectionInfo/bankFeedAccounts`,
    );
  }

  private async createBankFeedAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, accounts } = args;
    return this.request(
      'POST',
      `/companies/${companyId}/connections/${connectionId}/connectionInfo/bankFeedAccounts`,
      undefined,
      accounts,
    );
  }

  private async updateBankFeedAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, accountId, ...fields } = args;
    return this.request(
      'PATCH',
      `/companies/${companyId}/connections/${connectionId}/connectionInfo/bankFeedAccounts/${accountId}`,
      undefined,
      fields,
    );
  }

  private async listBankTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, accountId, page, pageSize, query, orderBy } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/connections/${connectionId}/data/bankAccounts/${accountId}/bankTransactions`,
      { page, pageSize, query, orderBy },
    );
  }

  private async getCreateBankTransactionsModel(args: Record<string, unknown>): Promise<ToolResult> {
    const { companyId, connectionId, accountId } = args;
    return this.request(
      'GET',
      `/companies/${companyId}/connections/${connectionId}/options/bankAccounts/${accountId}/bankTransactions`,
    );
  }

  private async createBankTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      companyId,
      connectionId,
      accountId,
      transactions,
      allowSyncOnPushComplete,
      timeoutInMinutes,
    } = args;
    const bodyPayload: Record<string, unknown> = {
      accountId,
      transactions,
    };
    return this.request(
      'POST',
      `/companies/${companyId}/connections/${connectionId}/push/bankAccounts/${accountId}/bankTransactions`,
      { allowSyncOnPushComplete, timeoutInMinutes },
      bodyPayload,
    );
  }
}
