/**
 * You Need A Budget (YNAB) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://api.youneedabudget.com/v1
// Auth: Bearer token — Authorization: Bearer <access_token>
//   Personal access tokens available in YNAB app under Account Settings → Developer Settings.
// Docs: https://api.youneedabudget.com/
// Spec: https://api.apis.guru/v2/specs/youneedabudget.com/1.0.0/openapi.json
// Rate limits: 200 requests/hour per access token.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface YnabConfig {
  /** Personal access token from YNAB Account Settings → Developer Settings */
  accessToken: string;
  baseUrl?: string;
}

const TRUNCATE = 10 * 1024;

export class YouneedabudgetMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: YnabConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.youneedabudget.com/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'youneedabudget',
      displayName: 'You Need A Budget (YNAB)',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'ynab', 'budget', 'finance', 'personal finance', 'money', 'transactions',
        'accounts', 'categories', 'payees', 'scheduled transactions', 'net worth',
        'spending', 'savings', 'income', 'expenses',
      ],
      toolNames: [
        'list_budgets', 'get_budget',
        'list_accounts', 'get_account', 'create_account',
        'list_categories', 'get_category', 'get_month_category', 'update_month_category',
        'list_transactions', 'get_transaction', 'create_transaction', 'update_transaction',
        'delete_transaction', 'bulk_create_transactions', 'import_transactions',
        'list_payees', 'get_payee',
        'list_payee_locations', 'get_payee_location',
        'list_budget_months', 'get_budget_month',
        'list_scheduled_transactions', 'get_scheduled_transaction',
        'get_budget_settings', 'get_user',
      ],
      description: 'You Need A Budget (YNAB) personal finance: manage budgets, accounts, categories, transactions, payees, and scheduled transactions via the v1 API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_budgets',
        description: 'List all budgets for the authenticated user, with optional last-knowledge-of-server for delta updates',
        inputSchema: {
          type: 'object',
          properties: {
            include_accounts: { type: 'boolean', description: 'Include account info in response (default: false)' },
          },
        },
      },
      {
        name: 'get_budget',
        description: 'Get a single budget by ID including settings, accounts, categories, and payees',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used" for the most recently used budget' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_budget_settings',
        description: 'Get settings for a specific budget (currency format, date format)',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List all accounts for a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_account',
        description: 'Get a single account by ID',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            account_id: { type: 'string', description: 'Account ID' },
          },
          required: ['budget_id', 'account_id'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new account in a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            name: { type: 'string', description: 'Account name' },
            type: { type: 'string', description: 'Account type: checking, savings, cash, creditCard, lineOfCredit, otherAsset, otherLiability, mortgage, autoLoan, studentLoan, personalLoan, medicalDebt, otherDebt' },
            balance: { type: 'number', description: 'Current balance in milliunits (multiply dollars by 1000)' },
          },
          required: ['budget_id', 'name', 'type', 'balance'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all category groups and their categories for a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_category',
        description: 'Get a single category by ID',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            category_id: { type: 'string', description: 'Category ID' },
          },
          required: ['budget_id', 'category_id'],
        },
      },
      {
        name: 'get_month_category',
        description: 'Get a single category for a specific budget month',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            month: { type: 'string', description: 'Budget month in ISO 8601 format (YYYY-MM-DD), e.g. "2024-01-01"' },
            category_id: { type: 'string', description: 'Category ID' },
          },
          required: ['budget_id', 'month', 'category_id'],
        },
      },
      {
        name: 'update_month_category',
        description: 'Update a category for a specific budget month (set budgeted amount)',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            month: { type: 'string', description: 'Budget month in ISO 8601 format (YYYY-MM-DD)' },
            category_id: { type: 'string', description: 'Category ID' },
            budgeted: { type: 'number', description: 'Amount to budget in milliunits (multiply dollars by 1000)' },
          },
          required: ['budget_id', 'month', 'category_id', 'budgeted'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List transactions for a budget with optional date/type/account filters',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            since_date: { type: 'string', description: 'Filter to transactions since this date (ISO 8601: YYYY-MM-DD)' },
            type: { type: 'string', description: 'Filter by type: uncategorized, unapproved' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Get a single transaction by ID',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            transaction_id: { type: 'string', description: 'Transaction ID' },
          },
          required: ['budget_id', 'transaction_id'],
        },
      },
      {
        name: 'create_transaction',
        description: 'Create a single new transaction',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            account_id: { type: 'string', description: 'Account ID for the transaction' },
            date: { type: 'string', description: 'Transaction date (ISO 8601: YYYY-MM-DD)' },
            amount: { type: 'number', description: 'Amount in milliunits (negative for outflow, positive for inflow)' },
            payee_id: { type: 'string', description: 'Payee ID (optional)' },
            payee_name: { type: 'string', description: 'Payee name (optional, creates payee if not found)' },
            category_id: { type: 'string', description: 'Category ID (optional)' },
            memo: { type: 'string', description: 'Transaction memo (optional)' },
            cleared: { type: 'string', description: 'cleared, uncleared, or reconciled' },
            approved: { type: 'boolean', description: 'Whether the transaction is approved (default: true)' },
          },
          required: ['budget_id', 'account_id', 'date', 'amount'],
        },
      },
      {
        name: 'update_transaction',
        description: 'Update an existing transaction',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            transaction_id: { type: 'string', description: 'Transaction ID' },
            account_id: { type: 'string', description: 'Account ID' },
            date: { type: 'string', description: 'Transaction date (ISO 8601: YYYY-MM-DD)' },
            amount: { type: 'number', description: 'Amount in milliunits' },
            payee_id: { type: 'string', description: 'Payee ID' },
            payee_name: { type: 'string', description: 'Payee name' },
            category_id: { type: 'string', description: 'Category ID' },
            memo: { type: 'string', description: 'Memo' },
            cleared: { type: 'string', description: 'cleared, uncleared, or reconciled' },
            approved: { type: 'boolean', description: 'Whether approved' },
          },
          required: ['budget_id', 'transaction_id', 'account_id', 'date', 'amount'],
        },
      },
      {
        name: 'delete_transaction',
        description: 'Delete an existing transaction',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            transaction_id: { type: 'string', description: 'Transaction ID to delete' },
          },
          required: ['budget_id', 'transaction_id'],
        },
      },
      {
        name: 'bulk_create_transactions',
        description: 'Create multiple transactions in bulk (up to 1000 at once)',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            transactions: {
              type: 'array',
              description: 'Array of transaction objects, each with account_id, date, amount, and optional fields',
              items: { type: 'object' },
            },
          },
          required: ['budget_id', 'transactions'],
        },
      },
      {
        name: 'import_transactions',
        description: 'Import transactions by triggering account linking imports for all accounts with a linked financial institution',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'list_payees',
        description: 'List all payees for a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_payee',
        description: 'Get a single payee by ID',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            payee_id: { type: 'string', description: 'Payee ID' },
          },
          required: ['budget_id', 'payee_id'],
        },
      },
      {
        name: 'list_payee_locations',
        description: 'List all payee locations for a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_payee_location',
        description: 'Get a single payee location by ID',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            payee_location_id: { type: 'string', description: 'Payee location ID' },
          },
          required: ['budget_id', 'payee_location_id'],
        },
      },
      {
        name: 'list_budget_months',
        description: 'List all budget months for a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_budget_month',
        description: 'Get a single budget month by date',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            month: { type: 'string', description: 'Budget month (ISO 8601: YYYY-MM-DD, e.g. "2024-01-01")' },
          },
          required: ['budget_id', 'month'],
        },
      },
      {
        name: 'list_scheduled_transactions',
        description: 'List all scheduled transactions for a budget',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            last_knowledge_of_server: { type: 'number', description: 'Server knowledge for delta updates' },
          },
          required: ['budget_id'],
        },
      },
      {
        name: 'get_scheduled_transaction',
        description: 'Get a single scheduled transaction by ID',
        inputSchema: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'Budget ID or "last-used"' },
            scheduled_transaction_id: { type: 'string', description: 'Scheduled transaction ID' },
          },
          required: ['budget_id', 'scheduled_transaction_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Get the authenticated user information',
        inputSchema: {
          type: 'object',
          properties: {},
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
      throw new Error(`YNAB API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private _qs(params: Record<string, unknown>): string {
    const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  }

  private async _dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    const bid = args.budget_id as string;

    switch (name) {
      case 'list_budgets': {
        const qs = this._qs({ include_accounts: args.include_accounts });
        return this._fetch(`/budgets${qs}`);
      }
      case 'get_budget': {
        const qs = this._qs({ last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}${qs}`);
      }
      case 'get_budget_settings':
        return this._fetch(`/budgets/${bid}/settings`);
      case 'list_accounts': {
        const qs = this._qs({ last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}/accounts${qs}`);
      }
      case 'get_account':
        return this._fetch(`/budgets/${bid}/accounts/${args.account_id}`);
      case 'create_account':
        return this._fetch(`/budgets/${bid}/accounts`, {
          method: 'POST',
          body: JSON.stringify({ account: { name: args.name, type: args.type, balance: args.balance } }),
        });
      case 'list_categories': {
        const qs = this._qs({ last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}/categories${qs}`);
      }
      case 'get_category':
        return this._fetch(`/budgets/${bid}/categories/${args.category_id}`);
      case 'get_month_category':
        return this._fetch(`/budgets/${bid}/months/${args.month}/categories/${args.category_id}`);
      case 'update_month_category':
        return this._fetch(`/budgets/${bid}/months/${args.month}/categories/${args.category_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ category: { budgeted: args.budgeted } }),
        });
      case 'list_transactions': {
        const qs = this._qs({ since_date: args.since_date, type: args.type, last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}/transactions${qs}`);
      }
      case 'get_transaction':
        return this._fetch(`/budgets/${bid}/transactions/${args.transaction_id}`);
      case 'create_transaction':
        return this._fetch(`/budgets/${bid}/transactions`, {
          method: 'POST',
          body: JSON.stringify({
            transaction: {
              account_id: args.account_id,
              date: args.date,
              amount: args.amount,
              payee_id: args.payee_id,
              payee_name: args.payee_name,
              category_id: args.category_id,
              memo: args.memo,
              cleared: args.cleared,
              approved: args.approved,
            },
          }),
        });
      case 'update_transaction':
        return this._fetch(`/budgets/${bid}/transactions/${args.transaction_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            transaction: {
              account_id: args.account_id,
              date: args.date,
              amount: args.amount,
              payee_id: args.payee_id,
              payee_name: args.payee_name,
              category_id: args.category_id,
              memo: args.memo,
              cleared: args.cleared,
              approved: args.approved,
            },
          }),
        });
      case 'delete_transaction':
        return this._fetch(`/budgets/${bid}/transactions/${args.transaction_id}`, { method: 'DELETE' });
      case 'bulk_create_transactions':
        return this._fetch(`/budgets/${bid}/transactions/bulk`, {
          method: 'POST',
          body: JSON.stringify({ transactions: args.transactions }),
        });
      case 'import_transactions':
        return this._fetch(`/budgets/${bid}/transactions/import`, { method: 'POST' });
      case 'list_payees': {
        const qs = this._qs({ last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}/payees${qs}`);
      }
      case 'get_payee':
        return this._fetch(`/budgets/${bid}/payees/${args.payee_id}`);
      case 'list_payee_locations':
        return this._fetch(`/budgets/${bid}/payee_locations`);
      case 'get_payee_location':
        return this._fetch(`/budgets/${bid}/payee_locations/${args.payee_location_id}`);
      case 'list_budget_months': {
        const qs = this._qs({ last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}/months${qs}`);
      }
      case 'get_budget_month':
        return this._fetch(`/budgets/${bid}/months/${args.month}`);
      case 'list_scheduled_transactions': {
        const qs = this._qs({ last_knowledge_of_server: args.last_knowledge_of_server });
        return this._fetch(`/budgets/${bid}/scheduled_transactions${qs}`);
      }
      case 'get_scheduled_transaction':
        return this._fetch(`/budgets/${bid}/scheduled_transactions/${args.scheduled_transaction_id}`);
      case 'get_user':
        return this._fetch('/user');
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
