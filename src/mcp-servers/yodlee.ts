/**
 * Yodlee MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://production.api.yodlee.com/ysl (or sandbox: https://sandbox.api.yodlee.com/ysl)
// Auth: Bearer token — Authorization: {loginName} Bearer <accessToken>
//   Obtain via POST /auth/token with cobrand login credentials.
// Docs: https://developer.yodlee.com/api-reference/
// Spec: https://api.apis.guru/v2/specs/yodlee.com/1.1.0/openapi.json
// Rate limits: Depends on enterprise plan.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface YodleeConfig {
  /** Yodlee access token (obtained via generateAccessToken) */
  accessToken: string;
  /** Login name for Authorization header prefix */
  loginName?: string;
  baseUrl?: string;
}

const TRUNCATE = 10 * 1024;

export class YodleeMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly loginName: string;
  private readonly baseUrl: string;

  constructor(config: YodleeConfig) {
    super();
    this.accessToken = config.accessToken;
    this.loginName = config.loginName || '';
    this.baseUrl = (config.baseUrl || 'https://production.api.yodlee.com/ysl').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'yodlee',
      displayName: 'Yodlee',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'yodlee', 'open banking', 'account aggregation', 'financial data', 'fintech',
        'bank accounts', 'transactions', 'investments', 'holdings', 'net worth',
        'provider accounts', 'statements', 'documents', 'verification', 'data extracts',
      ],
      toolNames: [
        'get_user', 'update_user', 'register_user', 'logout_user',
        'generate_access_token', 'cobrand_login',
        'list_accounts', 'get_account', 'update_account', 'delete_account',
        'create_manual_account', 'get_historical_balances',
        'list_transactions', 'update_transaction', 'get_transactions_count',
        'list_transaction_categories', 'create_transaction_category',
        'list_provider_accounts', 'get_provider_account', 'delete_provider_account',
        'list_providers', 'get_provider',
        'list_holdings', 'get_holding_securities',
        'get_derived_networth', 'get_transaction_summary', 'get_holding_summary',
        'list_documents', 'download_document',
        'get_verification_status',
      ],
      description: 'Yodlee financial data aggregation: manage bank accounts, transactions, investments, provider connections, documents, and net worth via the v1.1 API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Get the current user profile information',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_user',
        description: 'Update the current user profile',
        inputSchema: {
          type: 'object',
          properties: {
            name_first: { type: 'string', description: 'User first name' },
            name_last: { type: 'string', description: 'User last name' },
            email: { type: 'string', description: 'User email address' },
          },
        },
      },
      {
        name: 'register_user',
        description: 'Register a new user in the Yodlee system',
        inputSchema: {
          type: 'object',
          properties: {
            loginName: { type: 'string', description: 'Login name for the new user' },
            password: { type: 'string', description: 'Password for the new user' },
            email: { type: 'string', description: 'Email address' },
          },
          required: ['loginName', 'password'],
        },
      },
      {
        name: 'logout_user',
        description: 'Logout the current user and invalidate the session',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'generate_access_token',
        description: 'Generate an access token for API authentication using client credentials',
        inputSchema: {
          type: 'object',
          properties: {
            clientId: { type: 'string', description: 'Client ID' },
            secret: { type: 'string', description: 'Client secret' },
          },
          required: ['clientId', 'secret'],
        },
      },
      {
        name: 'cobrand_login',
        description: 'Authenticate the cobrand (enterprise) credentials to obtain a cobrand session token',
        inputSchema: {
          type: 'object',
          properties: {
            cobrandLogin: { type: 'string', description: 'Cobrand login name' },
            cobrandPassword: { type: 'string', description: 'Cobrand password' },
            locale: { type: 'string', description: 'Locale (e.g. en_US)' },
          },
          required: ['cobrandLogin', 'cobrandPassword'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List all financial accounts for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Filter by account ID(s), comma-separated' },
            container: { type: 'string', description: 'Filter by account container: bank, creditCard, investment, insurance, loan, reward, realEstate, manual' },
            providerAccountId: { type: 'string', description: 'Filter by provider account ID' },
            requestId: { type: 'string', description: 'Unique request identifier for deduplication' },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get details for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number', description: 'Account ID' },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'update_account',
        description: 'Update account details (nickname, memo, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number', description: 'Account ID' },
            nickname: { type: 'string', description: 'Account nickname' },
            memo: { type: 'string', description: 'Account memo/notes' },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'delete_account',
        description: 'Delete a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number', description: 'Account ID to delete' },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'create_manual_account',
        description: 'Create a manual (non-linked) financial account',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'Account name' },
            accountType: { type: 'string', description: 'Account type (e.g. CHECKING, SAVINGS, CREDIT_CARD)' },
            accountNumber: { type: 'string', description: 'Account number (masked)' },
            balance: { type: 'number', description: 'Current balance' },
            currency: { type: 'string', description: 'Currency code (e.g. USD)' },
          },
          required: ['accountName', 'accountType'],
        },
      },
      {
        name: 'get_historical_balances',
        description: 'Get historical balance data for an account',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number', description: 'Account ID' },
            fromDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            toDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            interval: { type: 'string', description: 'D (daily), W (weekly), M (monthly)' },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List transactions with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Filter by account ID(s), comma-separated' },
            fromDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            toDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            categoryId: { type: 'string', description: 'Filter by category ID' },
            keyword: { type: 'string', description: 'Search keyword' },
            skip: { type: 'number', description: 'Number of records to skip (pagination)' },
            top: { type: 'number', description: 'Maximum records to return' },
          },
        },
      },
      {
        name: 'update_transaction',
        description: 'Update transaction details (category, memo, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            transactionId: { type: 'number', description: 'Transaction ID' },
            categoryId: { type: 'number', description: 'New category ID' },
            memo: { type: 'string', description: 'Transaction memo' },
            isManual: { type: 'boolean', description: 'Whether this is a manual entry' },
          },
          required: ['transactionId'],
        },
      },
      {
        name: 'get_transactions_count',
        description: 'Get total count of transactions matching filter criteria',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Filter by account ID(s)' },
            fromDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            toDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'list_transaction_categories',
        description: 'Get all transaction categories',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_transaction_category',
        description: 'Create a custom transaction category',
        inputSchema: {
          type: 'object',
          properties: {
            categoryName: { type: 'string', description: 'Category name' },
            parentCategoryId: { type: 'number', description: 'Parent category ID' },
          },
          required: ['categoryName'],
        },
      },
      {
        name: 'list_provider_accounts',
        description: 'List all provider (financial institution) accounts linked by the user',
        inputSchema: {
          type: 'object',
          properties: {
            providerAccountIds: { type: 'string', description: 'Filter by provider account IDs, comma-separated' },
          },
        },
      },
      {
        name: 'get_provider_account',
        description: 'Get details for a specific provider account',
        inputSchema: {
          type: 'object',
          properties: {
            providerAccountId: { type: 'number', description: 'Provider account ID' },
          },
          required: ['providerAccountId'],
        },
      },
      {
        name: 'delete_provider_account',
        description: 'Delete a provider account (unlink a financial institution)',
        inputSchema: {
          type: 'object',
          properties: {
            providerAccountId: { type: 'number', description: 'Provider account ID to delete' },
          },
          required: ['providerAccountId'],
        },
      },
      {
        name: 'list_providers',
        description: 'List available financial institution providers',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Search providers by name' },
            skip: { type: 'number', description: 'Number to skip for pagination' },
            top: { type: 'number', description: 'Maximum to return' },
          },
        },
      },
      {
        name: 'get_provider',
        description: 'Get details for a specific financial institution provider',
        inputSchema: {
          type: 'object',
          properties: {
            providerId: { type: 'number', description: 'Provider ID' },
          },
          required: ['providerId'],
        },
      },
      {
        name: 'list_holdings',
        description: 'List investment holdings for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Filter by account ID(s)' },
            assetClassification: { type: 'string', description: 'Filter by asset classification' },
          },
        },
      },
      {
        name: 'get_holding_securities',
        description: 'Get securities data for holdings',
        inputSchema: {
          type: 'object',
          properties: {
            holdingId: { type: 'string', description: 'Filter by holding ID(s), comma-separated' },
          },
        },
      },
      {
        name: 'get_derived_networth',
        description: 'Get derived net worth (assets minus liabilities) for the user',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            toDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            interval: { type: 'string', description: 'D (daily), W (weekly), M (monthly)' },
          },
        },
      },
      {
        name: 'get_transaction_summary',
        description: 'Get transaction summary analytics grouped by category or date',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            toDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            categoryId: { type: 'string', description: 'Filter by category ID' },
            groupBy: { type: 'string', description: 'Group by: CATEGORY, MONTH' },
          },
        },
      },
      {
        name: 'get_holding_summary',
        description: 'Get investment holding summary grouped by asset classification',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Filter by account ID(s)' },
            classificationValue: { type: 'string', description: 'Asset classification filter' },
          },
        },
      },
      {
        name: 'list_documents',
        description: 'List all financial documents (statements, tax forms, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Search keyword for documents' },
            accountId: { type: 'string', description: 'Filter by account ID' },
            fromDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            toDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            docType: { type: 'string', description: 'Document type: STATEMENTS, TAX, EBILLS, INSURANCE' },
          },
        },
      },
      {
        name: 'download_document',
        description: 'Download a specific financial document',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'Document ID to download' },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'get_verification_status',
        description: 'Get the verification status for an account (bank verification)',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Filter by account ID' },
            providerAccountId: { type: 'string', description: 'Filter by provider account ID' },
          },
        },
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
    const authHeader = this.loginName
      ? `${this.loginName} Bearer ${this.accessToken}`
      : `Bearer ${this.accessToken}`;
    const res = await this.fetchWithRetry(url, {
      ...options,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Yodlee API ${res.status}: ${body.slice(0, 200)}`);
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
        return this._fetch('/user');
      case 'update_user':
        return this._fetch('/user', { method: 'PUT', body: JSON.stringify({ user: { name: { first: args.name_first, last: args.name_last }, email: args.email } }) });
      case 'register_user':
        return this._fetch('/user/register', { method: 'POST', body: JSON.stringify({ user: { loginName: args.loginName, password: args.password, email: args.email } }) });
      case 'logout_user':
        return this._fetch('/user/logout', { method: 'POST' });
      case 'generate_access_token':
        return this._fetch('/auth/token', { method: 'POST', body: JSON.stringify({ clientId: args.clientId, secret: args.secret }) });
      case 'cobrand_login':
        return this._fetch('/cobrand/login', { method: 'POST', body: JSON.stringify({ cobrand: { cobrandLogin: args.cobrandLogin, cobrandPassword: args.cobrandPassword, locale: args.locale } }) });
      case 'list_accounts': {
        const qs = this._qs({ accountId: args.accountId, container: args.container, providerAccountId: args.providerAccountId });
        return this._fetch(`/accounts${qs}`);
      }
      case 'get_account':
        return this._fetch(`/accounts/${args.accountId}`);
      case 'update_account':
        return this._fetch(`/accounts/${args.accountId}`, { method: 'PUT', body: JSON.stringify({ account: { nickname: args.nickname, memo: args.memo } }) });
      case 'delete_account':
        return this._fetch(`/accounts/${args.accountId}`, { method: 'DELETE' });
      case 'create_manual_account':
        return this._fetch('/accounts', { method: 'POST', body: JSON.stringify({ account: { accountName: args.accountName, accountType: args.accountType, accountNumber: args.accountNumber, balance: { amount: args.balance, currency: args.currency } } }) });
      case 'get_historical_balances': {
        const qs = this._qs({ accountId: args.accountId, fromDate: args.fromDate, toDate: args.toDate, interval: args.interval });
        return this._fetch(`/accounts/historicalBalances${qs}`);
      }
      case 'list_transactions': {
        const qs = this._qs({ accountId: args.accountId, fromDate: args.fromDate, toDate: args.toDate, categoryId: args.categoryId, keyword: args.keyword, skip: args.skip, top: args.top });
        return this._fetch(`/transactions${qs}`);
      }
      case 'update_transaction':
        return this._fetch(`/transactions/${args.transactionId}`, { method: 'PUT', body: JSON.stringify({ transaction: { categoryId: args.categoryId, memo: args.memo } }) });
      case 'get_transactions_count': {
        const qs = this._qs({ accountId: args.accountId, fromDate: args.fromDate, toDate: args.toDate });
        return this._fetch(`/transactions/count${qs}`);
      }
      case 'list_transaction_categories':
        return this._fetch('/transactions/categories');
      case 'create_transaction_category':
        return this._fetch('/transactions/categories', { method: 'POST', body: JSON.stringify({ transactionCategory: { categoryName: args.categoryName, parentCategoryId: args.parentCategoryId } }) });
      case 'list_provider_accounts': {
        const qs = this._qs({ providerAccountIds: args.providerAccountIds });
        return this._fetch(`/providerAccounts${qs}`);
      }
      case 'get_provider_account':
        return this._fetch(`/providerAccounts/${args.providerAccountId}`);
      case 'delete_provider_account':
        return this._fetch(`/providerAccounts/${args.providerAccountId}`, { method: 'DELETE' });
      case 'list_providers': {
        const qs = this._qs({ name: args.name, skip: args.skip, top: args.top });
        return this._fetch(`/providers${qs}`);
      }
      case 'get_provider':
        return this._fetch(`/providers/${args.providerId}`);
      case 'list_holdings': {
        const qs = this._qs({ accountId: args.accountId, assetClassification: args.assetClassification });
        return this._fetch(`/holdings${qs}`);
      }
      case 'get_holding_securities': {
        const qs = this._qs({ holdingId: args.holdingId });
        return this._fetch(`/holdings/securities${qs}`);
      }
      case 'get_derived_networth': {
        const qs = this._qs({ fromDate: args.fromDate, toDate: args.toDate, interval: args.interval });
        return this._fetch(`/derived/networth${qs}`);
      }
      case 'get_transaction_summary': {
        const qs = this._qs({ fromDate: args.fromDate, toDate: args.toDate, categoryId: args.categoryId, groupBy: args.groupBy });
        return this._fetch(`/derived/transactionSummary${qs}`);
      }
      case 'get_holding_summary': {
        const qs = this._qs({ accountId: args.accountId, classificationValue: args.classificationValue });
        return this._fetch(`/derived/holdingSummary${qs}`);
      }
      case 'list_documents': {
        const qs = this._qs({ keyword: args.keyword, accountId: args.accountId, fromDate: args.fromDate, toDate: args.toDate, docType: args.docType });
        return this._fetch(`/documents${qs}`);
      }
      case 'download_document':
        return this._fetch(`/documents/${args.documentId}`);
      case 'get_verification_status': {
        const qs = this._qs({ accountId: args.accountId, providerAccountId: args.providerAccountId });
        return this._fetch(`/verification${qs}`);
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
