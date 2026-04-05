/**
 * Brex MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Community server: https://github.com/crazyrabbitLTC/mcp-brex-server — third-party, read-only,
// covers only card expenses/budgets/transactions. Does not expose team, payments, cards (write), or accounts.
// Community MCP fails criterion 4 of the protocol (no official vendor publication) → use-rest-api.
// Recommendation: Use this adapter for full API coverage including write operations.
//
// Base URL: https://api.brex.com (canonical as of 2026-01-01; platform.brexapis.com still resolves)
// Auth: Bearer token (user token or OAuth2 access token) in Authorization header.
//       Token scopes control which APIs are accessible.
// Docs: https://developer.brex.com/
// Rate limits: Not formally published; use cursor-based pagination for large datasets.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrexConfig {
  accessToken: string;
  baseUrl?: string;
}

export class BrexMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: BrexConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.brex.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // Transactions
      {
        name: 'list_card_transactions',
        description: 'List card transactions for the primary Brex card account with optional user and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response (next_cursor field)' },
            limit: { type: 'number', description: 'Maximum number of transactions to return (default: 100)' },
            user_ids: { type: 'string', description: 'Comma-separated list of user IDs to filter transactions by' },
            posted_at_start: { type: 'string', description: 'Filter transactions posted at or after this ISO 8601 datetime (e.g. 2026-01-01T00:00:00Z)' },
          },
        },
      },
      {
        name: 'list_cash_transactions',
        description: 'List all transactions for a specific Brex cash account by account ID with optional date and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The cash account ID to list transactions for (use list_cash_accounts to find account IDs)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of transactions to return (default: 100)' },
            posted_at_start: { type: 'string', description: 'Filter transactions posted at or after this ISO 8601 datetime' },
          },
          required: ['account_id'],
        },
      },
      // Accounts
      {
        name: 'list_cash_accounts',
        description: 'List all Brex cash deposit accounts in the organization with balances',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_primary_card_account',
        description: 'Get the primary Brex card account details including current balance and statement period',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // Expenses
      {
        name: 'list_expenses',
        description: 'List card expenses with optional filters for user, parent expense, and field expansion',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of expenses to return (default: 100)' },
            user_id: { type: 'string', description: 'Filter expenses by user ID' },
            parent_expense_id: { type: 'string', description: 'Filter by parent expense ID for split expenses' },
            expand: { type: 'string', description: 'Comma-separated fields to expand: merchant, receipts, budget, location' },
          },
        },
      },
      {
        name: 'get_expense',
        description: 'Get a single card expense by its ID with optional field expansion',
        inputSchema: {
          type: 'object',
          properties: {
            expense_id: { type: 'string', description: 'The expense ID' },
            expand: { type: 'string', description: 'Comma-separated fields to expand: merchant, receipts, budget, location' },
          },
          required: ['expense_id'],
        },
      },
      {
        name: 'update_expense',
        description: 'Update a card expense memo or category for accounting and reconciliation',
        inputSchema: {
          type: 'object',
          properties: {
            expense_id: { type: 'string', description: 'The expense ID to update' },
            memo: { type: 'string', description: 'A short note or description for the expense' },
            category: { type: 'string', description: 'Expense category (e.g. travel, software, meals, advertising)' },
          },
          required: ['expense_id'],
        },
      },
      // Budgets
      {
        name: 'list_budgets',
        description: 'List all budgets (spend limits) in the organization with balance and period details',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of budgets to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_budget',
        description: 'Get a single budget by its ID including remaining balance and member assignments',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The budget ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_budget',
        description: 'Create a new budget with a spend limit, period, and optional member assignments',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Budget name (e.g. "Q2 Marketing")' },
            description: { type: 'string', description: 'Budget description' },
            parent_budget_id: { type: 'string', description: 'Parent budget ID if this is a sub-budget' },
            owner_user_ids: { type: 'string', description: 'Comma-separated user IDs of budget owners' },
            member_user_ids: { type: 'string', description: 'Comma-separated user IDs of budget members' },
            limit_amount: { type: 'number', description: 'Spend limit amount in smallest currency unit (e.g. cents for USD)' },
            limit_currency: { type: 'string', description: 'Currency code (e.g. USD)' },
            limit_type: { type: 'string', description: 'Limit type: HARD (blocks spend) or SOFT (alerts only)' },
            period_type: { type: 'string', description: 'Budget period: MONTHLY, QUARTERLY, YEARLY, or ONE_TIME' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_budget',
        description: 'Update a budget name, description, spend limit, or member assignments',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The budget ID to update' },
            name: { type: 'string', description: 'Updated budget name' },
            description: { type: 'string', description: 'Updated description' },
            owner_user_ids: { type: 'string', description: 'Comma-separated user IDs of budget owners' },
            member_user_ids: { type: 'string', description: 'Comma-separated user IDs of budget members' },
            limit_amount: { type: 'number', description: 'Updated spend limit in smallest currency unit' },
            limit_currency: { type: 'string', description: 'Currency code (e.g. USD)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'archive_budget',
        description: 'Archive a budget to prevent further spending without deleting it',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The budget ID to archive' },
          },
          required: ['id'],
        },
      },
      // Cards
      {
        name: 'list_cards',
        description: 'List all cards in the organization with optional user filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of cards to return (default: 100)' },
            user_id: { type: 'string', description: 'Filter cards by the owning user ID' },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get a single card by its ID including spend controls and current balance',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The card ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_card',
        description: 'Create a new virtual or physical card for a user with optional spend controls',
        inputSchema: {
          type: 'object',
          properties: {
            owner_user_id: { type: 'string', description: 'User ID who will own the card' },
            card_name: { type: 'string', description: 'Name for the card (shown on statements)' },
            card_type: { type: 'string', description: 'Card type: VIRTUAL or PHYSICAL (default: VIRTUAL)' },
            limit_amount: { type: 'number', description: 'Spend limit amount in smallest currency unit (e.g. cents)' },
            limit_currency: { type: 'string', description: 'Currency code for the spend limit (e.g. USD)' },
            limit_type: { type: 'string', description: 'Limit type: HARD or SOFT' },
            limit_duration: { type: 'string', description: 'Limit duration: MONTHLY, QUARTERLY, YEARLY, ONE_TIME, or TRANSACTION' },
          },
          required: ['owner_user_id', 'card_name'],
        },
      },
      {
        name: 'update_card',
        description: 'Update a card spend limit, card name, or status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The card ID to update' },
            card_name: { type: 'string', description: 'Updated card name' },
            limit_amount: { type: 'number', description: 'Updated spend limit in smallest currency unit' },
            limit_currency: { type: 'string', description: 'Currency code (e.g. USD)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'lock_card',
        description: 'Lock a card to temporarily prevent all transactions',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The card ID to lock' },
            reason: { type: 'string', description: 'Reason for locking (e.g. LOST, STOLEN, FRAUD)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'unlock_card',
        description: 'Unlock a previously locked card to resume transactions',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The card ID to unlock' },
          },
          required: ['id'],
        },
      },
      {
        name: 'terminate_card',
        description: 'Permanently terminate a card — this action cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The card ID to terminate' },
            reason: { type: 'string', description: 'Termination reason (e.g. LOST, STOLEN, DAMAGED)' },
          },
          required: ['id'],
        },
      },
      // Team
      {
        name: 'list_users',
        description: 'List all users in the Brex organization with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of users to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a single user by their ID including department, location, and card assignments',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'The Brex user ID' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'invite_user',
        description: 'Invite a new employee to join the Brex organization',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Employee first name' },
            last_name: { type: 'string', description: 'Employee last name' },
            email: { type: 'string', description: 'Employee work email address' },
            manager_id: { type: 'string', description: 'User ID of the employee manager' },
            department_id: { type: 'string', description: 'Department ID to assign the employee to' },
            location_id: { type: 'string', description: 'Location ID to assign the employee to' },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing user department, location, manager, or status',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'The user ID to update' },
            department_id: { type: 'string', description: 'Updated department ID' },
            location_id: { type: 'string', description: 'Updated location ID' },
            manager_id: { type: 'string', description: 'Updated manager user ID' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_me',
        description: 'Get the current authenticated user profile and organization details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the Brex organization',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of departments to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get details of a specific department by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: { type: 'string', description: 'The department ID' },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'create_department',
        description: 'Create a new department in the Brex organization',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Department name' },
            description: { type: 'string', description: 'Department description' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_locations',
        description: 'List all locations in the Brex organization',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of locations to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get details of a specific location by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: { type: 'string', description: 'The location ID' },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'create_location',
        description: 'Create a new office location in the Brex organization',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Location name (e.g. "NYC HQ")' },
            description: { type: 'string', description: 'Location description' },
          },
          required: ['name'],
        },
      },
      // Payments / Vendors
      {
        name: 'list_vendors',
        description: 'List all payment vendors configured for ACH, wire, or check payments',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
            limit: { type: 'number', description: 'Maximum number of vendors to return (default: 100)' },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get details of a specific payment vendor including bank account info',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: { type: 'string', description: 'The vendor ID' },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'create_vendor',
        description: 'Create a new payment vendor for ACH or wire transfers',
        inputSchema: {
          type: 'object',
          properties: {
            company_name: { type: 'string', description: 'Vendor company name' },
            email: { type: 'string', description: 'Vendor contact email' },
            phone: { type: 'string', description: 'Vendor contact phone' },
            payment_type: { type: 'string', description: 'Payment type: ACH or WIRE' },
            account_number: { type: 'string', description: 'Bank account number' },
            routing_number: { type: 'string', description: 'Bank routing number (ABA)' },
          },
          required: ['company_name'],
        },
      },
      {
        name: 'update_vendor',
        description: 'Update an existing payment vendor name, email, phone, or bank account details by vendor ID',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: { type: 'string', description: 'The vendor ID to update' },
            company_name: { type: 'string', description: 'Updated vendor company name' },
            email: { type: 'string', description: 'Updated vendor contact email' },
            phone: { type: 'string', description: 'Updated vendor contact phone' },
            payment_type: { type: 'string', description: 'Updated payment type: ACH or WIRE' },
            account_number: { type: 'string', description: 'Updated bank account number' },
            routing_number: { type: 'string', description: 'Updated bank routing number (ABA)' },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'delete_vendor',
        description: 'Permanently delete a payment vendor by vendor ID — this action cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: { type: 'string', description: 'The vendor ID to delete' },
          },
          required: ['vendor_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_card_transactions': return this.listCardTransactions(args);
        case 'list_cash_transactions': return this.listCashTransactions(args);
        case 'list_cash_accounts': return this.listCashAccounts();
        case 'get_primary_card_account': return this.getPrimaryCardAccount();
        case 'list_expenses': return this.listExpenses(args);
        case 'get_expense': return this.getExpense(args);
        case 'update_expense': return this.updateExpense(args);
        case 'list_budgets': return this.listBudgets(args);
        case 'get_budget': return this.getBudget(args);
        case 'create_budget': return this.createBudget(args);
        case 'update_budget': return this.updateBudget(args);
        case 'archive_budget': return this.archiveBudget(args);
        case 'list_cards': return this.listCards(args);
        case 'get_card': return this.getCard(args);
        case 'create_card': return this.createCard(args);
        case 'update_card': return this.updateCard(args);
        case 'lock_card': return this.lockCard(args);
        case 'unlock_card': return this.unlockCard(args);
        case 'terminate_card': return this.terminateCard(args);
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'invite_user': return this.inviteUser(args);
        case 'update_user': return this.updateUser(args);
        case 'get_me': return this.getMe();
        case 'list_departments': return this.listDepartments(args);
        case 'get_department': return this.getDepartment(args);
        case 'create_department': return this.createDepartment(args);
        case 'list_locations': return this.listLocations(args);
        case 'get_location': return this.getLocation(args);
        case 'create_location': return this.createLocation(args);
        case 'list_vendors': return this.listVendors(args);
        case 'get_vendor': return this.getVendor(args);
        case 'create_vendor': return this.createVendor(args);
        case 'update_vendor': return this.updateVendor(args);
        case 'delete_vendor': return this.deleteVendor(args);
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

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' };
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params?.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCardTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.user_ids) params.set('user_ids', args.user_ids as string);
    if (args.posted_at_start) params.set('posted_at_start', args.posted_at_start as string);
    return this.get('/v2/transactions/card/primary', params);
  }

  private async listCashTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.posted_at_start) params.set('posted_at_start', args.posted_at_start as string);
    return this.get(`/v2/transactions/cash/${encodeURIComponent(args.account_id as string)}`, params);
  }

  private async listCashAccounts(): Promise<ToolResult> {
    return this.get('/v2/accounts/cash');
  }

  private async getPrimaryCardAccount(): Promise<ToolResult> {
    return this.get('/v2/accounts/card/primary');
  }

  private async listExpenses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.user_id) params.set('user_id', args.user_id as string);
    if (args.parent_expense_id) params.set('parent_expense_id', args.parent_expense_id as string);
    if (args.expand) params.set('expand[]', args.expand as string);
    return this.get('/v1/expenses', params);
  }

  private async getExpense(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.expand) params.set('expand[]', args.expand as string);
    return this.get(`/v1/expenses/${encodeURIComponent(args.expense_id as string)}`, params);
  }

  private async updateExpense(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.memo !== undefined) body.memo = args.memo;
    if (args.category !== undefined) body.category = args.category;
    return this.put(`/v1/expenses/card/${encodeURIComponent(args.expense_id as string)}`, body);
  }

  private async listBudgets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.get('/v2/budgets', params);
  }

  private async getBudget(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/v2/budgets/${encodeURIComponent(args.id as string)}`);
  }

  private async createBudget(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.parent_budget_id) body.parent_budget_id = args.parent_budget_id;
    if (args.owner_user_ids) body.owner_user_ids = (args.owner_user_ids as string).split(',').map(s => s.trim());
    if (args.member_user_ids) body.member_user_ids = (args.member_user_ids as string).split(',').map(s => s.trim());
    if (args.limit_amount !== undefined) {
      body.budget_programs = undefined;
      body.spend_type = 'BUDGET';
      body.limit = { amount: { amount: args.limit_amount, currency: (args.limit_currency as string) ?? 'USD' }, budget_limit_type: args.limit_type ?? 'HARD' };
    }
    if (args.period_type) body.period_type = args.period_type;
    return this.post('/v2/budgets', body);
  }

  private async updateBudget(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.owner_user_ids) body.owner_user_ids = (args.owner_user_ids as string).split(',').map(s => s.trim());
    if (args.member_user_ids) body.member_user_ids = (args.member_user_ids as string).split(',').map(s => s.trim());
    if (args.limit_amount !== undefined) {
      body.limit = { amount: { amount: args.limit_amount, currency: (args.limit_currency as string) ?? 'USD' } };
    }
    return this.put(`/v2/budgets/${encodeURIComponent(args.id as string)}`, body);
  }

  private async archiveBudget(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post(`/v2/budgets/${encodeURIComponent(args.id as string)}/archive`, {});
  }

  private async listCards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.user_id) params.set('user_id', args.user_id as string);
    return this.get('/v2/cards', params);
  }

  private async getCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/v2/cards/${encodeURIComponent(args.id as string)}`);
  }

  private async createCard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      owner: { type: 'USER', user_id: args.owner_user_id },
      card_name: args.card_name,
      card_type: (args.card_type as string) ?? 'VIRTUAL',
    };
    if (args.limit_amount !== undefined) {
      body.limit = {
        amount: { amount: args.limit_amount, currency: (args.limit_currency as string) ?? 'USD' },
        budget_limit_type: (args.limit_type as string) ?? 'HARD',
        limit_type: (args.limit_duration as string) ?? 'MONTHLY',
      };
    }
    return this.post('/v2/cards', body);
  }

  private async updateCard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.card_name) body.card_name = args.card_name;
    if (args.limit_amount !== undefined) {
      body.limit = { amount: { amount: args.limit_amount, currency: (args.limit_currency as string) ?? 'USD' } };
    }
    return this.put(`/v2/cards/${encodeURIComponent(args.id as string)}`, body);
  }

  private async lockCard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    return this.post(`/v2/cards/${encodeURIComponent(args.id as string)}/lock`, body);
  }

  private async unlockCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post(`/v2/cards/${encodeURIComponent(args.id as string)}/unlock`, {});
  }

  private async terminateCard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    return this.post(`/v2/cards/${encodeURIComponent(args.id as string)}/terminate`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.get('/v2/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/v2/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async inviteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
    };
    if (args.manager_id) body.manager_id = args.manager_id;
    if (args.department_id) body.department_id = args.department_id;
    if (args.location_id) body.location_id = args.location_id;
    return this.post('/v2/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.department_id) body.department_id = args.department_id;
    if (args.location_id) body.location_id = args.location_id;
    if (args.manager_id) body.manager_id = args.manager_id;
    return this.put(`/v2/users/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async getMe(): Promise<ToolResult> {
    return this.get('/v2/users/me');
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.get('/v2/departments', params);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/v2/departments/${encodeURIComponent(args.department_id as string)}`);
  }

  private async createDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.post('/v2/departments', body);
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.get('/v2/locations', params);
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/v2/locations/${encodeURIComponent(args.location_id as string)}`);
  }

  private async createLocation(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.post('/v2/locations', body);
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.get('/v1/vendors', params);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`/v1/vendors/${encodeURIComponent(args.vendor_id as string)}`);
  }

  private async createVendor(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { company_name: args.company_name };
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.payment_type && args.account_number && args.routing_number) {
      body.payment_accounts = [{ payment_type: args.payment_type, account_number: args.account_number, routing_number: args.routing_number }];
    }
    return this.post('/v1/vendors', body);
  }

  private async updateVendor(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.company_name) body.company_name = args.company_name;
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.payment_type && args.account_number && args.routing_number) {
      body.payment_accounts = [{ payment_type: args.payment_type, account_number: args.account_number, routing_number: args.routing_number }];
    }
    return this.put(`/v1/vendors/${encodeURIComponent(args.vendor_id as string)}`, body);
  }

  private async deleteVendor(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/vendors/${encodeURIComponent(args.vendor_id as string)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  static catalog() {
    return {
      name: 'brex',
      displayName: 'Brex',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['brex', 'corporate card', 'expense', 'transaction', 'budget', 'spend limit', 'finance', 'payment', 'vendor', 'ach', 'wire', 'user', 'department', 'fintech'],
      toolNames: ['list_card_transactions', 'list_cash_transactions', 'list_cash_accounts', 'get_primary_card_account', 'list_expenses', 'get_expense', 'update_expense', 'list_budgets', 'get_budget', 'create_budget', 'update_budget', 'archive_budget', 'list_cards', 'get_card', 'create_card', 'update_card', 'lock_card', 'unlock_card', 'terminate_card', 'list_users', 'get_user', 'invite_user', 'update_user', 'get_me', 'list_departments', 'get_department', 'create_department', 'list_locations', 'get_location', 'create_location', 'list_vendors', 'get_vendor', 'create_vendor', 'update_vendor', 'delete_vendor'],
      description: 'Brex corporate cards and spend management: transactions, expenses, budgets, cards, users, departments, locations, and payment vendors.',
      author: 'protectnil' as const,
    };
  }
}
