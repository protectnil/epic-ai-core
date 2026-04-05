/**
 * Zuora MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/zuora-mcp-server-by-cdata — read-only JDBC
//   wrapper by CData (not an official Zuora MCP server). No official Zuora MCP server found
//   as of 2026-03.
// Our adapter covers: 19 tools (accounts, subscriptions, orders, invoices, credit memos,
//   payments, refunds, products, ZOQL query).
// Recommendation: Use this adapter for full REST CRUD. The CData MCP server is read-only.
//
// Base URL: https://rest.zuora.com (US Production)
//   Regional alternatives (pass via config.baseUrl):
//     US Sandbox:    https://rest.apisandbox.zuora.com
//     EU Production: https://rest.eu.zuora.com
//     EU Sandbox:    https://rest.sandbox.eu.zuora.com
// Auth: OAuth2 client_credentials — POST {baseUrl}/oauth/token
//   Body (x-www-form-urlencoded): grant_type=client_credentials, client_id, client_secret
//   Token TTL: typically 3600s; adapter refreshes 60s early.
// Docs: https://developer.zuora.com/v1-api-reference/introduction
//       https://developer.zuora.com/docs/get-started/introduction
// Rate limits: Tenant-level limits; response headers Concurrency-Limit-Limit /
//   Concurrency-Limit-Remaining. Exceeding limits returns 429.

import { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZuoraConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Base URL override. Defaults to https://rest.zuora.com (US Production).
   * Use https://rest.apisandbox.zuora.com for sandbox.
   */
  baseUrl?: string;
}

