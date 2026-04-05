/**
 * Ntropy Transaction API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP published.
// Our adapter covers the Ntropy Transaction API v2 (legacy) — transaction enrichment,
//   account holder management, batch processing, and bank statement OCR.
//
// Base URL: https://api.ntropy.network
// Auth: X-API-KEY header on every request
// Docs: https://legacy.docs.ntropy.com/api/
// Rate limits: Varies by plan. Contact api@ntropy.network for details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NtropyWorkConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.ntropy.network) */
  baseUrl?: string;
}

export class NtropyworkMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NtropyWorkConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.ntropy.network';
  }

  static catalog() {
    return {
      name: 'ntropywork',
      displayName: 'Ntropy Transaction API',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'ntropy', 'transaction', 'enrichment', 'classification', 'categorization',
        'account holder', 'merchant', 'fintech', 'banking', 'financial data',
        'bank statement', 'ocr', 'batch', 'recurring payments', 'ledger',
        'transaction data', 'financial transactions', 'spending',
      ],
      toolNames: [
        'enrich_transactions_sync',
        'enrich_transactions_async',
        'get_batch_result',
        'list_account_holders',
        'create_account_holder',
        'get_account_holder',
        'update_account_holder',
        'delete_account_holder',
        'list_account_holder_transactions',
        'correct_transactions',
        'identify_recurring_payments',
      ],
      description: 'Ntropy Transaction API: enrich and classify financial transactions, manage account holders, batch-process transaction ledgers, and identify recurring payments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Enrichment ─────────────────────────────────────────────────────────
      {
        name: 'enrich_transactions_sync',
        description: 'Enrich and add transactions to the ledger of account holders synchronously — returns enriched results immediately. Each transaction requires account_holder_id, amount, entry_type, date, and description.',
        inputSchema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              description: 'Array of transactions to enrich. Each item: { transaction_id, account_holder_id, amount (number), entry_type ("incoming"|"outgoing"), date (YYYY-MM-DD), iso_currency_code (e.g. "USD"), description, country (ISO-2) }',
              items: { type: 'object' },
            },
          },
          required: ['transactions'],
        },
      },
      {
        name: 'enrich_transactions_async',
        description: 'Enrich and add transactions to the ledger of account holders asynchronously — returns a batch ID immediately. Poll get_batch_result with the batch ID to retrieve results.',
        inputSchema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              description: 'Array of transactions to enrich. Each item: { transaction_id, account_holder_id, amount (number), entry_type ("incoming"|"outgoing"), date (YYYY-MM-DD), iso_currency_code (e.g. "USD"), description, country (ISO-2) }',
              items: { type: 'object' },
            },
          },
          required: ['transactions'],
        },
      },
      {
        name: 'get_batch_result',
        description: 'Fetch the result of a previously submitted async batch transaction enrichment job using the batch ID returned by enrich_transactions_async.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Batch job ID (36-character UUID) as returned by enrich_transactions_async',
            },
          },
          required: ['id'],
        },
      },
      // ── Account Holders ────────────────────────────────────────────────────
      {
        name: 'list_account_holders',
        description: 'Get a paginated list of all registered account holders in the Ntropy ledger.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'integer',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_account_holder',
        description: 'Create a new account holder in the Ntropy ledger. Account holders are required before transactions can be enriched.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the account holder (your internal ID)',
            },
            type: {
              type: 'string',
              description: 'Account holder type: "consumer" or "business"',
              enum: ['consumer', 'business'],
            },
            name: {
              type: 'string',
              description: 'Name of the account holder (person or business)',
            },
            industry: {
              type: 'string',
              description: 'Industry of the account holder (for business type, e.g. "fintech", "retail")',
            },
            website: {
              type: 'string',
              description: 'Website URL of the account holder (for business type)',
            },
          },
          required: ['id', 'type'],
        },
      },
      {
        name: 'get_account_holder',
        description: 'Retrieve the details and status of a specific account holder by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            account_holder_id: {
              type: 'string',
              description: 'The account holder ID to retrieve',
            },
          },
          required: ['account_holder_id'],
        },
      },
      {
        name: 'update_account_holder',
        description: 'Replace (full update) the properties of an existing account holder.',
        inputSchema: {
          type: 'object',
          properties: {
            account_holder_id: {
              type: 'string',
              description: 'The account holder ID to update',
            },
            type: {
              type: 'string',
              description: 'Account holder type: "consumer" or "business"',
              enum: ['consumer', 'business'],
            },
            name: {
              type: 'string',
              description: 'Updated name of the account holder',
            },
            industry: {
              type: 'string',
              description: 'Updated industry (for business type)',
            },
            website: {
              type: 'string',
              description: 'Updated website URL (for business type)',
            },
          },
          required: ['account_holder_id'],
        },
      },
      {
        name: 'delete_account_holder',
        description: 'Delete an account holder and all their associated data from the Ntropy ledger. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            account_holder_id: {
              type: 'string',
              description: 'The account holder ID to delete',
            },
          },
          required: ['account_holder_id'],
        },
      },
      // ── Transactions ───────────────────────────────────────────────────────
      {
        name: 'list_account_holder_transactions',
        description: 'List enriched transactions for a specific account holder, with optional date range filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            account_holder_id: {
              type: 'string',
              description: 'The account holder ID whose transactions to list',
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
              type: 'integer',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'integer',
              description: 'Number of results per page (default: 20)',
            },
          },
          required: ['account_holder_id'],
        },
      },
      {
        name: 'correct_transactions',
        description: 'Correct (update) properties of multiple transactions for an account holder — use to fix misclassified categories, merchant names, or other enriched fields.',
        inputSchema: {
          type: 'object',
          properties: {
            account_holder_id: {
              type: 'string',
              description: 'The account holder ID whose transactions to correct',
            },
            corrections: {
              type: 'array',
              description: 'Array of correction objects: { transaction_id, field_name, correct_value }',
              items: { type: 'object' },
            },
          },
          required: ['account_holder_id', 'corrections'],
        },
      },
      // ── Recurring Payments ─────────────────────────────────────────────────
      {
        name: 'identify_recurring_payments',
        description: 'Identify existing recurring payments (subscriptions, bills, direct debits) in an account holder\'s transaction history.',
        inputSchema: {
          type: 'object',
          properties: {
            account_holder_id: {
              type: 'string',
              description: 'The account holder ID to analyze for recurring payments',
            },
          },
          required: ['account_holder_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'enrich_transactions_sync':       return this.enrichSync(args);
        case 'enrich_transactions_async':      return this.enrichAsync(args);
        case 'get_batch_result':               return this.getBatchResult(args);
        case 'list_account_holders':           return this.listAccountHolders(args);
        case 'create_account_holder':          return this.createAccountHolder(args);
        case 'get_account_holder':             return this.getAccountHolder(args);
        case 'update_account_holder':          return this.updateAccountHolder(args);
        case 'delete_account_holder':          return this.deleteAccountHolder(args);
        case 'list_account_holder_transactions': return this.listTransactions(args);
        case 'correct_transactions':           return this.correctTransactions(args);
        case 'identify_recurring_payments':    return this.identifyRecurring(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      url += '?' + new URLSearchParams(query).toString();
    }
    const init: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Enrichment methods ─────────────────────────────────────────────────────

  private async enrichSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transactions) {
      return { content: [{ type: 'text', text: 'transactions array is required' }], isError: true };
    }
    return this.request('POST', '/v2/transactions', args.transactions);
  }

  private async enrichAsync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transactions) {
      return { content: [{ type: 'text', text: 'transactions array is required' }], isError: true };
    }
    return this.request('POST', '/v2/transactions/async', args.transactions);
  }

  private async getBatchResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/v2/transactions/async/${args.id as string}`);
  }

  // ── Account holder methods ─────────────────────────────────────────────────

  private async listAccountHolders(args: Record<string, unknown>): Promise<ToolResult> {
    const query: Record<string, string> = {};
    if (args.page)     query.page     = String(args.page);
    if (args.per_page) query.per_page = String(args.per_page);
    return this.request('GET', '/v2/account-holder', undefined, query);
  }

  private async createAccountHolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.type) {
      return { content: [{ type: 'text', text: 'id and type are required' }], isError: true };
    }
    return this.request('POST', '/v2/account-holder', args);
  }

  private async getAccountHolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_holder_id) {
      return { content: [{ type: 'text', text: 'account_holder_id is required' }], isError: true };
    }
    return this.request('GET', `/v2/account-holder/${args.account_holder_id as string}`);
  }

  private async updateAccountHolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_holder_id) {
      return { content: [{ type: 'text', text: 'account_holder_id is required' }], isError: true };
    }
    const { account_holder_id, ...body } = args;
    return this.request('PUT', `/v2/account-holder/${account_holder_id as string}`, body);
  }

  private async deleteAccountHolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_holder_id) {
      return { content: [{ type: 'text', text: 'account_holder_id is required' }], isError: true };
    }
    return this.request('DELETE', `/v2/account-holder/${args.account_holder_id as string}`);
  }

  // ── Transaction methods ────────────────────────────────────────────────────

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_holder_id) {
      return { content: [{ type: 'text', text: 'account_holder_id is required' }], isError: true };
    }
    const query: Record<string, string> = {};
    if (args.from_date) query.from_date = args.from_date as string;
    if (args.to_date)   query.to_date   = args.to_date   as string;
    if (args.page)      query.page      = String(args.page);
    if (args.per_page)  query.per_page  = String(args.per_page);
    return this.request('GET', `/v2/account-holder/${args.account_holder_id as string}/transactions`, undefined, query);
  }

  private async correctTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_holder_id || !args.corrections) {
      return { content: [{ type: 'text', text: 'account_holder_id and corrections are required' }], isError: true };
    }
    return this.request(
      'PUT',
      `/v2/account-holder/${args.account_holder_id as string}/transactions`,
      args.corrections,
    );
  }

  // ── Recurring payments methods ─────────────────────────────────────────────

  private async identifyRecurring(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_holder_id) {
      return { content: [{ type: 'text', text: 'account_holder_id is required' }], isError: true };
    }
    return this.request(
      'POST',
      `/v2/account-holder/${args.account_holder_id as string}/recurring-payments`,
    );
  }
}
