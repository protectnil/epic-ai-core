/**
 * Recurly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Recurly MCP server exists on GitHub or npm.
// Our adapter covers: 22 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP server found.
//
// Base URL: https://v3.recurly.com
// Auth: HTTP Basic — API key as username, empty password: Basic base64({apiKey}:)
// Docs: https://recurly.com/developers/api/v2021-02-25/
// Rate limits: Sandbox 400 req/min (all methods); Production 1,000 req/min (GET only).
//   Rate-limit window is sliding 5 minutes. Exceeding returns HTTP 429.
//   Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RecurlyConfig {
  apiKey: string;
  baseUrl?: string;
  apiVersion?: string;
}

export class RecurlyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: RecurlyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://v3.recurly.com';
    this.apiVersion = config.apiVersion || '2021-02-25';
  }

  static catalog() {
    return {
      name: 'recurly',
      displayName: 'Recurly',
      version: '1.0.0',
      category: 'finance',
      keywords: ['recurly', 'subscription billing', 'recurring billing', 'subscription', 'invoice', 'plan', 'coupon', 'account', 'billing', 'payment', 'dunning', 'add-on', 'usage'],
      toolNames: [
        'list_accounts', 'get_account', 'create_account', 'update_account', 'close_account',
        'list_subscriptions', 'get_subscription', 'list_account_subscriptions',
        'cancel_subscription', 'pause_subscription', 'resume_subscription',
        'list_invoices', 'get_invoice', 'list_account_invoices',
        'list_plans', 'get_plan',
        'list_coupons', 'get_coupon',
        'list_transactions', 'get_transaction',
        'list_account_billing_infos', 'get_billing_info',
      ],
      description: 'Manage Recurly subscription billing: accounts, subscriptions, invoices, plans, coupons, transactions, and billing info.',
      author: 'protectnil',
    };
  }

  private get authHeader(): string {
    return `Basic ${btoa(`${this.apiKey}:`)}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      Accept: `application/vnd.recurly.${this.apiVersion}+json`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List all accounts in the Recurly site with optional state filter and cursor pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of accounts to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by account state: "active", "closed", "subscriber", "non_subscriber", "past_due"',
            },
            subscriber: {
              type: 'boolean',
              description: 'Filter to accounts with active subscriptions only',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a specific Recurly account by account code, including balance and subscription status',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code (unique identifier for the account in your system)',
            },
          },
          required: ['account_code'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new Recurly account with optional billing info, address, and custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Unique account code (your system identifier)',
            },
            email: {
              type: 'string',
              description: 'Account email address',
            },
            first_name: {
              type: 'string',
              description: 'Account holder first name',
            },
            last_name: {
              type: 'string',
              description: 'Account holder last name',
            },
            company: {
              type: 'string',
              description: 'Company name (optional)',
            },
            username: {
              type: 'string',
              description: 'Username for the account (optional)',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'update_account',
        description: 'Update an existing Recurly account email, name, company, or custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code to update',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            company: {
              type: 'string',
              description: 'Updated company name',
            },
          },
          required: ['account_code'],
        },
      },
      {
        name: 'close_account',
        description: 'Close a Recurly account, canceling all active subscriptions at period end',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code to close',
            },
          },
          required: ['account_code'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List all subscriptions across the Recurly site with optional state filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of subscriptions to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by state: "active", "canceled", "expired", "future", "in_trial", "live", "paused"',
            },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve a specific subscription by UUID, including plan, billing period, and next renewal date',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'The subscription UUID',
            },
          },
          required: ['subscription_id'],
        },
      },
      {
        name: 'list_account_subscriptions',
        description: 'List all subscriptions for a specific account with optional state filter',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code to list subscriptions for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of subscriptions to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by state: "active", "canceled", "expired", "future", "in_trial", "live", "paused"',
            },
          },
          required: ['account_code'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel a subscription — remains active until the end of the current billing period',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'The subscription UUID to cancel',
            },
            refund: {
              type: 'string',
              description: 'Refund type on cancellation: "full", "partial", "none" (default: none)',
            },
          },
          required: ['subscription_id'],
        },
      },
      {
        name: 'pause_subscription',
        description: 'Pause an active subscription for a specified number of billing cycles',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'The subscription UUID to pause',
            },
            remaining_pause_cycles: {
              type: 'number',
              description: 'Number of billing cycles to pause the subscription for (minimum: 1)',
            },
          },
          required: ['subscription_id', 'remaining_pause_cycles'],
        },
      },
      {
        name: 'resume_subscription',
        description: 'Resume a paused subscription immediately',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'The subscription UUID to resume',
            },
          },
          required: ['subscription_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List all invoices across the Recurly site with optional state and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by invoice state: "open", "collecting", "pending", "processed", "past_due", "failed", "recovered", "closed"',
            },
            type: {
              type: 'string',
              description: 'Filter by invoice type: "charge", "credit", "legacy"',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a specific invoice by invoice number, including line items and payment status',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_number: {
              type: 'string',
              description: 'The invoice number (numeric string, e.g. "1001")',
            },
          },
          required: ['invoice_number'],
        },
      },
      {
        name: 'list_account_invoices',
        description: 'List all invoices for a specific account with optional state and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code to list invoices for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by invoice state: "open", "collecting", "pending", "processed", "past_due", "failed", "closed"',
            },
          },
          required: ['account_code'],
        },
      },
      {
        name: 'list_plans',
        description: 'List all subscription plans in the Recurly site with pricing and billing interval details',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of plans to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by plan state: "active", "inactive"',
            },
          },
        },
      },
      {
        name: 'get_plan',
        description: 'Retrieve a specific subscription plan by plan code, including pricing, trial settings, and add-ons',
        inputSchema: {
          type: 'object',
          properties: {
            plan_code: {
              type: 'string',
              description: 'The plan code (unique identifier)',
            },
          },
          required: ['plan_code'],
        },
      },
      {
        name: 'list_coupons',
        description: 'List all discount coupons in the Recurly site with redemption counts and expiry dates',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of coupons to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by coupon state: "redeemable", "expired", "maxed_out", "inactive"',
            },
          },
        },
      },
      {
        name: 'get_coupon',
        description: 'Retrieve a specific coupon by coupon code, including discount type, restrictions, and redemption count',
        inputSchema: {
          type: 'object',
          properties: {
            coupon_code: {
              type: 'string',
              description: 'The coupon code',
            },
          },
          required: ['coupon_code'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List all payment transactions across the Recurly site with optional status and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of transactions to return (1–200, default: 20)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by transaction status: "success", "failed", "void", "declined", "error", "chargeback"',
            },
            type: {
              type: 'string',
              description: 'Filter by transaction type: "authorization", "capture", "purchase", "refund", "verify"',
            },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Retrieve a specific payment transaction by UUID, including gateway response and billing details',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: {
              type: 'string',
              description: 'The transaction UUID',
            },
          },
          required: ['transaction_id'],
        },
      },
      {
        name: 'list_account_billing_infos',
        description: 'List all billing info records (payment methods) on file for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code to list billing info for',
            },
          },
          required: ['account_code'],
        },
      },
      {
        name: 'get_billing_info',
        description: 'Get the primary billing info (payment method) for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_code: {
              type: 'string',
              description: 'The account code to retrieve billing info for',
            },
          },
          required: ['account_code'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return await this.listAccounts(args);
        case 'get_account':
          return await this.getAccount(args);
        case 'create_account':
          return await this.createAccount(args);
        case 'update_account':
          return await this.updateAccount(args);
        case 'close_account':
          return await this.closeAccount(args);
        case 'list_subscriptions':
          return await this.listSubscriptions(args);
        case 'get_subscription':
          return await this.getSubscription(args);
        case 'list_account_subscriptions':
          return await this.listAccountSubscriptions(args);
        case 'cancel_subscription':
          return await this.cancelSubscription(args);
        case 'pause_subscription':
          return await this.pauseSubscription(args);
        case 'resume_subscription':
          return await this.resumeSubscription(args);
        case 'list_invoices':
          return await this.listInvoices(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'list_account_invoices':
          return await this.listAccountInvoices(args);
        case 'list_plans':
          return await this.listPlans(args);
        case 'get_plan':
          return await this.getPlan(args);
        case 'list_coupons':
          return await this.listCoupons(args);
        case 'get_coupon':
          return await this.getCoupon(args);
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'get_transaction':
          return await this.getTransaction(args);
        case 'list_account_billing_infos':
          return await this.listAccountBillingInfos(args);
        case 'get_billing_info':
          return await this.getBillingInfo(args);
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

  private buildQuery(args: Record<string, unknown>, keys: string[]): string {
    const params = new URLSearchParams();
    for (const key of keys) {
      if (args[key] !== undefined && args[key] !== null) {
        params.set(key, String(args[key]));
      }
    }
    return params.toString();
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state', 'subscriber']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list accounts (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get account (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.code as string;
    if (!code) return { content: [{ type: 'text', text: 'code is required' }], isError: true };
    const body: Record<string, unknown> = { code };
    if (args.email) body.email = args.email;
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.company) body.company = args.company;
    if (args.username) body.username = args.username;
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to create account (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.email !== undefined) body.email = args.email;
    if (args.first_name !== undefined) body.first_name = args.first_name;
    if (args.last_name !== undefined) body.last_name = args.last_name;
    if (args.company !== undefined) body.company = args.company;
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to update account (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async closeAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to close account (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Account closed (HTTP ${response.status})` }], isError: false }; }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/subscriptions${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list subscriptions (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscription_id as string;
    if (!id) return { content: [{ type: 'text', text: 'subscription_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/subscriptions/${encodeURIComponent(id)}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get subscription (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listAccountSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}/subscriptions${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list account subscriptions (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async cancelSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscription_id as string;
    if (!id) return { content: [{ type: 'text', text: 'subscription_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.refund) body.refund = args.refund;
    const response = await this.fetchWithRetry(`${this.baseUrl}/subscriptions/${encodeURIComponent(id)}/cancel`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to cancel subscription (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async pauseSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscription_id as string;
    const cycles = args.remaining_pause_cycles as number;
    if (!id) return { content: [{ type: 'text', text: 'subscription_id is required' }], isError: true };
    if (!cycles) return { content: [{ type: 'text', text: 'remaining_pause_cycles is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/subscriptions/${encodeURIComponent(id)}/pause`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ remaining_pause_cycles: cycles }),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to pause subscription (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async resumeSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscription_id as string;
    if (!id) return { content: [{ type: 'text', text: 'subscription_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/subscriptions/${encodeURIComponent(id)}/resume`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to resume subscription (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state', 'type']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/invoices${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list invoices (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const num = args.invoice_number as string;
    if (!num) return { content: [{ type: 'text', text: 'invoice_number is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/invoices/${encodeURIComponent(num)}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get invoice (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listAccountInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}/invoices${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list account invoices (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/plans${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list plans (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.plan_code as string;
    if (!code) return { content: [{ type: 'text', text: 'plan_code is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/plans/${encodeURIComponent(code)}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get plan (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listCoupons(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args, ['limit', 'cursor', 'state']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/coupons${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list coupons (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.coupon_code as string;
    if (!code) return { content: [{ type: 'text', text: 'coupon_code is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/coupons/${encodeURIComponent(code)}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get coupon (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args, ['limit', 'cursor', 'status', 'type']);
    const response = await this.fetchWithRetry(`${this.baseUrl}/transactions${qs ? `?${qs}` : ''}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list transactions (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.transaction_id as string;
    if (!id) return { content: [{ type: 'text', text: 'transaction_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/transactions/${encodeURIComponent(id)}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get transaction (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listAccountBillingInfos(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}/billing_infos`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to list billing infos (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getBillingInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.account_code as string;
    if (!code) return { content: [{ type: 'text', text: 'account_code is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/accounts/${encodeURIComponent(code)}/billing_info`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: 'text', text: `Failed to get billing info (HTTP ${response.status}): ${err}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Recurly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}