export class ZuoraMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: ZuoraConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://rest.zuora.com';
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'zuora',
      displayName: 'Zuora',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'zuora', 'subscription billing', 'recurring revenue', 'invoice', 'payment',
        'subscription', 'account', 'order', 'credit memo', 'refund', 'product catalog',
        'revenue recognition', 'billing', 'saas billing', 'mrr', 'arr', 'zoql',
      ],
      toolNames: [
        'query_zoql', 'get_account', 'create_account', 'get_account_summary',
        'list_subscriptions', 'get_subscription', 'create_subscription', 'cancel_subscription',
        'list_orders', 'create_order',
        'list_invoices', 'get_invoice',
        'list_credit_memos', 'get_credit_memo',
        'list_payments', 'create_payment', 'get_payment',
        'list_refunds',
        'list_products',
      ],
      description: 'Zuora subscription billing: manage accounts, subscriptions, orders, invoices, credit memos, payments, and refunds via the Zuora v1 REST API.',
      author: 'protectnil',
    };
  }

  /**
   * Obtains or refreshes the OAuth2 access token via client_credentials flow.
   * Caches the token and renews 60 seconds before expiry to avoid races.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Zuora OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  /** Build authorized headers for Zuora API calls. */
  private authHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_zoql',
        description: 'Execute a ZOQL (Zuora Object Query Language) query against any Zuora object. Use for flexible ad-hoc reporting across accounts, subscriptions, invoices, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            queryString: {
              type: 'string',
              description: 'ZOQL query string, e.g. "select Id, Name, Status from Account where Status = \'Active\'".',
            },
          },
          required: ['queryString'],
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve a Zuora customer account by account key (ID or account number), returning billing details, contacts, and payment methods.',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID (e.g. 2c92c0f96d6f2bbd016d...) or account number (e.g. A00001234).',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new Zuora customer account with billing contact and optional payment method.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Account name (required).',
            },
            currency: {
              type: 'string',
              description: 'Billing currency code, e.g. USD, EUR (required).',
            },
            billToContact: {
              type: 'object',
              description: 'Billing contact object with firstName, lastName, address1, city, state, postalCode, country fields.',
            },
            paymentTerm: {
              type: 'string',
              description: 'Payment terms, e.g. Net 30, Due Upon Receipt.',
            },
            notes: {
              type: 'string',
              description: 'Optional notes about the account.',
            },
          },
          required: ['name', 'currency', 'billToContact'],
        },
      },
      {
        name: 'get_account_summary',
        description: 'Retrieve a full account summary including active subscriptions, recent invoices, last payment, and account metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number.',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List all subscriptions for a customer account, including their status, rate plans, and term dates.',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number.',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve a subscription by subscription number or ID, including rate plans, charges, and term details.',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_key: {
              type: 'string',
              description: 'Zuora subscription number (e.g. A-S00001234) or subscription ID.',
            },
          },
          required: ['subscription_key'],
        },
      },
      {
        name: 'create_subscription',
        description: 'Create a new subscription for a customer account on specified rate plans with contract dates.',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number.',
            },
            contract_effective_date: {
              type: 'string',
              description: 'Subscription contract effective date in YYYY-MM-DD format.',
            },
            subscribe_to_rate_plans: {
              type: 'array',
              description: 'Array of rate plan objects, each with productRatePlanId.',
            },
            term_type: {
              type: 'string',
              description: 'Subscription term type: TERMED or EVERGREEN.',
            },
            initial_term: {
              type: 'number',
              description: 'Initial term length in months (required for TERMED subscriptions).',
            },
          },
          required: ['account_key', 'contract_effective_date', 'subscribe_to_rate_plans'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel an active subscription. Specify cancellation policy and effective date.',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_key: {
              type: 'string',
              description: 'Zuora subscription number or ID to cancel.',
            },
            cancellation_policy: {
              type: 'string',
              description: 'When to cancel: EndOfCurrentTerm, EndOfLastInvoicePeriod, SpecificDate.',
            },
            cancellation_effective_date: {
              type: 'string',
              description: 'Effective date of cancellation in YYYY-MM-DD format (required for SpecificDate policy).',
            },
          },
          required: ['subscription_key', 'cancellation_policy'],
        },
      },
      {
        name: 'list_orders',
        description: 'List Zuora orders (the order-based billing actions) with optional filters for account or subscription.',
        inputSchema: {
          type: 'object',
          properties: {
            account_number: {
              type: 'string',
              description: 'Filter by account number.',
            },
            subscription_key: {
              type: 'string',
              description: 'Filter orders by subscription number or ID.',
            },
            date_filter_option: {
              type: 'string',
              description: 'Date field to filter on: createdDate or updatedDate.',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format.',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 20, max: 40).',
            },
          },
        },
      },
      {
        name: 'create_order',
        description: 'Create a Zuora order to perform subscription lifecycle actions such as new subscriptions, upgrades, downgrades, renewals, or cancellations with optional auto-billing and auto-payment.',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Order description.',
            },
            order_date: {
              type: 'string',
              description: 'Order date in YYYY-MM-DD format.',
            },
            subscriptions: {
              type: 'array',
              description: 'Array of subscription objects with order actions (e.g. CreateSubscription, CancelSubscription, AddProduct).',
            },
            processing_options: {
              type: 'object',
              description: 'Processing options including runBilling and collectPayment flags.',
            },
          },
          required: ['order_date', 'subscriptions'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices for a customer account with optional status and date filters.',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number.',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a specific invoice by Zuora invoice ID, including line items and payment status.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'Zuora invoice ID.',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'list_credit_memos',
        description: 'List credit memos for a customer account. Credit memos represent credits issued against invoices.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Zuora account ID to list credit memos for.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_credit_memo',
        description: 'Retrieve a specific credit memo by ID, including credit memo items and status.',
        inputSchema: {
          type: 'object',
          properties: {
            credit_memo_id: {
              type: 'string',
              description: 'Zuora credit memo ID.',
            },
          },
          required: ['credit_memo_id'],
        },
      },
      {
        name: 'list_payments',
        description: 'List payments for a customer account, showing payment amounts, dates, and applied invoice status.',
        inputSchema: {
          type: 'object',
          properties: {
            account_key: {
              type: 'string',
              description: 'Zuora account ID or account number.',
            },
          },
          required: ['account_key'],
        },
      },
      {
        name: 'create_payment',
        description: 'Create and apply an external or electronic payment to a customer account, with optional invoice application.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Zuora account ID.',
            },
            amount: {
              type: 'number',
              description: 'Payment amount.',
            },
            currency: {
              type: 'string',
              description: 'Currency code, e.g. USD.',
            },
            effective_date: {
              type: 'string',
              description: 'Payment effective date in YYYY-MM-DD format.',
            },
            type: {
              type: 'string',
              description: 'Payment type: External or Electronic.',
            },
          },
          required: ['account_id', 'amount', 'currency', 'effective_date', 'type'],
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve a specific payment by Zuora payment ID, including applied invoice details.',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              description: 'Zuora payment ID.',
            },
          },
          required: ['payment_id'],
        },
      },
      {
        name: 'list_refunds',
        description: 'List refunds for a customer account or retrieve all refunds with optional status filter.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Zuora account ID to filter refunds by (optional).',
            },
            status: {
              type: 'string',
              description: 'Filter by refund status: Processed, Canceled (default: all).',
            },
          },
        },
      },
      {
        name: 'list_products',
        description: 'List products in the Zuora product catalog, including rate plans and rate plan charges.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10, max: 40).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getAccessToken();
      const headers = this.authHeaders(token);

      switch (name) {
        case 'query_zoql':
          return await this.queryZoql(args, headers);
        case 'get_account':
          return await this.getAccount(args, headers);
        case 'create_account':
          return await this.createAccount(args, headers);
        case 'get_account_summary':
          return await this.getAccountSummary(args, headers);
        case 'list_subscriptions':
          return await this.listSubscriptions(args, headers);
        case 'get_subscription':
          return await this.getSubscription(args, headers);
        case 'create_subscription':
          return await this.createSubscription(args, headers);
        case 'cancel_subscription':
          return await this.cancelSubscription(args, headers);
        case 'list_orders':
          return await this.listOrders(args, headers);
        case 'create_order':
          return await this.createOrder(args, headers);
        case 'list_invoices':
          return await this.listInvoices(args, headers);
        case 'get_invoice':
          return await this.getInvoice(args, headers);
        case 'list_credit_memos':
          return await this.listCreditMemos(args, headers);
        case 'get_credit_memo':
          return await this.getCreditMemo(args, headers);
        case 'list_payments':
          return await this.listPayments(args, headers);
        case 'create_payment':
          return await this.createPayment(args, headers);
        case 'get_payment':
          return await this.getPayment(args, headers);
        case 'list_refunds':
          return await this.listRefunds(args, headers);
        case 'list_products':
          return await this.listProducts(args, headers);
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

  private async queryZoql(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const queryString = args.queryString as string;
    if (!queryString) {
      return { content: [{ type: 'text', text: 'queryString is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/action/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ queryString }),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `ZOQL query failed: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAccount(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountKey = args.account_key as string;
    if (!accountKey) {
      return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get account: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createAccount(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const name = args.name as string;
    const currency = args.currency as string;
    const billToContact = args.billToContact;

    if (!name || !currency || !billToContact) {
      return { content: [{ type: 'text', text: 'name, currency, and billToContact are required' }], isError: true };
    }

    const body: Record<string, unknown> = { name, currency, billToContact };
    if (args.paymentTerm) body.paymentTerm = args.paymentTerm;
    if (args.notes) body.notes = args.notes;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create account: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAccountSummary(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountKey = args.account_key as string;
    if (!accountKey) {
      return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/accounts/${encodeURIComponent(accountKey)}/summary`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get account summary: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSubscriptions(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountKey = args.account_key as string;
    if (!accountKey) {
      return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/subscriptions/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list subscriptions: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSubscription(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const subscriptionKey = args.subscription_key as string;
    if (!subscriptionKey) {
      return { content: [{ type: 'text', text: 'subscription_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/subscriptions/${encodeURIComponent(subscriptionKey)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get subscription: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createSubscription(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountKey = args.account_key as string;
    const contractEffectiveDate = args.contract_effective_date as string;
    const subscribeToRatePlans = args.subscribe_to_rate_plans;

    if (!accountKey || !contractEffectiveDate || !subscribeToRatePlans) {
      return { content: [{ type: 'text', text: 'account_key, contract_effective_date, and subscribe_to_rate_plans are required' }], isError: true };
    }

    const body: Record<string, unknown> = { accountKey, contractEffectiveDate, subscribeToRatePlans };
    if (args.term_type) body.termType = args.term_type;
    if (args.initial_term !== undefined) body.initialTerm = args.initial_term;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create subscription: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cancelSubscription(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const subscriptionKey = args.subscription_key as string;
    const cancellationPolicy = args.cancellation_policy as string;

    if (!subscriptionKey || !cancellationPolicy) {
      return { content: [{ type: 'text', text: 'subscription_key and cancellation_policy are required' }], isError: true };
    }

    const body: Record<string, unknown> = { cancellationPolicy };
    if (args.cancellation_effective_date) body.cancellationEffectiveDate = args.cancellation_effective_date;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/subscriptions/${encodeURIComponent(subscriptionKey)}/cancel`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to cancel subscription: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrders(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.account_number) params.set('accountNumber', String(args.account_number));
    if (args.subscription_key) params.set('subscriptionKey', String(args.subscription_key));
    if (args.date_filter_option) params.set('dateFilterOption', String(args.date_filter_option));
    if (args.start_date) params.set('startDate', String(args.start_date));
    if (args.end_date) params.set('endDate', String(args.end_date));
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));

    const url = `${this.baseUrl}/v1/orders${params.toString() ? '?' + params.toString() : ''}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list orders: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createOrder(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const orderDate = args.order_date as string;
    const subscriptions = args.subscriptions;

    if (!orderDate || !subscriptions) {
      return { content: [{ type: 'text', text: 'order_date and subscriptions are required' }], isError: true };
    }

    const body: Record<string, unknown> = { orderDate, subscriptions };
    if (args.description) body.description = args.description;
    if (args.processing_options) body.processingOptions = args.processing_options;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create order: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInvoices(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountKey = args.account_key as string;
    if (!accountKey) {
      return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/transactions/invoices/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list invoices: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getInvoice(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const invoiceId = args.invoice_id as string;
    if (!invoiceId) {
      return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/invoices/${encodeURIComponent(invoiceId)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get invoice: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCreditMemos(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    if (!accountId) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/creditmemos?accountId=${encodeURIComponent(accountId)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list credit memos: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCreditMemo(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const creditMemoId = args.credit_memo_id as string;
    if (!creditMemoId) {
      return { content: [{ type: 'text', text: 'credit_memo_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/creditmemos/${encodeURIComponent(creditMemoId)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get credit memo: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPayments(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountKey = args.account_key as string;
    if (!accountKey) {
      return { content: [{ type: 'text', text: 'account_key is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/transactions/payments/accounts/${encodeURIComponent(accountKey)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list payments: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createPayment(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    const amount = args.amount as number;
    const currency = args.currency as string;
    const effectiveDate = args.effective_date as string;
    const type = args.type as string;

    if (!accountId || amount === undefined || !currency || !effectiveDate || !type) {
      return { content: [{ type: 'text', text: 'account_id, amount, currency, effective_date, and type are required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId, amount, currency, effectiveDate, type }),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create payment: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPayment(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const paymentId = args.payment_id as string;
    if (!paymentId) {
      return { content: [{ type: 'text', text: 'payment_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get payment: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRefunds(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.account_id) params.set('accountId', String(args.account_id));
    if (args.status) params.set('status', String(args.status));

    const url = `${this.baseUrl}/v1/refunds${params.toString() ? '?' + params.toString() : ''}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list refunds: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProducts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_size !== undefined) params.set('pageSize', String(args.page_size));
    if (args.page !== undefined) params.set('page', String(args.page));

    const url = `${this.baseUrl}/v1/catalog/products${params.toString() ? '?' + params.toString() : ''}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list products: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zuora returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
