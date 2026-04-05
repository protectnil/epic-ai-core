/**
 * Plaid MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/plaid/ai-coding-toolkit — transport: stdio, auth: Plaid sandbox credentials
//   Also: Plaid Dashboard MCP at https://plaid.com/docs/resources/mcp/ — transport: streamable-HTTP, auth: OAuth2 client_credentials (scope: mcp:dashboard)
//   The ai-coding-toolkit MCP covers sandbox/dev tooling (mock data generation, doc search) — not production data APIs.
//   The Dashboard MCP covers integration health and Plaid Dashboard analytics — not production financial data.
//   Neither MCP overlaps with the production data operations this adapter covers.
// Our adapter covers: 18 tools (production data APIs). Vendor MCP covers: dev/dashboard utilities (different scope).
// Recommendation: use-rest-api for production financial data. Vendor MCPs are complementary dev tools, not a replacement.
//
// Base URL: https://production.plaid.com (or https://sandbox.plaid.com for testing)
// Auth: All requests POST with client_id + secret in request body; access_token per Item
// Docs: https://plaid.com/docs/api/
// Rate limits: Varies by product; contact Plaid for production rate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PlaidConfig {
  clientId: string;
  secret: string;
  accessToken?: string;
  baseUrl?: string;
}

export class PlaidMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly secret: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PlaidConfig) {
    super();
    this.clientId = config.clientId;
    this.secret = config.secret;
    this.accessToken = config.accessToken || '';
    this.baseUrl = config.baseUrl || 'https://production.plaid.com';
  }

  static catalog() {
    return {
      name: 'plaid',
      displayName: 'Plaid',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['plaid', 'banking', 'fintech', 'transactions', 'accounts', 'balance', 'identity', 'investments', 'liabilities', 'institution', 'auth', 'ach', 'income', 'statements'],
      toolNames: [
        'get_accounts', 'get_balance', 'get_transactions', 'sync_transactions',
        'get_auth', 'get_identity', 'get_institution', 'search_institutions',
        'get_investments_holdings', 'get_investments_transactions',
        'get_liabilities', 'get_item', 'remove_item',
        'create_link_token', 'exchange_public_token',
        'get_income_verification', 'get_statements', 'get_recurring_transactions',
      ],
      description: 'Plaid financial data: retrieve bank accounts, transactions, balances, identity, investments, liabilities, and institution data via the Plaid API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_accounts',
        description: 'Retrieve all accounts associated with the Plaid Item including account type, subtype, and masks',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_balance',
        description: 'Retrieve real-time current and available balances for each account on the Plaid Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_transactions',
        description: 'Retrieve transactions for a date range with optional account filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
            count: {
              type: 'number',
              description: 'Number of transactions to return (default: 100, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Number of transactions to skip for pagination (default: 0)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'sync_transactions',
        description: 'Incrementally fetch new, modified, and removed transactions using a cursor for efficient updates',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            cursor: {
              type: 'string',
              description: 'Cursor from a previous sync response; omit for initial full sync',
            },
            count: {
              type: 'number',
              description: 'Maximum transactions per page (default: 100, max: 500)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_auth',
        description: 'Retrieve ACH account and routing numbers for bank accounts on the Plaid Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_identity',
        description: 'Retrieve identity data (name, address, email, phone) for account holders on the Plaid Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_institution',
        description: 'Retrieve details about a financial institution by Plaid institution ID including supported products',
        inputSchema: {
          type: 'object',
          properties: {
            institution_id: {
              type: 'string',
              description: 'Plaid institution ID (e.g. ins_3 for Chase)',
            },
            country_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'ISO 3166-1 alpha-2 country codes (e.g. ["US"]) — required by the API',
            },
          },
          required: ['institution_id', 'country_codes'],
        },
      },
      {
        name: 'search_institutions',
        description: 'Search for financial institutions by name with optional country and products filter',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Institution name search query (required)',
            },
            country_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'ISO 3166-1 alpha-2 country codes (e.g. ["US"]) — required by the API',
            },
            products: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to institutions supporting these products: transactions, auth, identity, investments, liabilities',
            },
            count: {
              type: 'number',
              description: 'Maximum institutions to return (default: 10, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Number of institutions to skip for pagination (default: 0)',
            },
          },
          required: ['query', 'country_codes'],
        },
      },
      {
        name: 'get_investments_holdings',
        description: 'Retrieve investment holdings (securities and quantities) for investment accounts on the Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific investment account IDs',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_investments_transactions',
        description: 'Retrieve investment transaction history (buys, sells, dividends) for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (required)',
            },
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
            count: {
              type: 'number',
              description: 'Number of transactions to return (default: 100, max: 500)',
            },
            offset: {
              type: 'number',
              description: 'Number to skip for pagination (default: 0)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_liabilities',
        description: 'Retrieve liability data for credit cards, student loans, and mortgages on the Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific liability account IDs',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_item',
        description: 'Retrieve metadata about the Plaid Item including institution ID, webhook URL, and product status',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
          },
          required: [],
        },
      },
      {
        name: 'remove_item',
        description: 'Remove a Plaid Item, invalidating its access token and removing it from Plaid',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item to remove (overrides config default)',
            },
          },
          required: [],
        },
      },
      {
        name: 'create_link_token',
        description: 'Create a Plaid Link token for initializing the Plaid Link UI flow to connect new accounts',
        inputSchema: {
          type: 'object',
          properties: {
            user_client_user_id: {
              type: 'string',
              description: 'Unique identifier for the end user in your system (required)',
            },
            products: {
              type: 'array',
              items: { type: 'string' },
              description: 'Products to request: transactions, auth, identity, investments, liabilities, balance (required)',
            },
            country_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'ISO 3166-1 alpha-2 country codes (e.g. ["US"]) (required)',
            },
            language: {
              type: 'string',
              description: 'Language for the Link UI (e.g. en, fr, es; default: en)',
            },
            webhook: {
              type: 'string',
              description: 'Webhook URL to receive Plaid events for this Item',
            },
            access_token: {
              type: 'string',
              description: 'Existing access token for update mode (re-authenticating a broken Item)',
            },
          },
          required: ['user_client_user_id', 'products', 'country_codes'],
        },
      },
      {
        name: 'exchange_public_token',
        description: 'Exchange a short-lived public_token from Plaid Link for a durable access_token and item_id',
        inputSchema: {
          type: 'object',
          properties: {
            public_token: {
              type: 'string',
              description: 'Public token returned by Plaid Link on successful connection (required)',
            },
          },
          required: ['public_token'],
        },
      },
      {
        name: 'get_income_verification',
        description: 'Retrieve payroll income verification data including paystubs, W-2s, and employer info via /credit/payroll_income/get',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_statements',
        description: 'Retrieve account statements metadata for the Item; returns statement periods and download URLs',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_recurring_transactions',
        description: 'Retrieve recurring transactions (subscriptions, bills, income) identified by Plaid for the Item',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'Plaid access token for the Item (overrides config default)',
            },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific account IDs',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_accounts': return await this.getAccounts(args);
        case 'get_balance': return await this.getBalance(args);
        case 'get_transactions': return await this.getTransactions(args);
        case 'sync_transactions': return await this.syncTransactions(args);
        case 'get_auth': return await this.getAuth(args);
        case 'get_identity': return await this.getIdentity(args);
        case 'get_institution': return await this.getInstitution(args);
        case 'search_institutions': return await this.searchInstitutions(args);
        case 'get_investments_holdings': return await this.getInvestmentsHoldings(args);
        case 'get_investments_transactions': return await this.getInvestmentsTransactions(args);
        case 'get_liabilities': return await this.getLiabilities(args);
        case 'get_item': return await this.getItem(args);
        case 'remove_item': return await this.removeItem(args);
        case 'create_link_token': return await this.createLinkToken(args);
        case 'exchange_public_token': return await this.exchangePublicToken(args);
        case 'get_income_verification': return await this.getIncomeVerification(args);
        case 'get_statements': return await this.getStatements(args);
        case 'get_recurring_transactions': return await this.getRecurringTransactions(args);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resolveToken(args: Record<string, unknown>): string {
    return (args.access_token as string | undefined) || this.accessToken;
  }

  private baseBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      client_id: this.clientId,
      secret: this.secret,
      access_token: this.resolveToken(args),
    };
  }

  private async postPlaid(endpoint: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errText: string;
      try {
        const errData = await response.json();
        errText = JSON.stringify(errData, null, 2);
      } catch {
        errText = `${response.status} ${response.statusText}`;
      }
      return { content: [{ type: 'text', text: `API error: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Accounts ──────────────────────────────────────────────────────────────

  private async getAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.postPlaid('/accounts/get', body);
  }

  private async getBalance(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.postPlaid('/accounts/balance/get', body);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  private async getTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.baseBody(args),
      start_date: args.start_date,
      end_date: args.end_date,
    };
    const options: Record<string, unknown> = {};
    if (args.account_ids) options.account_ids = args.account_ids;
    if (args.count !== undefined) options.count = args.count;
    if (args.offset !== undefined) options.offset = args.offset;
    if (Object.keys(options).length) body.options = options;
    return this.postPlaid('/transactions/get', body);
  }

  private async syncTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = this.baseBody(args);
    if (args.cursor) body.cursor = args.cursor;
    if (args.count !== undefined) body.count = args.count;
    return this.postPlaid('/transactions/sync', body);
  }

  // ── Auth & Identity ───────────────────────────────────────────────────────

  private async getAuth(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.postPlaid('/auth/get', body);
  }

  private async getIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.postPlaid('/identity/get', body);
  }

  // ── Institutions ──────────────────────────────────────────────────────────

  private async getInstitution(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      client_id: this.clientId,
      secret: this.secret,
      institution_id: args.institution_id,
      country_codes: args.country_codes,
    };
    return this.postPlaid('/institutions/get_by_id', body);
  }

  private async searchInstitutions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      client_id: this.clientId,
      secret: this.secret,
      query: args.query,
      country_codes: args.country_codes,
      count: args.count ?? 10,
      offset: args.offset ?? 0,
    };
    if (args.products) body.products = args.products;
    return this.postPlaid('/institutions/search', body);
  }

  // ── Investments ───────────────────────────────────────────────────────────

  private async getInvestmentsHoldings(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.postPlaid('/investments/holdings/get', body);
  }

  private async getInvestmentsTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      ...this.baseBody(args),
      start_date: args.start_date,
      end_date: args.end_date,
    };
    const options: Record<string, unknown> = {};
    if (args.account_ids) options.account_ids = args.account_ids;
    if (args.count !== undefined) options.count = args.count;
    if (args.offset !== undefined) options.offset = args.offset;
    if (Object.keys(options).length) body.options = options;
    return this.postPlaid('/investments/transactions/get', body);
  }

  // ── Liabilities ───────────────────────────────────────────────────────────

  private async getLiabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.options = { account_ids: args.account_ids };
    return this.postPlaid('/liabilities/get', body);
  }

  // ── Item Management ───────────────────────────────────────────────────────

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postPlaid('/item/get', this.baseBody(args));
  }

  private async removeItem(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postPlaid('/item/remove', this.baseBody(args));
  }

  // ── Link Token ────────────────────────────────────────────────────────────

  private async createLinkToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      client_id: this.clientId,
      secret: this.secret,
      user: { client_user_id: args.user_client_user_id },
      products: args.products,
      country_codes: args.country_codes,
      language: args.language ?? 'en',
    };
    if (args.webhook) body.webhook = args.webhook;
    if (args.access_token) body.access_token = args.access_token;
    return this.postPlaid('/link/token/create', body);
  }

  private async exchangePublicToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      client_id: this.clientId,
      secret: this.secret,
      public_token: args.public_token,
    };
    return this.postPlaid('/item/public_token/exchange', body);
  }

  // ── Income & Statements ───────────────────────────────────────────────────

  private async getIncomeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postPlaid('/credit/payroll_income/get', this.baseBody(args));
  }

  private async getStatements(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postPlaid('/statements/list', this.baseBody(args));
  }

  private async getRecurringTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.baseBody(args);
    if (args.account_ids) body.account_ids = args.account_ids;
    return this.postPlaid('/transactions/recurring/get', body);
  }
}
